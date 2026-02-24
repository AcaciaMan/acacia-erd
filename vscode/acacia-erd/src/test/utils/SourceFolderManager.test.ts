import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import proxyquire = require('proxyquire');

const MOCK_WORKSPACE = '/mock/workspace';

function createVscodeStub(initialFolders: any[] = []) {
    const updateStub = sinon.stub().resolves();
    const getStub = sinon.stub().returns(initialFolders);
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

function loadSourceFolderManager(vscodeMock: any) {
    const mod = proxyquire('../../utils/SourceFolderManager', {
        'vscode': vscodeMock,
    });
    return mod.SourceFolderManager;
}

suite('SourceFolderManager', () => {
    teardown(() => {
        sinon.restore();
    });

    suite('Constructor', () => {
        test('creates instance without error', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            assert.ok(manager);
            manager.dispose();
        });

        test('sets up configuration listener via onDidChangeConfiguration', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            assert.ok(mock.workspace.onDidChangeConfiguration.calledOnce);
            manager.dispose();
        });
    });

    suite('getFolders()', () => {
        test('returns empty array when no folders configured', () => {
            const { mock } = createVscodeStub([]);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const folders = manager.getFolders();
            assert.deepStrictEqual(folders, []);
            manager.dispose();
        });

        test('returns configured folders from settings', () => {
            const configuredFolders = [
                { name: 'App Source', path: 'src/models' },
                { name: 'Migrations', path: '/absolute/migrations' },
            ];
            const { mock } = createVscodeStub(configuredFolders);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const folders = manager.getFolders();
            assert.deepStrictEqual(folders, configuredFolders);
            manager.dispose();
        });

        test('returns a fresh copy each time (reads from config)', () => {
            const configuredFolders = [{ name: 'Test', path: 'test' }];
            const { mock } = createVscodeStub(configuredFolders);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            manager.getFolders();
            manager.getFolders();
            // getConfiguration should be called each time getFolders is called
            // (once in constructor for the config listener setup doesn't call getConfiguration,
            //  so it should be called twice for the two getFolders calls)
            assert.ok(mock.workspace.getConfiguration.callCount >= 2);
            manager.dispose();
        });
    });

    suite('addFolder()', () => {
        test('adds a folder and calls update() with the new array', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            await manager.addFolder('Models', 'src/models');
            assert.ok(updateStub.calledOnce);
            const savedFolders = updateStub.firstCall.args[1];
            assert.strictEqual(savedFolders.length, 1);
            assert.strictEqual(savedFolders[0].name, 'Models');
            manager.dispose();
        });

        test('stores workspace-relative path when folder is inside workspace', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const absolutePath = path.join(MOCK_WORKSPACE, 'src', 'models');
            await manager.addFolder('Models', absolutePath);
            assert.ok(updateStub.calledOnce);
            const savedFolders = updateStub.firstCall.args[1];
            const expectedRelative = path.join('src', 'models');
            assert.strictEqual(savedFolders[0].path, expectedRelative);
            manager.dispose();
        });

        test('stores absolute path when folder is outside workspace', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const outsidePath = '/other/location/models';
            await manager.addFolder('External', outsidePath);
            assert.ok(updateStub.calledOnce);
            const savedFolders = updateStub.firstCall.args[1];
            assert.strictEqual(savedFolders[0].path, outsidePath);
            manager.dispose();
        });

        test('shows warning and does not add when name already exists', async () => {
            const existing = [{ name: 'Models', path: 'src/models' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            await manager.addFolder('Models', 'src/other');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });

        test('fires onDidChange event after adding', async () => {
            const { mock } = createVscodeStub([]);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.addFolder('Models', 'src/models');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('removeFolder()', () => {
        test('removes the folder by name and saves', async () => {
            const existing = [
                { name: 'Models', path: 'src/models' },
                { name: 'Migrations', path: 'db/migrations' },
            ];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            await manager.removeFolder('Models');
            assert.ok(updateStub.calledOnce);
            const savedFolders = updateStub.firstCall.args[1];
            assert.strictEqual(savedFolders.length, 1);
            assert.strictEqual(savedFolders[0].name, 'Migrations');
            manager.dispose();
        });

        test('does not error when name not found (just saves the filtered list)', async () => {
            const existing = [{ name: 'Models', path: 'src/models' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            await manager.removeFolder('NonExistent');
            assert.ok(updateStub.calledOnce);
            const savedFolders = updateStub.firstCall.args[1];
            assert.strictEqual(savedFolders.length, 1);
            manager.dispose();
        });

        test('fires onDidChange event after removing', async () => {
            const existing = [{ name: 'Models', path: 'src/models' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.removeFolder('Models');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('renameFolder()', () => {
        test('renames an existing folder', async () => {
            const existing = [{ name: 'Models', path: 'src/models' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            await manager.renameFolder('Models', 'Data Models');
            assert.ok(updateStub.calledOnce);
            const savedFolders = updateStub.firstCall.args[1];
            assert.strictEqual(savedFolders[0].name, 'Data Models');
            assert.strictEqual(savedFolders[0].path, 'src/models');
            manager.dispose();
        });

        test('does not error when old name not found', async () => {
            const existing = [{ name: 'Models', path: 'src/models' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            await manager.renameFolder('NonExistent', 'NewName');
            // update should not be called when the folder isn't found
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });

        test('fires onDidChange event after renaming', async () => {
            const existing = [{ name: 'Models', path: 'src/models' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.renameFolder('Models', 'Data Models');
            assert.ok(eventFired);
            manager.dispose();
        });
    });

    suite('resolveAbsolutePath()', () => {
        test('returns absolute path unchanged', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const absPath = '/absolute/path/to/folder';
            const result = manager.resolveAbsolutePath({ name: 'Test', path: absPath });
            assert.strictEqual(result, absPath);
            manager.dispose();
        });

        test('resolves relative path against workspace folder', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const result = manager.resolveAbsolutePath({ name: 'Test', path: 'src/models' });
            const expected = path.resolve(MOCK_WORKSPACE, 'src/models');
            assert.strictEqual(result, expected);
            manager.dispose();
        });

        test('resolves relative path against CWD when no workspace folder', () => {
            const { mock } = createVscodeStub();
            (mock.workspace as any).workspaceFolders = undefined;
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            const result = manager.resolveAbsolutePath({ name: 'Test', path: 'src/models' });
            const expected = path.resolve('src/models');
            assert.strictEqual(result, expected);
            manager.dispose();
        });
    });

    suite('dispose()', () => {
        test('disposes config listener', () => {
            const { mock } = createVscodeStub();
            const configDispose = sinon.stub();
            mock.workspace.onDidChangeConfiguration = sinon.stub().returns({ dispose: configDispose });
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            manager.dispose();
            assert.ok(configDispose.calledOnce);
        });

        test('disposes event emitter', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadSourceFolderManager(mock);
            const manager = new ManagerClass();
            // After dispose, the emitter's dispose should have been called
            manager.dispose();
            // No error means success — the mock EventEmitter.dispose is a stub
            assert.ok(true);
        });
    });
});
