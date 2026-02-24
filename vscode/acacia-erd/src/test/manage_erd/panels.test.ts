import * as assert from 'assert';
import * as sinon from 'sinon';
import proxyquire = require('proxyquire');
import { ObjectRegistry } from '../../utils/ObjectRegistry';
import { resetSingletons } from '../testHelpers';

// ─── Mock factories ─────────────────────────────────────────────────────────

/** Captures the callback passed to onDidReceiveMessage so we can fire it. */
type MessageCallback = (msg: any) => void | Promise<void>;

function createMockWebview() {
    let messageCallback: MessageCallback = () => {};
    const webview: any = {
        options: {} as any,
        html: '',
        postMessage: sinon.stub().resolves(true),
        asWebviewUri: sinon.stub().callsFake((uri: any) => ({
            toString: () => `https://webview-uri/${uri?.path ?? uri}`,
            scheme: 'vscode-webview',
            path: `/${uri?.path ?? uri}`,
        })),
        onDidReceiveMessage: sinon.stub().callsFake((cb: MessageCallback) => {
            messageCallback = cb;
            return { dispose: sinon.stub() };
        }),
    };
    return {
        webview,
        fireMessage: (msg: any) => messageCallback(msg),
    };
}

function createMockWebviewView() {
    const { webview, fireMessage } = createMockWebview();
    let visibilityCallback: (() => void) | undefined;
    const view: any = {
        webview,
        visible: true,
        onDidChangeVisibility: sinon.stub().callsFake((cb: () => void) => {
            visibilityCallback = cb;
            return { dispose: sinon.stub() };
        }),
    };
    return {
        view,
        webview,
        fireMessage,
        fireVisibilityChange: () => visibilityCallback?.(),
    };
}

function createMockWebviewPanel() {
    const { webview, fireMessage } = createMockWebview();
    let disposeCallback: (() => void) | undefined;
    let viewStateCallback: ((e: any) => void) | undefined;
    let disposed = false;
    const panel: any = {
        webview,
        reveal: sinon.stub(),
        dispose: sinon.stub().callsFake(() => {
            if (!disposed && disposeCallback) {
                disposed = true;
                disposeCallback();
            }
        }),
        onDidDispose: sinon.stub().callsFake((cb: () => void) => {
            disposeCallback = cb;
            return { dispose: sinon.stub() };
        }),
        onDidChangeViewState: sinon.stub().callsFake((cb: (e: any) => void) => {
            viewStateCallback = cb;
            return { dispose: sinon.stub() };
        }),
        visible: true,
    };
    return {
        panel,
        webview,
        fireMessage,
        triggerDispose: () => { if (disposeCallback) { disposeCallback(); } },
        triggerViewState: (e: any) => { if (viewStateCallback) { viewStateCallback(e); } },
    };
}

function createMockContext(extensionPath: string = '/test/ext') {
    return { extensionPath } as any;
}

function createFsStub(htmlContent: string = '<html>dummy</html>') {
    return {
        readFileSync: sinon.stub().returns(htmlContent),
        writeFileSync: sinon.stub(),
        '@noCallThru': true,
    };
}

