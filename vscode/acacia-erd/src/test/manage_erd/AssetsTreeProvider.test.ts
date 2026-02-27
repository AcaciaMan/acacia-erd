import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import proxyquire = require('proxyquire');

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

function createMockSourceFolderManager(folders: any[] = sampleFolders) {
    const changeListeners: Function[] = [];
    return {
        getFolders: sinon.stub().returns(folders),
        resolveAbsolutePath: sinon.stub().callsFake((f: any) =>
            f.path.startsWith('/') ? f.path : `/mock/workspace/${f.path}`
        ),
        onDidChange: (listener: Function) => {
            changeListeners.push(listener);
            return { dispose: sinon.stub() };
        },
        _fireChange: (data: any) => changeListeners.forEach(l => l(data)),
    };
}

function createMockDbConnectionManager(connections: any[] = sampleConnections) {
    const changeListeners: Function[] = [];
    return {
        getConnections: sinon.stub().returns(connections),
        onDidChange: (listener: Function) => {
            changeListeners.push(listener);
            return { dispose: sinon.stub() };
        },
        _fireChange: (data: any) => changeListeners.forEach(l => l(data)),
    };
}

function createMockEntitiesListManager(lists: any[] = sampleEntitiesLists) {
    const changeListeners: Function[] = [];
    return {
        getLists: sinon.stub().returns(lists),
        resolveAbsolutePath: sinon.stub().callsFake((l: any) =>
            path.isAbsolute(l.jsonPath) ? l.jsonPath : path.resolve('/mock/workspace', l.jsonPath)
        ),
        onDidChange: (listener: Function) => {
            changeListeners.push(listener);
            return { dispose: sinon.stub() };
        },
        _fireChange: (data: any) => changeListeners.forEach(l => l(data)),
    };
}

function createVscodeMock() {
    return {
        TreeItem: class MockTreeItem {
            label: string;
            collapsibleState: number;
            description?: string;
            tooltip?: string;
            contextValue?: string;
            iconPath?: any;
            command?: any;
            constructor(label: string, collapsibleState?: number) {
                this.label = label;
                this.collapsibleState = collapsibleState || 0;
            }
        },
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        ThemeIcon: class MockThemeIcon {
            constructor(public id: string, public color?: any) {}
        },
        ThemeColor: class MockThemeColor {
            constructor(public id: string) {}
        },
        Uri: {
            file: (p: string) => ({
                scheme: 'file',
                fsPath: p,
                path: p.replace(/\\/g, '/'),
                toString: () => `file:///${p.replace(/\\/g, '/')}`,
            }),
        },
        EventEmitter: class MockEventEmitter {
            private listeners: Function[] = [];
            event = (listener: Function) => {
                this.listeners.push(listener);
                return { dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) { this.listeners.splice(idx, 1); }
                }};
            };
            fire = (data: any) => { this.listeners.forEach(l => l(data)); };
            dispose = sinon.stub();
        },
        workspace: {
            workspaceFolders: undefined as any,
        },
        '@noCallThru': true,
    };
}

function loadAssetsTreeProvider(vscodeMock: any, fsMock?: any, entityManagerMock?: any) {
    const mod = proxyquire('../../manage_erd/AssetsTreeProvider', {
        'vscode': vscodeMock,
        'fs': fsMock || { existsSync: sinon.stub().returns(true), '@noCallThru': true },
        '../utils/SourceFolderManager': { '@noCallThru': true },
        '../utils/DbConnectionManager': { '@noCallThru': true },
        '../utils/EntitiesListManager': { '@noCallThru': true },
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
            let pathChangeCallback: (() => void) | undefined;
            const entityMgr = {
                getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                onDidChangeEntitiesPath: sinon.stub().callsFake((cb: () => void) => {
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
            pathChangeCallback!();
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
});
