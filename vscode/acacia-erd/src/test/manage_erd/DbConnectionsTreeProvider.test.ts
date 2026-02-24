import * as assert from 'assert';
import * as sinon from 'sinon';
import proxyquire = require('proxyquire');

const sampleConnections = [
    { name: 'Dev DB', connectionPath: 'sqlite:///data/dev.db' },
    { name: 'Test DB', connectionPath: 'localhost:5432/testdb' },
];

function createMockManager(connections: any[] = sampleConnections) {
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

function createVscodeStubForTree() {
    return {
        TreeItem: class MockTreeItem {
            label: string;
            description?: string;
            tooltip?: string;
            contextValue?: string;
            iconPath?: any;
            collapsibleState: number;
            command?: any;
            constructor(label: string, collapsibleState: number = 0) {
                this.label = label;
                this.collapsibleState = collapsibleState;
            }
        },
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        ThemeIcon: class MockThemeIcon {
            constructor(public id: string, public color?: any) {}
        },
        EventEmitter: class MockEventEmitter {
            private listeners: Function[] = [];
            event = (listener: Function) => {
                this.listeners.push(listener);
                return { dispose: sinon.stub() };
            };
            fire = (data: any) => { this.listeners.forEach(l => l(data)); };
            dispose = sinon.stub();
        },
        '@noCallThru': true,
    };
}

function loadTreeProvider(vscodeMock: any) {
    const mod = proxyquire('../../manage_erd/DbConnectionsTreeProvider', {
        'vscode': vscodeMock,
        '../utils/DbConnectionManager': { '@noCallThru': true },
    });
    return { DbConnectionsTreeProvider: mod.DbConnectionsTreeProvider, DbConnectionTreeItem: mod.DbConnectionTreeItem };
}

suite('DbConnectionsTreeProvider', () => {
    teardown(() => {
        sinon.restore();
    });

    suite('getChildren()', () => {
        test('returns DbConnectionTreeItem[] with correct labels', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children.length, 2);
            assert.strictEqual(children[0].label, 'Dev DB');
            assert.strictEqual(children[1].label, 'Test DB');
        });

        test('returns empty array when no connections configured', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager([]);
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children.length, 0);
        });

        test('root call (no element) returns all connections', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren(undefined);
            assert.strictEqual(children.length, 2);
        });

        test('child call (with element) returns empty array (flat list)', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            const grandChildren = provider.getChildren(children[0]);
            assert.strictEqual(grandChildren.length, 0);
        });
    });

    suite('getTreeItem()', () => {
        test('returns the element itself', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            const item = provider.getTreeItem(children[0]);
            assert.strictEqual(item, children[0]);
        });

        test('element has correct description (the connection path)', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children[0].description, 'sqlite:///data/dev.db');
            assert.strictEqual(children[1].description, 'localhost:5432/testdb');
        });

        test('element has correct contextValue (dbConnection)', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            assert.strictEqual(children[0].contextValue, 'dbConnection');
            assert.strictEqual(children[1].contextValue, 'dbConnection');
        });

        test('element has the database icon', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            const children = provider.getChildren();
            assert.ok(children[0].iconPath);
            assert.strictEqual(children[0].iconPath.id, 'database');
        });
    });

    suite('Tree refresh', () => {
        test('refresh() fires onDidChangeTreeData', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            provider.refresh();
            assert.ok(eventFired);
        });

        test('manager onDidChange event triggers tree refresh', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);
            let eventFired = false;
            provider.onDidChangeTreeData(() => { eventFired = true; });
            manager._fireChange([]);
            assert.ok(eventFired);
        });

        test('after manager fires change, getChildren() returns updated data', () => {
            const vscodeMock = createVscodeStubForTree();
            const { DbConnectionsTreeProvider } = loadTreeProvider(vscodeMock);
            const updated = [{ name: 'New DB', connectionPath: 'new-path' }];
            const manager = createMockManager();
            const provider = new DbConnectionsTreeProvider(manager);

            // Initially returns 2 connections
            assert.strictEqual(provider.getChildren().length, 2);

            // Update what getConnections returns
            manager.getConnections.returns(updated);
            manager._fireChange(updated);

            // Now should return updated data
            const children = provider.getChildren();
            assert.strictEqual(children.length, 1);
            assert.strictEqual(children[0].label, 'New DB');
        });
    });
});