function createBaseVscodeStub(mockPanel?: any) {
    return {
        window: {
            showErrorMessage: sinon.stub(),
            showInformationMessage: sinon.stub(),
            createWebviewPanel: sinon.stub().returns(mockPanel),
            activeTextEditor: undefined,
        },
        commands: {
            executeCommand: sinon.stub().resolves(),
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
        ViewColumn: { One: 1, Two: 2, Three: 3, Active: -1, Beside: -2 },
        '@noCallThru': true,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

suite('Webview Panels', () => {

    teardown(() => {
        sinon.restore();
    });

    // ── ERDViewProvider ─────────────────────────────────────────────────

    suite('ERDViewProvider', () => {
        let ERDViewProvider: any;
        let fsStub: ReturnType<typeof createFsStub>;
        let vsMock: ReturnType<typeof createBaseVscodeStub>;
        let interactiveCreateOrShow: sinon.SinonStub;
        let erdGenCreateOrShow: sinon.SinonStub;
        let mockSourceFolderManager: any;
        let mockDbConnectionManager: any;

        function createMockManagers() {
            mockSourceFolderManager = {
                getFolders: sinon.stub().returns([]),
                onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
            };
            mockDbConnectionManager = {
                getConnections: sinon.stub().returns([]),
                onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
            };
        }

        function createProvider() {
            return new ERDViewProvider(createMockContext(), mockSourceFolderManager, mockDbConnectionManager);
        }

        setup(() => {
            fsStub = createFsStub('<html>manage_erd</html>');
            vsMock = createBaseVscodeStub();
            interactiveCreateOrShow = sinon.stub();
            erdGenCreateOrShow = sinon.stub();
            createMockManagers();

            const mod = proxyquire('../../manage_erd/ERDViewProvider', {
                'fs': fsStub,
                'vscode': vsMock,
                './InteractiveERDPanel': { InteractiveERDPanel: { createOrShow: interactiveCreateOrShow } },
                './ERDGenerationPanel': { ERDGenerationPanel: { createOrShow: erdGenCreateOrShow } },
                '../utils/EntityManager': {
                    EntityManager: {
                        getInstance: () => ({
                            getEntities: sinon.stub().returns([]),
                            getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                            onDidChangeEntities: sinon.stub().returns({ dispose: sinon.stub() }),
                            onDidChangeEntitiesPath: sinon.stub().returns({ dispose: sinon.stub() }),
                        })
                    },
                    '@noCallThru': true,
                },
                '../utils/SourceFolderManager': { '@noCallThru': true },
                '../utils/DbConnectionManager': { '@noCallThru': true },
            });
            ERDViewProvider = mod.ERDViewProvider;
        });

        test('resolveWebviewView sets enableScripts and localResourceRoots', () => {
            const provider = createProvider();
            const { view } = createMockWebviewView();
            provider.resolveWebviewView(view);

            assert.strictEqual(view.webview.options.enableScripts, true);
            assert.ok(Array.isArray(view.webview.options.localResourceRoots));
            assert.strictEqual(view.webview.options.localResourceRoots.length, 1);
        });

        test('resolveWebviewView reads manage_erd.html and sets it as webview HTML', () => {
            const provider = createProvider();
            const { view } = createMockWebviewView();
            provider.resolveWebviewView(view);

            assert.ok(fsStub.readFileSync.calledOnce);
            const readPath = fsStub.readFileSync.firstCall.args[0] as string;
            assert.ok(readPath.includes('manage_erd.html'));
            assert.strictEqual(view.webview.html, '<html>manage_erd</html>');
        });

        test('message "createERD" → calls InteractiveERDPanel.createOrShow', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            await fireMessage({ command: 'createERD' });
            assert.ok(interactiveCreateOrShow.calledOnce);
        });

        test('message "generateERD" → calls ERDGenerationPanel.createOrShow', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            await fireMessage({ command: 'generateERD' });
            assert.ok(erdGenCreateOrShow.calledOnce);
        });

        test('message "viewEntities" → calls executeCommand("openEntityTree.focus")', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            await fireMessage({ command: 'viewEntities' });
            assert.ok(vsMock.commands.executeCommand.calledWith('openEntityTree.focus'));
        });

        test('message "viewSourceFolders" → calls executeCommand("acaciaSourceFolders.focus")', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            await fireMessage({ command: 'viewSourceFolders' });
            assert.ok(vsMock.commands.executeCommand.calledWith('acaciaSourceFolders.focus'));
        });

        test('message "viewDbConnections" → calls executeCommand("acaciaDbConnections.focus")', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            await fireMessage({ command: 'viewDbConnections' });
            assert.ok(vsMock.commands.executeCommand.calledWith('acaciaDbConnections.focus'));
        });

        test('message "requestStatus" → posts updateStatus message', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            await fireMessage({ command: 'requestStatus' });
            assert.ok(view.webview.postMessage.calledOnce);
            const msg = view.webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
            assert.strictEqual(msg.entityCount, 0);
            assert.strictEqual(msg.sourceFolderCount, 0);
            assert.strictEqual(msg.dbConnectionCount, 0);
        });

        test('message "refresh" → resets webview HTML', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);

            view.webview.html = 'changed';
            await fireMessage({ command: 'refresh' });
            assert.strictEqual(view.webview.html, '<html>manage_erd</html>');
        });
    });

    // ── EntityTreePanel ─────────────────────────────────────────────────

    suite('EntityTreePanel', () => {
        let EntityTreePanel: any;
        let fsStub: ReturnType<typeof createFsStub>;
        let vsMock: ReturnType<typeof createBaseVscodeStub>;
        let mockEntityManager: any;
        let mockDescribeCreateOrShow: sinon.SinonStub;
        let mockInteractivePanel: any;

        setup(() => {
            resetSingletons();
            ObjectRegistry.getInstance().clear();

            fsStub = createFsStub();
            vsMock = createBaseVscodeStub();
            mockEntityManager = {
                getInstance: sinon.stub(),
                getEntities: sinon.stub().returns([
                    { id: '1', name: 'User', columns: ['id'], linkedEntities: [] },
                ]),
                deleteEntity: sinon.stub(),
                onDidChangeEntities: sinon.stub().returns({ dispose: sinon.stub() }),
            };
            mockEntityManager.getInstance.returns(mockEntityManager);

            mockDescribeCreateOrShow = sinon.stub();

            mockInteractivePanel = {
                currentPanel: null as any,
                deleteEntity: sinon.stub(),
            };

            const mod = proxyquire('../../manage_erd/EntityTreePanel', {
                'fs': fsStub,
                'vscode': vsMock,
                '../utils/EntityManager': { EntityManager: mockEntityManager },
                '../utils/ObjectRegistry': { ObjectRegistry },
                './DescribeEntity': { DescribeEntityPanel: { createOrShow: mockDescribeCreateOrShow } },
                './InteractiveERDPanel': { InteractiveERDPanel: mockInteractivePanel },
            });
            EntityTreePanel = mod.EntityTreePanel;
        });

        teardown(() => {
            resetSingletons();
        });

        test('constructor registers itself in ObjectRegistry as "EntityTreePanel"', () => {
            const panel = new EntityTreePanel(createMockContext());
            assert.strictEqual(ObjectRegistry.getInstance().get('EntityTreePanel'), panel);
        });

        test('resolveWebviewView generates HTML with search input, sort select, view toggle', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view } = createMockWebviewView();
            panel.resolveWebviewView(view);

            const html = view.webview.html;
            assert.ok(html.includes('filter-input'), 'should contain search input');
            assert.ok(html.includes('sort-select'), 'should contain sort select');
            assert.ok(html.includes('list-view'), 'should contain list view toggle');
            assert.ok(html.includes('card-view'), 'should contain card view toggle');
        });

        test('resolveWebviewView calls _loadEntities which posts loadEntities message', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview } = createMockWebviewView();
            panel.resolveWebviewView(view);

            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'loadEntities');
            assert.ok(Array.isArray(msg.entities));
        });

        test('when visibility changes to visible → reloads entities', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview, fireVisibilityChange } = createMockWebviewView();
            panel.resolveWebviewView(view);

            webview.postMessage.resetHistory();
            view.visible = true;
            fireVisibilityChange();

            assert.ok(webview.postMessage.calledOnce);
            assert.strictEqual(webview.postMessage.firstCall.args[0].command, 'loadEntities');
        });

        test('message "deleteEntity" → calls EntityManager.deleteEntity()', async () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);

            await fireMessage({ command: 'deleteEntity', entityName: 'User' });
            assert.ok(mockEntityManager.deleteEntity.calledWith('User'));
        });

        test('message "describeEntity" → calls DescribeEntityPanel.createOrShow', async () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);

            const entity = { id: '1', name: 'User' };
            await fireMessage({ command: 'describeEntity', entity });
            assert.ok(mockDescribeCreateOrShow.calledOnce);
            assert.deepStrictEqual(mockDescribeCreateOrShow.firstCall.args[1], entity);
        });

        test('_loadEntities posts correct message format', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { webview } = createMockWebview();

            panel._loadEntities(webview);
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'loadEntities');
            assert.ok(Array.isArray(msg.entities));
        });
    });

    // ── DescribeEntityPanel ─────────────────────────────────────────────

    suite('DescribeEntityPanel', () => {
        let DescribeEntityPanel: any;
        let vsMock: ReturnType<typeof createBaseVscodeStub>;
        let panelKit: ReturnType<typeof createMockWebviewPanel>;

        setup(() => {
            panelKit = createMockWebviewPanel();
            vsMock = createBaseVscodeStub(panelKit.panel);

            const mod = proxyquire('../../manage_erd/DescribeEntity', {
                'vscode': vsMock,
            });
            DescribeEntityPanel = mod.DescribeEntityPanel;
            DescribeEntityPanel.currentPanel = undefined;
        });

        const sampleEntity = {
            name: 'User',
            description: 'A user entity',
            columns: ['id', 'name', 'email'],
            linkedEntities: ['Order', 'Profile'],
        };

        test('createOrShow creates new panel if no current panel', () => {
            DescribeEntityPanel.createOrShow('/ext', sampleEntity);
            assert.ok(vsMock.window.createWebviewPanel.calledOnce);
            assert.ok(DescribeEntityPanel.currentPanel);
        });

        test('createOrShow reveals existing panel if already open, updates content', () => {
            DescribeEntityPanel.createOrShow('/ext', sampleEntity);
            vsMock.window.createWebviewPanel.resetHistory();

            const otherEntity = { name: 'Order', description: 'An order', columns: ['id'], linkedEntities: [] };
            DescribeEntityPanel.createOrShow('/ext', otherEntity);

            assert.ok(vsMock.window.createWebviewPanel.notCalled, 'should not create a second panel');
            assert.ok(panelKit.panel.reveal.calledOnce);
            // HTML should be updated with the new entity
            assert.ok(panelKit.webview.html.includes('Order'));
        });

        test('generated HTML contains entity name, description, columns table, relationship count', () => {
            DescribeEntityPanel.createOrShow('/ext', sampleEntity);
            const html = panelKit.webview.html;
            assert.ok(html.includes('User'), 'entity name');
            assert.ok(html.includes('A user entity'), 'description');
            assert.ok(html.includes('id'), 'column');
            assert.ok(html.includes('email'), 'column');
            assert.ok(html.includes('2'), 'relationship count');
        });

        test('entity with no columns → shows "No columns defined"', () => {
            DescribeEntityPanel.createOrShow('/ext', { name: 'Empty', columns: [], linkedEntities: [] });
            const html = panelKit.webview.html;
            assert.ok(html.includes('No columns defined'));
        });

        test('entity with linked entities → shows relationship section', () => {
            DescribeEntityPanel.createOrShow('/ext', sampleEntity);
            const html = panelKit.webview.html;
            assert.ok(html.includes('Order'));
            assert.ok(html.includes('Profile'));
            assert.ok(html.includes('Linked Entities'));
        });

        test('dispose() clears currentPanel and disposes panel', () => {
            DescribeEntityPanel.createOrShow('/ext', sampleEntity);
            assert.ok(DescribeEntityPanel.currentPanel);

            DescribeEntityPanel.currentPanel.dispose();
            assert.strictEqual(DescribeEntityPanel.currentPanel, undefined);
            assert.ok(panelKit.panel.dispose.called);
        });
    });

    // ── ERDGenerationPanel ──────────────────────────────────────────────

    suite('ERDGenerationPanel', () => {
        let ERDGenerationPanel: any;
        let vsMock: ReturnType<typeof createBaseVscodeStub>;
        let panelKit: ReturnType<typeof createMockWebviewPanel>;
        let chooseJSONFileStub: sinon.SinonStub;
        let mockInteractivePanel: any;

        setup(() => {
            panelKit = createMockWebviewPanel();
            vsMock = createBaseVscodeStub(panelKit.panel);
            chooseJSONFileStub = sinon.stub();

            mockInteractivePanel = {
                currentPanel: null as any,
            };

            const mod = proxyquire('../../manage_erd/ERDGenerationPanel', {
                'vscode': vsMock,
                './InteractiveERDPanel': {
                    chooseJSONFile: chooseJSONFileStub,
                    InteractiveERDPanel: mockInteractivePanel,
                },
            });
            ERDGenerationPanel = mod.ERDGenerationPanel;
            ERDGenerationPanel.currentPanel = undefined;
        });

        test('createOrShow creates new panel if none exists', () => {
            ERDGenerationPanel.createOrShow('/ext');
            assert.ok(vsMock.window.createWebviewPanel.calledOnce);
            assert.ok(ERDGenerationPanel.currentPanel);
        });

        test('createOrShow reveals existing panel if already open', () => {
            ERDGenerationPanel.createOrShow('/ext');
            vsMock.window.createWebviewPanel.resetHistory();

            ERDGenerationPanel.createOrShow('/ext');
            assert.ok(vsMock.window.createWebviewPanel.notCalled);
            assert.ok(panelKit.panel.reveal.calledOnce);
        });

        test('message "generateERD" → calls chooseJSONFile with parameters, then disposes', async () => {
            // Set up an InteractiveERDPanel.currentPanel with a mock webview
            const mockIWebview = { postMessage: sinon.stub() };
            mockInteractivePanel.currentPanel = { _panel: { webview: mockIWebview } };

            ERDGenerationPanel.createOrShow('/ext');

            const params = { maxEntities: 10, discoverLinkedEntities: true, entityName: 'User' };
            await panelKit.fireMessage({ command: 'generateERD', parameters: params });

            assert.ok(chooseJSONFileStub.calledOnce);
            assert.deepStrictEqual(chooseJSONFileStub.firstCall.args[1], params);
            assert.ok(panelKit.panel.dispose.called);
        });

        test('message "cancel" → disposes panel', async () => {
            ERDGenerationPanel.createOrShow('/ext');
            await panelKit.fireMessage({ command: 'cancel' });
            assert.ok(panelKit.panel.dispose.called);
        });

        test('message "showError" → calls vscode.window.showErrorMessage', async () => {
            ERDGenerationPanel.createOrShow('/ext');
            await panelKit.fireMessage({ command: 'showError', message: 'Something broke' });
            assert.ok(vsMock.window.showErrorMessage.calledWith('Something broke'));
        });

        test('dispose() clears currentPanel', () => {
            ERDGenerationPanel.createOrShow('/ext');
            assert.ok(ERDGenerationPanel.currentPanel);

            panelKit.triggerDispose();
            assert.strictEqual(ERDGenerationPanel.currentPanel, undefined);
        });
    });
});
