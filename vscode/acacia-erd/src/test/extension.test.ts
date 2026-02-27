import * as assert from 'assert';
import * as sinon from 'sinon';
import proxyquire = require('proxyquire');

// ─── Mock factories ─────────────────────────────────────────────────────────

function createVscodeStub() {
    const subscriptions: any[] = [];
    const registeredCommands: Record<string, (...args: any[]) => any> = {};
    const registeredViewProviders: Record<string, any> = {};

    const mock = {
        commands: {
            registerCommand: sinon.stub().callsFake((id: string, cb: (...args: any[]) => any) => {
                registeredCommands[id] = cb;
                const disposable = { dispose: sinon.stub() };
                return disposable;
            }),
            executeCommand: sinon.stub().resolves(),
        },
        window: {
            showInformationMessage: sinon.stub().resolves(undefined),
            showWarningMessage: sinon.stub(),
            showErrorMessage: sinon.stub(),
            showOpenDialog: sinon.stub().resolves(undefined),
            showInputBox: sinon.stub().resolves(undefined),
            registerWebviewViewProvider: sinon.stub().callsFake((viewId: string, provider: any) => {
                registeredViewProviders[viewId] = provider;
                const disposable = { dispose: sinon.stub() };
                return disposable;
            }),
            createWebviewPanel: sinon.stub(),
            createTreeView: sinon.stub().returns({ dispose: sinon.stub() }),
            activeTextEditor: undefined,
        },
        workspace: {
            getConfiguration: sinon.stub().returns({
                get: sinon.stub().callsFake((key: string, defaultValue?: any) => {
                    if (key === 'entitiesJsonPath') { return 'resources/entities.json'; }
                    if (key === 'sourceFolders') { return defaultValue !== undefined ? defaultValue : []; }
                    if (key === 'dbConnections') { return defaultValue !== undefined ? defaultValue : []; }
                    return defaultValue;
                }),
                update: sinon.stub().resolves(),
            }),
            onDidChangeConfiguration: sinon.stub().returns({ dispose: sinon.stub() }),
            workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
        },
        env: {
            openExternal: sinon.stub().resolves(true),
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
            event = sinon.stub();
            fire = sinon.stub();
            dispose = sinon.stub();
        },
        ThemeIcon: class MockThemeIcon {
            constructor(public id: string, public color?: any) {}
        },
        ThemeColor: class MockThemeColor {
            constructor(public id: string) {}
        },
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
        ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
        ViewColumn: { One: 1, Two: 2, Three: 3, Active: -1, Beside: -2 },
        '@noCallThru': true,
    };

    const context: any = {
        extensionPath: '/test/ext',
        subscriptions,
    };

    return { mock, context, registeredCommands, registeredViewProviders, subscriptions };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

suite('Extension', () => {
    let vscodeKit: ReturnType<typeof createVscodeStub>;
    let activate: (ctx: any) => void;
    let deactivate: () => void;
    let mockSFM: Record<string, sinon.SinonStub>;
    let mockDBM: Record<string, sinon.SinonStub>;
    let mockELM: Record<string, sinon.SinonStub>;
    let mockEntityManager: Record<string, sinon.SinonStub>;

    setup(() => {
        vscodeKit = createVscodeStub();

        mockSFM = {
            addFolder: sinon.stub().resolves(),
            removeFolder: sinon.stub().resolves(),
            renameFolder: sinon.stub().resolves(),
            getFolders: sinon.stub().returns([]),
            onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
            dispose: sinon.stub(),
        };

        mockDBM = {
            addConnection: sinon.stub().resolves(),
            removeConnection: sinon.stub().resolves(),
            renameConnection: sinon.stub().resolves(),
            editConnectionPath: sinon.stub().resolves(),
            getConnections: sinon.stub().returns([]),
            onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
            dispose: sinon.stub(),
        };

        mockELM = {
            addList: sinon.stub().resolves(),
            removeList: sinon.stub().resolves(),
            renameList: sinon.stub().resolves(),
            editListPath: sinon.stub().resolves(),
            getLists: sinon.stub().returns([]),
            resolveAbsolutePath: sinon.stub().callsFake((list: any) => list.jsonPath),
            onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
            dispose: sinon.stub(),
        };

        mockEntityManager = {
            getEntities: sinon.stub().returns([]),
            getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
            setEntitiesJsonPath: sinon.stub(),
            onDidChangeEntities: sinon.stub().returns({ dispose: sinon.stub() }),
            onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
            dispose: sinon.stub(),
        };

        // We need to mock all transitive dependencies too
        const mod = proxyquire('../extension', {
            'vscode': vscodeKit.mock,
            './manage_erd/ERDViewProvider': {
                ERDViewProvider: class MockERDViewProvider {
                    constructor(_ctx: any, _sfm: any, _dbm: any, _elm?: any) {}
                },
                '@noCallThru': true,
            },
            './manage_erd/EntityTreePanel': {
                EntityTreePanel: class MockEntityTreePanel {
                    constructor(_ctx: any) {}
                },
                '@noCallThru': true,
            },
            './manage_erd/InteractiveERDPanel': {
                InteractiveERDPanel: {
                    currentPanel: undefined,
                    createOrShow: sinon.stub(),
                },
                '@noCallThru': true,
            },
            './utils/HtmlExporter': {
                HtmlExporter: {},
                '@noCallThru': true,
            },
            './utils/SourceFolderManager': {
                SourceFolderManager: class MockSourceFolderManager {
                    addFolder = mockSFM.addFolder;
                    removeFolder = mockSFM.removeFolder;
                    renameFolder = mockSFM.renameFolder;
                    getFolders = mockSFM.getFolders;
                    onDidChange = mockSFM.onDidChange;
                    dispose = mockSFM.dispose;
                },
                '@noCallThru': true,
            },
            './utils/DbConnectionManager': {
                DbConnectionManager: class MockDbConnectionManager {
                    addConnection = mockDBM.addConnection;
                    removeConnection = mockDBM.removeConnection;
                    renameConnection = mockDBM.renameConnection;
                    editConnectionPath = mockDBM.editConnectionPath;
                    getConnections = mockDBM.getConnections;
                    onDidChange = mockDBM.onDidChange;
                    dispose = mockDBM.dispose;
                },
                '@noCallThru': true,
            },
            './utils/EntitiesListManager': {
                EntitiesListManager: class MockEntitiesListManager {
                    addList = mockELM.addList;
                    removeList = mockELM.removeList;
                    renameList = mockELM.renameList;
                    editListPath = mockELM.editListPath;
                    getLists = mockELM.getLists;
                    resolveAbsolutePath = mockELM.resolveAbsolutePath;
                    onDidChange = mockELM.onDidChange;
                    dispose = mockELM.dispose;
                },
                '@noCallThru': true,
            },
            './manage_erd/AssetsTreeProvider': proxyquire('../manage_erd/AssetsTreeProvider', {
                'vscode': vscodeKit.mock,
                'fs': { existsSync: sinon.stub().returns(true), '@noCallThru': true },
                '../utils/EntityManager': {
                    EntityManager: {
                        getInstance: () => mockEntityManager,
                    },
                    '@noCallThru': true,
                },
                '@noCallThru': true,
            }),
            './utils/EntityManager': {
                EntityManager: {
                    getInstance: () => mockEntityManager,
                },
                '@noCallThru': true,
            },
        });

        activate = mod.activate;
        deactivate = mod.deactivate;
    });

    teardown(() => {
        sinon.restore();
    });

    suite('activate()', () => {
        test('registers ERDViewProvider as WebviewViewProvider for "erdView"', () => {
            activate(vscodeKit.context);
            assert.ok('erdView' in vscodeKit.registeredViewProviders);
        });

        test('registers EntityTreePanel as WebviewViewProvider for "openEntityTree"', () => {
            activate(vscodeKit.context);
            assert.ok('openEntityTree' in vscodeKit.registeredViewProviders);
        });

        test('registers acacia-erd.exportInteractiveHtml command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.exportInteractiveHtml' in vscodeKit.registeredCommands);
        });

        test('registers acacia-erd.openERDEditor command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.openERDEditor' in vscodeKit.registeredCommands);
        });

        test('registers acacia-erd.showEntityTree command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.showEntityTree' in vscodeKit.registeredCommands);
        });

        test('all registrations are pushed to context.subscriptions', () => {
            activate(vscodeKit.context);
            // Should have: erdView provider, openEntityTree provider, exportInteractiveHtml, openERDEditor, showEntityTree
            assert.ok(vscodeKit.subscriptions.length >= 5);
        });

        test('openERDEditor command is callable', () => {
            activate(vscodeKit.context);
            const openCmd = vscodeKit.registeredCommands['acacia-erd.openERDEditor'];
            // Calling should not throw — createOrShow is stubbed on the mock
            assert.doesNotThrow(() => openCmd());
        });

        test('showEntityTree command calls executeCommand with openEntityTree.focus', () => {
            activate(vscodeKit.context);
            const showCmd = vscodeKit.registeredCommands['acacia-erd.showEntityTree'];
            showCmd();
            assert.ok(vscodeKit.mock.commands.executeCommand.calledWith('openEntityTree.focus'));
        });

        test('registers acacia-erd.showSourceFolders command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.showSourceFolders' in vscodeKit.registeredCommands);
        });

        test('registers acacia-erd.showDbConnections command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.showDbConnections' in vscodeKit.registeredCommands);
        });

        test('showSourceFolders command calls executeCommand with acaciaAssets.focus', () => {
            activate(vscodeKit.context);
            const cmd = vscodeKit.registeredCommands['acacia-erd.showSourceFolders'];
            cmd();
            assert.ok(vscodeKit.mock.commands.executeCommand.calledWith('acaciaAssets.focus'));
        });

        test('showDbConnections command calls executeCommand with acaciaAssets.focus', () => {
            activate(vscodeKit.context);
            const cmd = vscodeKit.registeredCommands['acacia-erd.showDbConnections'];
            cmd();
            assert.ok(vscodeKit.mock.commands.executeCommand.calledWith('acaciaAssets.focus'));
        });

        test('exportInteractiveHtml with no open panel shows warning message', async () => {
            activate(vscodeKit.context);
            const exportCmd = vscodeKit.registeredCommands['acacia-erd.exportInteractiveHtml'];
            await exportCmd();
            assert.ok(vscodeKit.mock.window.showWarningMessage.calledOnce);
            assert.ok(
                (vscodeKit.mock.window.showWarningMessage.firstCall.args[0] as string)
                    .includes('open an ERD diagram first')
            );
        });

        // ── createTreeView registration tests ────────────────────────────────

        test('creates tree view for acaciaAssets', () => {
            activate(vscodeKit.context);
            const calls = vscodeKit.mock.window.createTreeView.getCalls();
            const assetsCall = calls.find((c: any) => c.args[0] === 'acaciaAssets');
            assert.ok(assetsCall, 'createTreeView should be called with "acaciaAssets"');
        });

        test('assets tree view is created with showCollapseAll: true', () => {
            activate(vscodeKit.context);
            const calls = vscodeKit.mock.window.createTreeView.getCalls();
            const assetsCall = calls.find((c: any) => c.args[0] === 'acaciaAssets');
            assert.strictEqual(assetsCall!.args[1].showCollapseAll, true,
                'acaciaAssets should have showCollapseAll: true');
        });

        test('tree view disposable is pushed to context.subscriptions', () => {
            activate(vscodeKit.context);
            const treeViewDisposable = vscodeKit.mock.window.createTreeView.returnValues;
            assert.ok(treeViewDisposable.length >= 1, 'should have at least 1 tree view disposable');
            for (const disposable of treeViewDisposable) {
                assert.ok(
                    vscodeKit.subscriptions.includes(disposable),
                    'tree view disposable should be in context.subscriptions'
                );
            }
        });

        test('tree view provider has TreeDataProvider interface', () => {
            activate(vscodeKit.context);
            const calls = vscodeKit.mock.window.createTreeView.getCalls();
            const assetsCall = calls.find((c: any) => c.args[0] === 'acaciaAssets');

            const provider = assetsCall!.args[1].treeDataProvider;

            assert.ok(provider, 'acaciaAssets should have a treeDataProvider');
            assert.strictEqual(typeof provider.getTreeItem, 'function',
                'assets provider should implement getTreeItem');
            assert.strictEqual(typeof provider.getChildren, 'function',
                'assets provider should implement getChildren');
            assert.strictEqual(typeof provider.refresh, 'function',
                'assets provider should implement refresh');
        });

        // ── Source folder command behavior tests ─────────────────────────────

        test('addSourceFolder — adds folder when user selects folder and enters name', async () => {
            vscodeKit.mock.window.showOpenDialog = sinon.stub().resolves([vscodeKit.mock.Uri.file('/some/folder')]);
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves('My Folder');
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addSourceFolder']();
            assert.ok(mockSFM.addFolder.calledOnce, 'addFolder should be called once');
            assert.strictEqual(mockSFM.addFolder.firstCall.args[0], 'My Folder');
            assert.strictEqual(mockSFM.addFolder.firstCall.args[1], '/some/folder');
        });

        test('addSourceFolder — does nothing when user cancels folder picker', async () => {
            vscodeKit.mock.window.showOpenDialog = sinon.stub().resolves(undefined);
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addSourceFolder']();
            assert.ok(mockSFM.addFolder.notCalled, 'addFolder should not be called');
        });

        test('addSourceFolder — does nothing when user cancels name input', async () => {
            vscodeKit.mock.window.showOpenDialog = sinon.stub().resolves([vscodeKit.mock.Uri.file('/some/folder')]);
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves(undefined);
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addSourceFolder']();
            assert.ok(mockSFM.addFolder.notCalled, 'addFolder should not be called');
        });

        test('removeSourceFolder — removes folder when given tree item', async () => {
            activate(vscodeKit.context);
            const mockItem = { folder: { name: 'Test' } };
            await vscodeKit.registeredCommands['acacia-erd.removeSourceFolder'](mockItem);
            assert.ok(mockSFM.removeFolder.calledOnce);
            assert.strictEqual(mockSFM.removeFolder.firstCall.args[0], 'Test');
        });

        test('renameSourceFolder — renames folder when user enters new name', async () => {
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves('New Name');
            activate(vscodeKit.context);
            const mockItem = { folder: { name: 'Old Name' } };
            await vscodeKit.registeredCommands['acacia-erd.renameSourceFolder'](mockItem);
            assert.ok(mockSFM.renameFolder.calledOnce);
            assert.strictEqual(mockSFM.renameFolder.firstCall.args[0], 'Old Name');
            assert.strictEqual(mockSFM.renameFolder.firstCall.args[1], 'New Name');
        });

        // ── DB connection command behavior tests ─────────────────────────────

        test('addDbConnection — adds connection when user enters name and path', async () => {
            const inputStub = sinon.stub();
            inputStub.onFirstCall().resolves('Dev DB');
            inputStub.onSecondCall().resolves('localhost:5432/mydb');
            vscodeKit.mock.window.showInputBox = inputStub;
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addDbConnection']();
            assert.ok(mockDBM.addConnection.calledOnce, 'addConnection should be called once');
            assert.strictEqual(mockDBM.addConnection.firstCall.args[0], 'Dev DB');
            assert.strictEqual(mockDBM.addConnection.firstCall.args[1], 'localhost:5432/mydb');
        });

        test('addDbConnection — does nothing when user cancels name input', async () => {
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves(undefined);
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addDbConnection']();
            assert.ok(mockDBM.addConnection.notCalled, 'addConnection should not be called');
        });

        test('addDbConnection — does nothing when user cancels path input', async () => {
            const inputStub = sinon.stub();
            inputStub.onFirstCall().resolves('Dev DB');
            inputStub.onSecondCall().resolves(undefined);
            vscodeKit.mock.window.showInputBox = inputStub;
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addDbConnection']();
            assert.ok(mockDBM.addConnection.notCalled, 'addConnection should not be called');
        });

        test('removeDbConnection — removes connection when given tree item', async () => {
            activate(vscodeKit.context);
            const mockItem = { connection: { name: 'Dev DB' } };
            await vscodeKit.registeredCommands['acacia-erd.removeDbConnection'](mockItem);
            assert.ok(mockDBM.removeConnection.calledOnce);
            assert.strictEqual(mockDBM.removeConnection.firstCall.args[0], 'Dev DB');
        });

        test('renameDbConnection — renames connection when user enters new name', async () => {
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves('New DB');
            activate(vscodeKit.context);
            const mockItem = { connection: { name: 'Old DB' } };
            await vscodeKit.registeredCommands['acacia-erd.renameDbConnection'](mockItem);
            assert.ok(mockDBM.renameConnection.calledOnce);
            assert.strictEqual(mockDBM.renameConnection.firstCall.args[0], 'Old DB');
            assert.strictEqual(mockDBM.renameConnection.firstCall.args[1], 'New DB');
        });

        test('editDbConnectionPath — edits path when user enters new path', async () => {
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves('new/path');
            activate(vscodeKit.context);
            const mockItem = { connection: { name: 'Dev', connectionPath: 'old/path' } };
            await vscodeKit.registeredCommands['acacia-erd.editDbConnectionPath'](mockItem);
            assert.ok(mockDBM.editConnectionPath.calledOnce);
            assert.strictEqual(mockDBM.editConnectionPath.firstCall.args[0], 'Dev');
            assert.strictEqual(mockDBM.editConnectionPath.firstCall.args[1], 'new/path');
        });

        test('registers acacia-erd.refreshAssets command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.refreshAssets' in vscodeKit.registeredCommands);
        });

        test('refreshAssets — calls refresh on assets tree provider', () => {
            activate(vscodeKit.context);
            const calls = vscodeKit.mock.window.createTreeView.getCalls();
            const assetsCall = calls.find((c: any) => c.args[0] === 'acaciaAssets');
            const provider = assetsCall!.args[1].treeDataProvider;
            const refreshSpy = sinon.spy(provider, 'refresh');
            vscodeKit.registeredCommands['acacia-erd.refreshAssets']();
            assert.ok(refreshSpy.calledOnce, 'refresh should be called on assets tree provider');
        });

        // ── Entities list command behavior tests ─────────────────────────────

        test('registers acacia-erd.addEntitiesList command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.addEntitiesList' in vscodeKit.registeredCommands);
        });

        test('addEntitiesList — adds list when user enters name and selects file', async () => {
            const inputStub = sinon.stub().resolves('Main Schema');
            vscodeKit.mock.window.showInputBox = inputStub;
            vscodeKit.mock.window.showOpenDialog = sinon.stub().resolves([vscodeKit.mock.Uri.file('/path/to/entities.json')]);
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addEntitiesList']();
            assert.ok(mockELM.addList.calledOnce);
            assert.strictEqual(mockELM.addList.firstCall.args[0], 'Main Schema');
            assert.strictEqual(mockELM.addList.firstCall.args[1], '/path/to/entities.json');
        });

        test('addEntitiesList — does nothing when user cancels name', async () => {
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves(undefined);
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.addEntitiesList']();
            assert.ok(mockELM.addList.notCalled);
        });

        test('removeEntitiesList — removes list when given tree item', async () => {
            activate(vscodeKit.context);
            const mockItem = { list: { name: 'Main Schema' } };
            await vscodeKit.registeredCommands['acacia-erd.removeEntitiesList'](mockItem);
            assert.ok(mockELM.removeList.calledOnce);
            assert.strictEqual(mockELM.removeList.firstCall.args[0], 'Main Schema');
        });

        test('renameEntitiesList — renames when user enters new name', async () => {
            vscodeKit.mock.window.showInputBox = sinon.stub().resolves('New Schema');
            activate(vscodeKit.context);
            const mockItem = { list: { name: 'Old Schema' } };
            await vscodeKit.registeredCommands['acacia-erd.renameEntitiesList'](mockItem);
            assert.ok(mockELM.renameList.calledOnce);
            assert.strictEqual(mockELM.renameList.firstCall.args[0], 'Old Schema');
            assert.strictEqual(mockELM.renameList.firstCall.args[1], 'New Schema');
        });

        test('editEntitiesListPath — updates path when user selects new file', async () => {
            vscodeKit.mock.window.showOpenDialog = sinon.stub().resolves([vscodeKit.mock.Uri.file('/new/path.json')]);
            activate(vscodeKit.context);
            const mockItem = { list: { name: 'Schema', jsonPath: '/old/path.json' } };
            await vscodeKit.registeredCommands['acacia-erd.editEntitiesListPath'](mockItem);
            assert.ok(mockELM.editListPath.calledOnce);
            assert.strictEqual(mockELM.editListPath.firstCall.args[0], 'Schema');
            assert.strictEqual(mockELM.editListPath.firstCall.args[1], '/new/path.json');
        });

        // ── selectEntitiesList command tests ──────────────────────────────

        test('registers acacia-erd.selectEntitiesList command', () => {
            activate(vscodeKit.context);
            assert.ok('acacia-erd.selectEntitiesList' in vscodeKit.registeredCommands);
        });

        test('selectEntitiesList — calls EntityManager.setEntitiesJsonPath with item absolutePath', async () => {
            activate(vscodeKit.context);
            const mockItem = {
                list: { name: 'Main Schema', jsonPath: 'resources/entities.json' },
                absolutePath: '/workspace/resources/entities.json'
            };
            await vscodeKit.registeredCommands['acacia-erd.selectEntitiesList'](mockItem);
            assert.ok(mockEntityManager.setEntitiesJsonPath.calledOnce);
            assert.strictEqual(mockEntityManager.setEntitiesJsonPath.firstCall.args[0], '/workspace/resources/entities.json');
        });

        test('selectEntitiesList — shows info message with list name', async () => {
            activate(vscodeKit.context);
            const mockItem = {
                list: { name: 'Main Schema', jsonPath: 'resources/entities.json' },
                absolutePath: '/workspace/resources/entities.json'
            };
            await vscodeKit.registeredCommands['acacia-erd.selectEntitiesList'](mockItem);
            assert.ok(vscodeKit.mock.window.showInformationMessage.calledWith('Loaded entities list: Main Schema'));
        });

        test('selectEntitiesList — focuses Entity Tree view', async () => {
            activate(vscodeKit.context);
            const mockItem = {
                list: { name: 'Main Schema', jsonPath: 'resources/entities.json' },
                absolutePath: '/workspace/resources/entities.json'
            };
            await vscodeKit.registeredCommands['acacia-erd.selectEntitiesList'](mockItem);
            assert.ok(vscodeKit.mock.commands.executeCommand.calledWith('openEntityTree.focus'));
        });

        test('selectEntitiesList — does nothing when no item provided', async () => {
            activate(vscodeKit.context);
            await vscodeKit.registeredCommands['acacia-erd.selectEntitiesList']();
            assert.ok(mockEntityManager.setEntitiesJsonPath.notCalled);
        });
    });

    suite('deactivate()', () => {
        test('returns without error', () => {
            assert.doesNotThrow(() => deactivate());
        });
    });
});
