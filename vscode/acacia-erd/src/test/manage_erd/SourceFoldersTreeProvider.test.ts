import * as assert from 'assert';
import * as sinon from 'sinon';
import proxyquire = require('proxyquire');

const sampleFolders = [
    { name: 'App Source', path: 'src/models' },
    { name: 'Migrations', path: '/absolute/migrations' },
];

function createMockManager(folders: any[] = sampleFolders) {
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
        '@noCallThru': true,
    };
}

function loadTreeProvider(vscodeMock: any, fsMock?: any) {
    const mod = proxyquire('../../manage_erd/SourceFoldersTreeProvider', {
        'vscode': vscodeMock,
        'fs': fsMock || { existsSync: sinon.stub().returns(true), '@noCallThru': true },
        '../utils/SourceFolderManager': { '@noCallThru': true },
    });
    return { SourceFoldersTreeProvider: mod.SourceFoldersTreeProvider, SourceFolderTreeItem: mod.SourceFolderTreeItem };
}

suite('SourceFoldersTreeProvider', () => {
    teardown(() => {
        sinon.restore();
    });

    suite('getChildren()', () => {
        test('returns SourceFolderTreeItem[] with correct labels', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children.length, 2);
            assert.strictEqual(children[0].label, 'App Source');
            assert.strictEqual(children[1].label, 'Migrations');
        });

        test('returns empty array when no folders configured', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager([]);
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children.length, 0);
        });

        test('root call (no element) returns all folders', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren(undefined);
            assert.strictEqual(children.length, 2);
        });

        test('child call (with element) returns empty array (flat list)', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            const grandChildren = provider.getChildren(children[0]);
            assert.strictEqual(grandChildren.length, 0);
        });
    });

    suite('getTreeItem()', () => {
        test('returns the element itself', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            const item = provider.getTreeItem(children[0]);
            assert.strictEqual(item, children[0]);
        });

        test('element has correct description (the path)', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children[0].description, 'src/models');
            assert.strictEqual(children[1].description, '/absolute/migrations');
        });

        test('element has correct contextValue (sourceFolder)', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children[0].contextValue, 'sourceFolder');
            assert.strictEqual(children[1].contextValue, 'sourceFolder');
        });

        test('element has the folder icon', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            const children = provider.getChildren();
            assert.ok(children[0].iconPath);
            assert.strictEqual(children[0].iconPath.id, 'folder');
        });
    });

    suite('Tree refresh', () => {
        test('refresh() fires onDidChangeTreeData', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            provider.refresh();
            assert.ok(eventFired);
        });

        test('manager onDidChange event triggers tree refresh', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            manager._fireChange([]);
            assert.ok(eventFired);
        });

        test('after manager fires change, getChildren() returns updated data', () => {
            const vscodeMock = createVscodeMock();
            const { SourceFoldersTreeProvider } = loadTreeProvider(vscodeMock);
            const updatedFolders = [{ name: 'New Folder', path: 'new/path' }];
            const manager = createMockManager();
            const provider = new SourceFoldersTreeProvider(manager);

            // Initially returns 2 folders
            assert.strictEqual(provider.getChildren().length, 2);

            // Update what getFolders returns
            manager.getFolders.returns(updatedFolders);
            manager._fireChange(updatedFolders);

            // Now should return updated data
            const children = provider.getChildren();
            assert.strictEqual(children.length, 1);
            assert.strictEqual(children[0].label, 'New Folder');
        });
    });
});
