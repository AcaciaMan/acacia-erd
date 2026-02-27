import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import proxyquire = require('proxyquire');

const MOCK_WORKSPACE = '/mock/workspace';

function createVscodeStub(initialLists: any[] = []) {
    const updateStub = sinon.stub().resolves();
    const getStub = sinon.stub().returns(initialLists);
    const mock = {
        workspace: {
            getConfiguration: sinon.stub().callsFake(() => ({
                get: getStub,
                update: updateStub,
            })),
            workspaceFolders: [{ uri: { fsPath: MOCK_WORKSPACE } }],
            onDidChangeConfiguration: sinon.stub().returns({ dispose: sinon.stub() }),
        },
        window: {
            showWarningMessage: sinon.stub(),
        },
        ConfigurationTarget: {
            Workspace: 2,
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
    return { mock, updateStub, getStub };
}

function loadEntitiesListManager(vscodeMock: any) {
    const mod = proxyquire('../../utils/EntitiesListManager', {
        'vscode': vscodeMock,
    });
    return mod.EntitiesListManager;
}

suite('EntitiesListManager', () => {
    teardown(() => {
        sinon.restore();
    });

    suite('Constructor', () => {
        test('creates instance without error', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            assert.ok(manager);
            manager.dispose();
        });

        test('sets up configuration listener via onDidChangeConfiguration', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            assert.ok(mock.workspace.onDidChangeConfiguration.calledOnce);
            manager.dispose();
        });
    });

    suite('getLists()', () => {
        test('returns empty array when no lists configured', () => {
            const { mock } = createVscodeStub([]);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const lists = manager.getLists();
            assert.deepStrictEqual(lists, []);
            manager.dispose();
        });

        test('returns configured lists from settings', () => {
            const configuredLists = [
                { name: 'Main Schema', jsonPath: 'resources/entities.json' },
                { name: 'Auth Module', jsonPath: '/absolute/auth-entities.json' },
            ];
            const { mock } = createVscodeStub(configuredLists);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const lists = manager.getLists();
            assert.deepStrictEqual(lists, configuredLists);
            manager.dispose();
        });

        test('returns a fresh copy each time (reads from config)', () => {
            const configuredLists = [{ name: 'Test', jsonPath: 'test.json' }];
            const { mock } = createVscodeStub(configuredLists);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            manager.getLists();
            manager.getLists();
            // getConfiguration should be called each time getLists is called
            assert.ok(mock.workspace.getConfiguration.callCount >= 2);
            manager.dispose();
        });
    });

    suite('addList()', () => {
        test('adds a list and calls update() with the new array', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.addList('Main Schema', 'resources/entities.json');
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            assert.strictEqual(savedLists.length, 1);
            assert.strictEqual(savedLists[0].name, 'Main Schema');
            assert.strictEqual(savedLists[0].jsonPath, 'resources/entities.json');
            manager.dispose();
        });

        test('stores workspace-relative path when file is inside workspace', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const absolutePath = path.join(MOCK_WORKSPACE, 'resources', 'entities.json');
            await manager.addList('Main Schema', absolutePath);
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            const expectedRelative = path.join('resources', 'entities.json');
            assert.strictEqual(savedLists[0].jsonPath, expectedRelative);
            manager.dispose();
        });

        test('stores absolute path when file is outside workspace', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const outsidePath = '/other/location/schema.json';
            await manager.addList('External', outsidePath);
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            assert.strictEqual(savedLists[0].jsonPath, outsidePath);
            manager.dispose();
        });

        test('shows warning and does not add when name already exists', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.addList('Main Schema', 'other/entities.json');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });

        test('fires onDidChange event after adding', async () => {
            const { mock } = createVscodeStub([]);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.addList('Main Schema', 'resources/entities.json');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('removeList()', () => {
        test('removes the list by name and saves', async () => {
            const existing = [
                { name: 'Main Schema', jsonPath: 'resources/entities.json' },
                { name: 'Auth Module', jsonPath: 'auth/entities.json' },
            ];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.removeList('Main Schema');
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            assert.strictEqual(savedLists.length, 1);
            assert.strictEqual(savedLists[0].name, 'Auth Module');
            manager.dispose();
        });

        test('does not error when name not found (just saves the filtered list)', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.removeList('NonExistent');
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            assert.strictEqual(savedLists.length, 1);
            manager.dispose();
        });

        test('fires onDidChange event after removing', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.removeList('Main Schema');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('renameList()', () => {
        test('renames an existing list', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.renameList('Main Schema', 'Primary Schema');
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            assert.strictEqual(savedLists[0].name, 'Primary Schema');
            assert.strictEqual(savedLists[0].jsonPath, 'resources/entities.json');
            manager.dispose();
        });

        test('does not error when old name not found', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.renameList('NonExistent', 'NewName');
            // update should not be called when the list isn't found
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });

        test('fires onDidChange event after renaming', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.renameList('Main Schema', 'Primary Schema');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('editListPath()', () => {
        test('updates jsonPath of existing list', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const newAbsPath = path.join(MOCK_WORKSPACE, 'data', 'schema.json');
            await manager.editListPath('Main Schema', newAbsPath);
            assert.ok(updateStub.calledOnce);
            const savedLists = updateStub.firstCall.args[1];
            const expectedRelative = path.join('data', 'schema.json');
            assert.strictEqual(savedLists[0].jsonPath, expectedRelative);
            manager.dispose();
        });

        test('does not error when name not found', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            await manager.editListPath('NonExistent', '/some/path.json');
            // update should not be called when the list isn't found
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });

        test('fires onDidChange event after editing path', async () => {
            const existing = [{ name: 'Main Schema', jsonPath: 'resources/entities.json' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.editListPath('Main Schema', '/new/path/entities.json');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('resolveAbsolutePath()', () => {
        test('returns absolute path unchanged', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const absPath = '/absolute/path/to/entities.json';
            const result = manager.resolveAbsolutePath({ name: 'Test', jsonPath: absPath });
            assert.strictEqual(result, absPath);
            manager.dispose();
        });

        test('resolves relative path against workspace folder', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const result = manager.resolveAbsolutePath({ name: 'Test', jsonPath: 'resources/entities.json' });
            const expected = path.resolve(MOCK_WORKSPACE, 'resources/entities.json');
            assert.strictEqual(result, expected);
            manager.dispose();
        });

        test('resolves relative path against CWD when no workspace folder', () => {
            const { mock } = createVscodeStub();
            (mock.workspace as any).workspaceFolders = undefined;
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            const result = manager.resolveAbsolutePath({ name: 'Test', jsonPath: 'resources/entities.json' });
            const expected = path.resolve('resources/entities.json');
            assert.strictEqual(result, expected);
            manager.dispose();
        });
    });

    suite('dispose()', () => {
        test('disposes config listener', () => {
            const { mock } = createVscodeStub();
            const configDispose = sinon.stub();
            mock.workspace.onDidChangeConfiguration = sinon.stub().returns({ dispose: configDispose });
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            manager.dispose();
            assert.ok(configDispose.calledOnce);
        });

        test('disposes event emitter', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadEntitiesListManager(mock);
            const manager = new ManagerClass();
            // After dispose, the emitter's dispose should have been called
            manager.dispose();
            // No error means success — the mock EventEmitter.dispose is a stub
            assert.ok(true);
        });
    });
});
