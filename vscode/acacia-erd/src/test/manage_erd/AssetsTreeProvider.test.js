"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const sinon = __importStar(require("sinon"));
const path = __importStar(require("path"));
const proxyquire = require("proxyquire");
const sampleFolders = [
    { name: 'App Source', path: 'src/models' },
    { name: 'Migrations', path: '/absolute/migrations' },
];
const sampleConnections = [
    { name: 'Dev DB', connectionPath: 'localhost:5432/dev' },
    { name: 'Test DB', connectionPath: 'localhost:5432/test' },
];
const sampleEntitiesLists = [
    { name: 'Main Schema', jsonPath: 'resources/entities.json' },
    { name: 'Auth Module', jsonPath: '/absolute/auth-entities.json' },
];
function createMockSourceFolderManager(folders = sampleFolders) {
    const changeListeners = [];
    return {
        getFolders: sinon.stub().returns(folders),
        resolveAbsolutePath: sinon.stub().callsFake((f) => f.path.startsWith('/') ? f.path : `/mock/workspace/${f.path}`),
        onDidChange: (listener) => {
            changeListeners.push(listener);
            return { dispose: sinon.stub() };
        },
        _fireChange: (data) => changeListeners.forEach(l => l(data)),
    };
}
function createMockDbConnectionManager(connections = sampleConnections) {
    const changeListeners = [];
    return {
        getConnections: sinon.stub().returns(connections),
        onDidChange: (listener) => {
            changeListeners.push(listener);
            return { dispose: sinon.stub() };
        },
        _fireChange: (data) => changeListeners.forEach(l => l(data)),
    };
}
function createMockEntitiesListManager(lists = sampleEntitiesLists) {
    const changeListeners = [];
    return {
        getLists: sinon.stub().returns(lists),
        resolveAbsolutePath: sinon.stub().callsFake((l) => path.isAbsolute(l.jsonPath) ? l.jsonPath : path.resolve('/mock/workspace', l.jsonPath)),
        onDidChange: (listener) => {
            changeListeners.push(listener);
            return { dispose: sinon.stub() };
        },
        _fireChange: (data) => changeListeners.forEach(l => l(data)),
    };
}
function createVscodeMock() {
    return {
        TreeItem: class MockTreeItem {
            label;
            collapsibleState;
            description;
            tooltip;
            contextValue;
            iconPath;
            command;
            constructor(label, collapsibleState) {
                this.label = label;
                this.collapsibleState = collapsibleState || 0;
            }
        },
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        ThemeIcon: class MockThemeIcon {
            id;
            color;
            constructor(id, color) {
                this.id = id;
                this.color = color;
            }
        },
        ThemeColor: class MockThemeColor {
            id;
            constructor(id) {
                this.id = id;
            }
        },
        Uri: {
            file: (p) => ({
                scheme: 'file',
                fsPath: p,
                path: p.replace(/\\/g, '/'),
                toString: () => `file:///${p.replace(/\\/g, '/')}`,
            }),
        },
        EventEmitter: class MockEventEmitter {
            listeners = [];
            event = (listener) => {
                this.listeners.push(listener);
                return { dispose: () => {
                        const idx = this.listeners.indexOf(listener);
                        if (idx >= 0) {
                            this.listeners.splice(idx, 1);
                        }
                    } };
            };
            fire = (data) => { this.listeners.forEach(l => l(data)); };
            dispose = sinon.stub();
        },
        workspace: {
            workspaceFolders: undefined,
        },
        '@noCallThru': true,
    };
}
function loadAssetsTreeProvider(vscodeMock, fsMock, entityManagerMock) {
    const mod = proxyquire('../../manage_erd/AssetsTreeProvider', {
        'vscode': vscodeMock,
        'fs': fsMock || { existsSync: sinon.stub().returns(true), '@noCallThru': true },
        '../utils/SourceFolderManager': { '@noCallThru': true },
        '../utils/DbConnectionManager': { '@noCallThru': true },
        '../utils/EntitiesListManager': { '@noCallThru': true },
        '../utils/DimensionManager': { '@noCallThru': true },
        '../utils/EntityManager': {
            EntityManager: {
                getInstance: () => entityManagerMock || {
                    getEntitiesJsonPath: sinon.stub().returns('other/path.json'),
                    onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
                },
            },
            '@noCallThru': true,
        },
    });
    return {
        AssetsTreeProvider: mod.AssetsTreeProvider,
        AssetCategoryItem: mod.AssetCategoryItem,
        SourceFolderItem: mod.SourceFolderItem,
        DbConnectionItem: mod.DbConnectionItem,
        EntitiesListItem: mod.EntitiesListItem,
    };
}
suite('AssetsTreeProvider', () => {
    teardown(() => {
        sinon.restore();
    });
    suite('getChildren() — root level', () => {
        test('returns 3 category root nodes', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            assert.strictEqual(roots.length, 3);
        });
        test('first root node is "Entities Lists"', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            assert.strictEqual(roots[0].label, 'Entities Lists');
            assert.strictEqual(roots[0].collapsibleState, vscodeMock.TreeItemCollapsibleState.Expanded);
        });
        test('second root node is "Source Folders"', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            assert.strictEqual(roots[1].label, 'Source Folders');
            assert.strictEqual(roots[1].collapsibleState, vscodeMock.TreeItemCollapsibleState.Expanded);
        });
        test('third root node is "DB Connections"', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            assert.strictEqual(roots[2].label, 'DB Connections');
            assert.strictEqual(roots[2].collapsibleState, vscodeMock.TreeItemCollapsibleState.Expanded);
        });
        test('root nodes have correct contextValue', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            assert.strictEqual(roots[0].contextValue, 'assetCategory-entitiesLists');
            assert.strictEqual(roots[1].contextValue, 'assetCategory-sourceFolders');
            assert.strictEqual(roots[2].contextValue, 'assetCategory-dbConnections');
        });
        test('root nodes have correct icons', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            assert.strictEqual(roots[0].iconPath.id, 'list-tree');
            assert.strictEqual(roots[1].iconPath.id, 'folder-library');
            assert.strictEqual(roots[2].iconPath.id, 'database');
        });
    });
    suite('getChildren() — Entities Lists category', () => {
        test('returns EntitiesListItem[] with correct labels', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children.length, 2);
            assert.strictEqual(children[0].label, 'Main Schema');
            assert.strictEqual(children[1].label, 'Auth Module');
        });
        test('returns empty array when no lists', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager([]);
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children.length, 0);
        });
        test('items have correct contextValue "entitiesList"', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children[0].contextValue, 'entitiesList');
            assert.strictEqual(children[1].contextValue, 'entitiesList');
        });
        test('items have correct description (jsonPath)', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children[0].description, 'resources/entities.json');
            assert.strictEqual(children[1].description, '/absolute/auth-entities.json');
        });
        test('items have file-code icon', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.ok(children[0].iconPath);
            assert.strictEqual(children[0].iconPath.id, 'file-code');
        });
        test('items have the list data accessible', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.deepStrictEqual(children[0].list, sampleEntitiesLists[0]);
            assert.deepStrictEqual(children[1].list, sampleEntitiesLists[1]);
        });
    });
    suite('getChildren() — Source Folders category', () => {
        test('returns SourceFolderItem[] with correct labels', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[1]);
            assert.strictEqual(children.length, 2);
            assert.strictEqual(children[0].label, 'App Source');
            assert.strictEqual(children[1].label, 'Migrations');
        });
        test('returns empty array when no folders', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager([]);
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[1]);
            assert.strictEqual(children.length, 0);
        });
        test('items have correct description (path)', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[1]);
            assert.strictEqual(children[0].description, 'src/models');
            assert.strictEqual(children[1].description, '/absolute/migrations');
        });
        test('items have correct contextValue "sourceFolder"', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[1]);
            assert.strictEqual(children[0].contextValue, 'sourceFolder');
            assert.strictEqual(children[1].contextValue, 'sourceFolder');
        });
        test('items have folder icon', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[1]);
            assert.ok(children[0].iconPath);
            assert.strictEqual(children[0].iconPath.id, 'folder');
        });
        test('items have the folder data accessible', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[1]);
            assert.deepStrictEqual(children[0].folder, sampleFolders[0]);
            assert.deepStrictEqual(children[1].folder, sampleFolders[1]);
        });
    });
    suite('getChildren() — DB Connections category', () => {
        test('returns DbConnectionItem[] with correct labels', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[2]);
            assert.strictEqual(children.length, 2);
            assert.strictEqual(children[0].label, 'Dev DB');
            assert.strictEqual(children[1].label, 'Test DB');
        });
        test('returns empty array when no connections', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager([]);
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[2]);
            assert.strictEqual(children.length, 0);
        });
        test('items have correct description (connectionPath)', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[2]);
            assert.strictEqual(children[0].description, 'localhost:5432/dev');
            assert.strictEqual(children[1].description, 'localhost:5432/test');
        });
        test('items have correct contextValue "dbConnection"', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[2]);
            assert.strictEqual(children[0].contextValue, 'dbConnection');
            assert.strictEqual(children[1].contextValue, 'dbConnection');
        });
        test('items have database icon', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[2]);
            assert.ok(children[0].iconPath);
            assert.strictEqual(children[0].iconPath.id, 'database');
        });
        test('items have the connection data accessible', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[2]);
            assert.deepStrictEqual(children[0].connection, sampleConnections[0]);
            assert.deepStrictEqual(children[1].connection, sampleConnections[1]);
        });
    });
    suite('getTreeItem()', () => {
        test('returns element itself', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const item = provider.getTreeItem(roots[0]);
            assert.strictEqual(item, roots[0]);
        });
    });
    suite('refresh()', () => {
        test('fires onDidChangeTreeData event', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            provider.refresh();
            assert.ok(eventFired);
        });
    });
    suite('Auto-refresh on manager changes', () => {
        test('sourceFolderManager.onDidChange triggers tree refresh', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            sfm._fireChange([]);
            assert.ok(eventFired);
        });
        test('dbConnectionManager.onDidChange triggers tree refresh', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            dcm._fireChange([]);
            assert.ok(eventFired);
        });
        test('entitiesListManager.onDidChange triggers tree refresh', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            elm._fireChange([]);
            assert.ok(eventFired);
        });
        test('after manager change, getChildren() returns updated data', () => {
            const vscodeMock = createVscodeMock();
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            // Initially returns 2 source folders
            const roots = provider.getChildren(undefined);
            const sfChildren = provider.getChildren(roots[1]);
            assert.strictEqual(sfChildren.length, 2);
            // Update what getFolders returns
            const updatedFolders = [{ name: 'New Folder', path: 'new/path' }];
            sfm.getFolders.returns(updatedFolders);
            sfm._fireChange(updatedFolders);
            // Now should return updated data
            const newRoots = provider.getChildren(undefined);
            const newChildren = provider.getChildren(newRoots[1]);
            assert.strictEqual(newChildren.length, 1);
            assert.strictEqual(newChildren[0].label, 'New Folder');
        });
    });
    suite('Active list indicator', () => {
        test('active entities list shows check icon', () => {
            const vscodeMock = createVscodeMock();
            vscodeMock.workspace = {
                workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
            };
            const entityMgr = {
                getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
            };
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock, undefined, entityMgr);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children[0].iconPath.id, 'check');
            assert.strictEqual(children[0].isActive, true);
        });
        test('inactive entities list shows file-code icon', () => {
            const vscodeMock = createVscodeMock();
            vscodeMock.workspace = {
                workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
            };
            const entityMgr = {
                getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
            };
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock, undefined, entityMgr);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children[1].iconPath.id, 'file-code');
            assert.strictEqual(children[1].isActive, false);
        });
        test('active list description includes "\u2726 active"', () => {
            const vscodeMock = createVscodeMock();
            vscodeMock.workspace = {
                workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
            };
            const entityMgr = {
                getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
            };
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock, undefined, entityMgr);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.ok(children[0].description.includes('\u2726 active'));
            assert.ok(!children[1].description.includes('\u2726 active'));
        });
        test('entity path change triggers tree refresh', () => {
            const vscodeMock = createVscodeMock();
            let pathChangeCallback;
            const entityMgr = {
                getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                onDidChangeEntitiesPath: sinon.stub().callsFake((cb) => {
                    pathChangeCallback = cb;
                    return { dispose: sinon.stub() };
                }),
            };
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock, undefined, entityMgr);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            pathChangeCallback();
            assert.ok(eventFired, 'entity path change should trigger tree refresh');
        });
        test('no list is active when none match current path', () => {
            const vscodeMock = createVscodeMock();
            vscodeMock.workspace = {
                workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
            };
            const entityMgr = {
                getEntitiesJsonPath: sinon.stub().returns('/completely/different/path.json'),
                onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
            };
            const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock, undefined, entityMgr);
            const sfm = createMockSourceFolderManager();
            const dcm = createMockDbConnectionManager();
            const elm = createMockEntitiesListManager();
            const provider = new AssetsTreeProvider(sfm, dcm, elm);
            const roots = provider.getChildren(undefined);
            const children = provider.getChildren(roots[0]);
            assert.strictEqual(children[0].isActive, false);
            assert.strictEqual(children[1].isActive, false);
        });
    });
    suite('Dimension Filtering', () => {
        const sampleFoldersWithDimensions = [
            { name: 'App Source', path: 'src/models', dimensions: { level: ['physical'], environment: ['dev'] } },
            { name: 'Migrations', path: '/absolute/migrations', dimensions: { level: ['logical'] } },
            { name: 'No Dims', path: 'no-dims' }, // no dimensions field → Unspecified
        ];
        const sampleConnectionsWithDimensions = [
            { name: 'Dev DB', connectionPath: 'localhost:5432/dev', dimensions: { environment: ['dev'] } },
            { name: 'Test DB', connectionPath: 'localhost:5432/test', dimensions: { environment: ['test'] } },
            { name: 'Shared DB', connectionPath: 'localhost:5432/shared' }, // no dimensions → Unspecified
        ];
        const sampleEntitiesListsWithDimensions = [
            { name: 'Main Schema', jsonPath: 'resources/entities.json', dimensions: { level: ['physical'], environment: ['dev'] } },
            { name: 'Auth Module', jsonPath: '/absolute/auth-entities.json', dimensions: { level: ['logical'] } },
            { name: 'Unassigned', jsonPath: 'unassigned.json' }, // no dimensions → Unspecified
        ];
        function createMockDimensionManager() {
            const dims = [
                {
                    id: 'level', name: 'Level', builtIn: true,
                    values: [
                        { id: 'conceptual', label: 'Conceptual', sortOrder: 1 },
                        { id: 'logical', label: 'Logical', sortOrder: 2 },
                        { id: 'physical', label: 'Physical', sortOrder: 3 },
                    ],
                },
                {
                    id: 'environment', name: 'Environment', builtIn: true,
                    values: [
                        { id: 'dev', label: 'Dev', sortOrder: 1 },
                        { id: 'test', label: 'Test', sortOrder: 2 },
                        { id: 'prod', label: 'Prod', sortOrder: 3 },
                    ],
                },
            ];
            return {
                getDimensions: sinon.stub().returns(dims),
                getDimension: sinon.stub().callsFake((id) => dims.find(d => d.id === id)),
                onDidChangeDimensions: sinon.stub().returns({ dispose: sinon.stub() }),
            };
        }
        suite('matchesFilter behavior', () => {
            test('no active filters — all items returned', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                const roots = provider.getChildren(undefined);
                assert.strictEqual(provider.getChildren(roots[0]).length, 3);
                assert.strictEqual(provider.getChildren(roots[1]).length, 3);
                assert.strictEqual(provider.getChildren(roots[2]).length, 3);
            });
            test('filter by single dimension value — only matching items shown', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                // Filter to only 'physical' level
                provider.setDimensionFilter('level', new Set(['physical']));
                const roots = provider.getChildren(undefined);
                // sourceFolders: App Source only
                const folders = provider.getChildren(roots[1]);
                assert.strictEqual(folders.length, 1);
                assert.strictEqual(folders[0].label, 'App Source');
                // entitiesLists: Main Schema only
                const lists = provider.getChildren(roots[0]);
                assert.strictEqual(lists.length, 1);
                assert.strictEqual(lists[0].label, 'Main Schema');
            });
            test('Unspecified filter — shows items with no dimension values', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                provider.setDimensionFilter('level', new Set(['__unspecified__']));
                const roots = provider.getChildren(undefined);
                // 'No Dims' folder has no dimensions → should match __unspecified__
                const folders = provider.getChildren(roots[1]);
                assert.strictEqual(folders.length, 1);
                assert.strictEqual(folders[0].label, 'No Dims');
                // 'Shared DB' has no dimensions → should match __unspecified__
                const connections = provider.getChildren(roots[2]);
                assert.strictEqual(connections.length, 1);
                assert.strictEqual(connections[0].label, 'Shared DB');
                // 'Unassigned' has no dimensions → should match __unspecified__
                const lists = provider.getChildren(roots[0]);
                assert.strictEqual(lists.length, 1);
                assert.strictEqual(lists[0].label, 'Unassigned');
            });
            test('Unspecified + specific value — shows both', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                // Items with level: ['physical'] AND items with no level
                provider.setDimensionFilter('level', new Set(['physical', '__unspecified__']));
                const roots = provider.getChildren(undefined);
                const folders = provider.getChildren(roots[1]);
                assert.strictEqual(folders.length, 2);
                const folderNames = folders.map((f) => f.label);
                assert.ok(folderNames.includes('App Source'));
                assert.ok(folderNames.includes('No Dims'));
            });
            test('AND across dimensions — item must match all filtered dimensions', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                // Filter: level=physical AND environment=dev
                provider.setDimensionFilter('level', new Set(['physical']));
                provider.setDimensionFilter('environment', new Set(['dev']));
                const roots = provider.getChildren(undefined);
                // Only 'App Source' has both level=physical AND environment=dev
                const folders = provider.getChildren(roots[1]);
                assert.strictEqual(folders.length, 1);
                assert.strictEqual(folders[0].label, 'App Source');
                // Only 'Main Schema' has both level=physical AND environment=dev
                const lists = provider.getChildren(roots[0]);
                assert.strictEqual(lists.length, 1);
                assert.strictEqual(lists[0].label, 'Main Schema');
            });
            test('OR within dimension — matching any value suffices', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                // Filter: level = physical OR logical → should match both App Source and Migrations
                provider.setDimensionFilter('level', new Set(['physical', 'logical']));
                const roots = provider.getChildren(undefined);
                const folders = provider.getChildren(roots[1]);
                assert.strictEqual(folders.length, 2);
                assert.strictEqual(folders[0].label, 'App Source');
                assert.strictEqual(folders[1].label, 'Migrations');
            });
            test('clearAllFilters restores all items', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                provider.setDimensionFilter('level', new Set(['physical']));
                const roots1 = provider.getChildren(undefined);
                assert.strictEqual(provider.getChildren(roots1[1]).length, 1);
                provider.clearAllFilters();
                const roots2 = provider.getChildren(undefined);
                assert.strictEqual(provider.getChildren(roots2[1]).length, 3);
            });
            test('assets with matching dimension values pass filter', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                provider.setDimensionFilter('environment', new Set(['dev']));
                const roots = provider.getChildren(undefined);
                const connections = provider.getChildren(roots[2]);
                assert.strictEqual(connections.length, 1);
                assert.strictEqual(connections[0].label, 'Dev DB');
            });
        });
        suite('Filter state API', () => {
            test('hasActiveFilters returns false initially', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                assert.strictEqual(provider.hasActiveFilters(), false);
            });
            test('hasActiveFilters returns true after setDimensionFilter', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                provider.setDimensionFilter('level', new Set(['physical']));
                assert.strictEqual(provider.hasActiveFilters(), true);
                provider.clearAllFilters();
                assert.strictEqual(provider.hasActiveFilters(), false);
            });
            test('getActiveFilterCount returns correct count', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                assert.strictEqual(provider.getActiveFilterCount(), 0);
                provider.setDimensionFilter('level', new Set(['physical']));
                assert.strictEqual(provider.getActiveFilterCount(), 1);
                provider.setDimensionFilter('environment', new Set(['dev']));
                assert.strictEqual(provider.getActiveFilterCount(), 2);
                provider.setDimensionFilter('level', new Set()); // remove level filter
                assert.strictEqual(provider.getActiveFilterCount(), 1);
            });
            test('setDimensionFilter with empty set removes that dimension filter', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                provider.setDimensionFilter('level', new Set(['physical']));
                assert.strictEqual(provider.getActiveFilterCount(), 1);
                provider.setDimensionFilter('level', new Set());
                assert.strictEqual(provider.getActiveFilterCount(), 0);
                assert.strictEqual(provider.hasActiveFilters(), false);
            });
            test('setDimensionFilter fires tree data change event', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                let eventCount = 0;
                provider.onDidChangeTreeData(() => { eventCount++; });
                provider.setDimensionFilter('level', new Set(['physical']));
                assert.strictEqual(eventCount, 1);
                provider.setDimensionFilter('level', new Set()); // remove
                assert.strictEqual(eventCount, 2);
            });
            test('clearAllFilters fires tree data change event', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                let eventCount = 0;
                provider.onDidChangeTreeData(() => { eventCount++; });
                provider.clearAllFilters();
                assert.strictEqual(eventCount, 1);
            });
            test('getFilters returns current filter state', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager();
                const dcm = createMockDbConnectionManager();
                const elm = createMockEntitiesListManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                assert.strictEqual(provider.getFilters().size, 0);
                provider.setDimensionFilter('level', new Set(['physical', 'logical']));
                const filters = provider.getFilters();
                assert.strictEqual(filters.size, 1);
                assert.ok(filters.get('level').has('physical'));
                assert.ok(filters.get('level').has('logical'));
            });
        });
        suite('Category descriptions with filter counts', () => {
            test('no filters — category has no description', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                const roots = provider.getChildren(undefined);
                assert.strictEqual(roots[0].description, undefined);
                assert.strictEqual(roots[1].description, undefined);
                assert.strictEqual(roots[2].description, undefined);
            });
            test('with filters — category shows filtered/total count', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                provider.setDimensionFilter('level', new Set(['physical']));
                const roots = provider.getChildren(undefined);
                // Entities Lists: Main Schema matches (physical) → 1/3
                assert.strictEqual(roots[0].description, '1/3');
                // Source Folders: App Source matches (physical) → 1/3
                assert.strictEqual(roots[1].description, '1/3');
                // DB Connections: none have 'level' dimension → 0/3
                assert.strictEqual(roots[2].description, '0/3');
            });
        });
        suite('Dimension summary on tooltips', () => {
            test('tooltips include dimension summary when dimensionManager provided', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const dimMgr = createMockDimensionManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm, dimMgr);
                const roots = provider.getChildren(undefined);
                // Source folders
                const folders = provider.getChildren(roots[1]);
                // App Source has level: physical, environment: dev
                assert.ok(folders[0].tooltip.includes('Level: Physical'));
                assert.ok(folders[0].tooltip.includes('Environment: Dev'));
                // Migrations has level: logical
                assert.ok(folders[1].tooltip.includes('Level: Logical'));
                // No Dims has no dimensions → no dimension summary
                assert.ok(!folders[2].tooltip.includes('Level:'));
                // DB connections
                const connections = provider.getChildren(roots[2]);
                // Dev DB has environment: dev
                assert.ok(connections[0].tooltip.includes('Environment: Dev'));
                // Test DB has environment: test
                assert.ok(connections[1].tooltip.includes('Environment: Test'));
            });
            test('tooltips have no dimension summary without dimensionManager', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                // No dimensionManager passed
                const provider = new AssetsTreeProvider(sfm, dcm, elm);
                const roots = provider.getChildren(undefined);
                const folders = provider.getChildren(roots[1]);
                // App Source tooltip should NOT include dimension labels
                assert.ok(!folders[0].tooltip.includes('Level:'));
            });
            test('entities list tooltips include dimension summary', () => {
                const vscodeMock = createVscodeMock();
                const { AssetsTreeProvider } = loadAssetsTreeProvider(vscodeMock);
                const sfm = createMockSourceFolderManager(sampleFoldersWithDimensions);
                const dcm = createMockDbConnectionManager(sampleConnectionsWithDimensions);
                const elm = createMockEntitiesListManager(sampleEntitiesListsWithDimensions);
                const dimMgr = createMockDimensionManager();
                const provider = new AssetsTreeProvider(sfm, dcm, elm, dimMgr);
                const roots = provider.getChildren(undefined);
                const lists = provider.getChildren(roots[0]);
                // Main Schema has level: physical, environment: dev
                assert.ok(lists[0].tooltip.includes('Level: Physical'));
                assert.ok(lists[0].tooltip.includes('Environment: Dev'));
                // Auth Module has level: logical
                assert.ok(lists[1].tooltip.includes('Level: Logical'));
                // Unassigned has no dimensions → no dimension summary
                assert.ok(!lists[2].tooltip.includes('Level:'));
            });
        });
    });
});
//# sourceMappingURL=AssetsTreeProvider.test.js.map