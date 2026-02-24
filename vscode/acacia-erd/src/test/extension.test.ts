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

    setup(() => {
        vscodeKit = createVscodeStub();

        // We need to mock all transitive dependencies too
        const mod = proxyquire('../extension', {
            'vscode': vscodeKit.mock,
            './manage_erd/ERDViewProvider': {
                ERDViewProvider: class MockERDViewProvider {
                    constructor(_ctx: any, _sfm: any, _dbm: any) {}
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
            './utils/SourceFolderManager': proxyquire('../utils/SourceFolderManager', {
                'vscode': vscodeKit.mock,
                '@noCallThru': true,
            }),
            './manage_erd/SourceFoldersTreeProvider': proxyquire('../manage_erd/SourceFoldersTreeProvider', {
                'vscode': vscodeKit.mock,
                '@noCallThru': true,
            }),
            './utils/DbConnectionManager': proxyquire('../utils/DbConnectionManager', {
                'vscode': vscodeKit.mock,
                '@noCallThru': true,
            }),
            './manage_erd/DbConnectionsTreeProvider': proxyquire('../manage_erd/DbConnectionsTreeProvider', {
                'vscode': vscodeKit.mock,
                '@noCallThru': true,
            }),
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

        test('showSourceFolders command calls executeCommand with acaciaSourceFolders.focus', () => {
            activate(vscodeKit.context);
            const cmd = vscodeKit.registeredCommands['acacia-erd.showSourceFolders'];
            cmd();
            assert.ok(vscodeKit.mock.commands.executeCommand.calledWith('acaciaSourceFolders.focus'));
        });

        test('showDbConnections command calls executeCommand with acaciaDbConnections.focus', () => {
            activate(vscodeKit.context);
            const cmd = vscodeKit.registeredCommands['acacia-erd.showDbConnections'];
            cmd();
            assert.ok(vscodeKit.mock.commands.executeCommand.calledWith('acaciaDbConnections.focus'));
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
    });

    suite('deactivate()', () => {
        test('returns without error', () => {
            assert.doesNotThrow(() => deactivate());
        });
    });
});
