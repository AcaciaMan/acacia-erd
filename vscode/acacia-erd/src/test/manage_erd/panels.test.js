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
const proxyquire = require("proxyquire");
const ObjectRegistry_1 = require("../../utils/ObjectRegistry");
const testHelpers_1 = require("../testHelpers");
function createMockWebview() {
    let messageCallback = () => { };
    const webview = {
        options: {},
        html: '',
        postMessage: sinon.stub().resolves(true),
        asWebviewUri: sinon.stub().callsFake((uri) => ({
            toString: () => `https://webview-uri/${uri?.path ?? uri}`,
            scheme: 'vscode-webview',
            path: `/${uri?.path ?? uri}`,
        })),
        onDidReceiveMessage: sinon.stub().callsFake((cb) => {
            messageCallback = cb;
            return { dispose: sinon.stub() };
        }),
    };
    return {
        webview,
        fireMessage: (msg) => messageCallback(msg),
    };
}
function createMockWebviewView() {
    const { webview, fireMessage } = createMockWebview();
    let visibilityCallback;
    const view = {
        webview,
        visible: true,
        onDidChangeVisibility: sinon.stub().callsFake((cb) => {
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
    let disposeCallback;
    let viewStateCallback;
    let disposed = false;
    const panel = {
        webview,
        reveal: sinon.stub(),
        dispose: sinon.stub().callsFake(() => {
            if (!disposed && disposeCallback) {
                disposed = true;
                disposeCallback();
            }
        }),
        onDidDispose: sinon.stub().callsFake((cb) => {
            disposeCallback = cb;
            return { dispose: sinon.stub() };
        }),
        onDidChangeViewState: sinon.stub().callsFake((cb) => {
            viewStateCallback = cb;
            return { dispose: sinon.stub() };
        }),
        visible: true,
    };
    return {
        panel,
        webview,
        fireMessage,
        triggerDispose: () => { if (disposeCallback) {
            disposeCallback();
        } },
        triggerViewState: (e) => { if (viewStateCallback) {
            viewStateCallback(e);
        } },
    };
}
function createMockContext(extensionPath = '/test/ext') {
    return { extensionPath };
}
function createFsStub(htmlContent = '<html>dummy</html>') {
    return {
        readFileSync: sinon.stub().returns(htmlContent),
        writeFileSync: sinon.stub(),
        '@noCallThru': true,
    };
}
function createBaseVscodeStub(mockPanel) {
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
            file: (p) => ({
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
        let ERDViewProvider;
        let fsStub;
        let vsMock;
        let interactiveCreateOrShow;
        let erdGenCreateOrShow;
        let mockSourceFolderManager;
        let mockDbConnectionManager;
        let mockEntitiesListManager;
        let entityChangeCallback;
        let entityPathChangeCallback;
        let sourceFolderChangeCallback;
        let dbConnectionChangeCallback;
        let entitiesListChangeCallback;
        function createMockManagers() {
            mockSourceFolderManager = {
                getFolders: sinon.stub().returns([]),
                onDidChange: sinon.stub().callsFake((cb) => {
                    sourceFolderChangeCallback = cb;
                    return { dispose: sinon.stub() };
                }),
            };
            mockDbConnectionManager = {
                getConnections: sinon.stub().returns([]),
                onDidChange: sinon.stub().callsFake((cb) => {
                    dbConnectionChangeCallback = cb;
                    return { dispose: sinon.stub() };
                }),
            };
            mockEntitiesListManager = {
                getLists: sinon.stub().returns([]),
                onDidChange: sinon.stub().callsFake((cb) => {
                    entitiesListChangeCallback = cb;
                    return { dispose: sinon.stub() };
                }),
            };
        }
        function createProvider() {
            return new ERDViewProvider(createMockContext(), mockSourceFolderManager, mockDbConnectionManager, mockEntitiesListManager);
        }
        setup(() => {
            fsStub = createFsStub('<html>manage_erd</html>');
            vsMock = createBaseVscodeStub();
            interactiveCreateOrShow = sinon.stub();
            erdGenCreateOrShow = sinon.stub();
            entityChangeCallback = undefined;
            entityPathChangeCallback = undefined;
            sourceFolderChangeCallback = undefined;
            dbConnectionChangeCallback = undefined;
            entitiesListChangeCallback = undefined;
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
                            onDidChangeEntities: sinon.stub().callsFake((cb) => {
                                entityChangeCallback = cb;
                                return { dispose: sinon.stub() };
                            }),
                            onDidChangeEntitiesPath: sinon.stub().callsFake((cb) => {
                                entityPathChangeCallback = cb;
                                return { dispose: sinon.stub() };
                            }),
                        })
                    },
                    '@noCallThru': true,
                },
                '../utils/SourceFolderManager': { '@noCallThru': true },
                '../utils/DbConnectionManager': { '@noCallThru': true },
                '../utils/EntitiesListManager': { '@noCallThru': true },
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
            const readPath = fsStub.readFileSync.firstCall.args[0];
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
        // ── Auto-status update tests ─────────────────────────────────────
        test('entity change → auto-posts updateStatus', () => {
            const provider = createProvider();
            const { view, webview } = createMockWebviewView();
            provider.resolveWebviewView(view);
            webview.postMessage.resetHistory();
            entityChangeCallback();
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
            assert.strictEqual(msg.entityCount, 0);
        });
        test('entities path change → auto-posts updateStatus', () => {
            const provider = createProvider();
            const { view, webview } = createMockWebviewView();
            provider.resolveWebviewView(view);
            webview.postMessage.resetHistory();
            entityPathChangeCallback();
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
        });
        test('source folder change → posts updateStatus with correct count', () => {
            const provider = createProvider();
            const { view, webview } = createMockWebviewView();
            provider.resolveWebviewView(view);
            mockSourceFolderManager.getFolders.returns([
                { name: 'Src', path: '/src' },
                { name: 'Lib', path: '/lib' },
            ]);
            webview.postMessage.resetHistory();
            sourceFolderChangeCallback();
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
            assert.strictEqual(msg.sourceFolderCount, 2);
        });
        test('DB connection change → posts updateStatus with correct count', () => {
            const provider = createProvider();
            const { view, webview } = createMockWebviewView();
            provider.resolveWebviewView(view);
            mockDbConnectionManager.getConnections.returns([
                { name: 'Dev DB', connectionPath: 'localhost:5432/dev' },
            ]);
            webview.postMessage.resetHistory();
            dbConnectionChangeCallback();
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
            assert.strictEqual(msg.dbConnectionCount, 1);
        });
        test('auto-status does nothing if view not yet resolved', () => {
            // Subscriptions are set up in resolveWebviewView, not the constructor.
            // Manager onDidChange stubs are called during resolveWebviewView.
            // Before that, callbacks are not registered, so no auto-status fires.
            const provider = createProvider();
            assert.strictEqual(entityChangeCallback, undefined, 'entity change callback should not be set before resolveWebviewView');
            assert.strictEqual(entityPathChangeCallback, undefined, 'entity path change callback should not be set before resolveWebviewView');
            // After resolveWebviewView, callbacks should be captured
            const { view } = createMockWebviewView();
            provider.resolveWebviewView(view);
            assert.ok(entityChangeCallback, 'entity change callback should be set after resolveWebviewView');
            assert.ok(sourceFolderChangeCallback, 'source folder change callback should be set');
            assert.ok(dbConnectionChangeCallback, 'db connection change callback should be set');
            assert.ok(entitiesListChangeCallback, 'entities list change callback should be set');
        });
        test('message "viewAssets" → calls executeCommand("acaciaAssets.focus")', async () => {
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);
            await fireMessage({ command: 'viewAssets' });
            assert.ok(vsMock.commands.executeCommand.calledWith('acaciaAssets.focus'));
        });
        test('message "requestStatus" → updateStatus includes entitiesListCount', async () => {
            mockEntitiesListManager.getLists.returns([
                { name: 'Schema A', jsonPath: 'a.json' },
                { name: 'Schema B', jsonPath: 'b.json' },
            ]);
            const provider = createProvider();
            const { view, fireMessage } = createMockWebviewView();
            provider.resolveWebviewView(view);
            await fireMessage({ command: 'requestStatus' });
            assert.ok(view.webview.postMessage.calledOnce);
            const msg = view.webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
            assert.strictEqual(msg.entitiesListCount, 2);
        });
        test('entities list change → posts updateStatus with correct count', () => {
            const provider = createProvider();
            const { view, webview } = createMockWebviewView();
            provider.resolveWebviewView(view);
            mockEntitiesListManager.getLists.returns([
                { name: 'Schema', jsonPath: 'schema.json' },
            ]);
            webview.postMessage.resetHistory();
            entitiesListChangeCallback();
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'updateStatus');
            assert.strictEqual(msg.entitiesListCount, 1);
        });
    });
    // ── EntityTreePanel ─────────────────────────────────────────────────
    suite('EntityTreePanel', () => {
        let EntityTreePanel;
        let fsStub;
        let vsMock;
        let mockEntityManager;
        let mockDescribeCreateOrShow;
        let mockInteractivePanel;
        let entityChangeCallback;
        let entityPathChangeCallback;
        setup(() => {
            (0, testHelpers_1.resetSingletons)();
            ObjectRegistry_1.ObjectRegistry.getInstance().clear();
            entityChangeCallback = undefined;
            entityPathChangeCallback = undefined;
            fsStub = createFsStub();
            vsMock = createBaseVscodeStub();
            mockEntityManager = {
                getInstance: sinon.stub(),
                getEntities: sinon.stub().returns([
                    { id: '1', name: 'User', columns: ['id'], linkedEntities: [] },
                ]),
                getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
                deleteEntity: sinon.stub(),
                onDidChangeEntities: sinon.stub().callsFake((cb) => {
                    entityChangeCallback = cb;
                    return { dispose: sinon.stub() };
                }),
                onDidChangeEntitiesPath: sinon.stub().callsFake((cb) => {
                    entityPathChangeCallback = cb;
                    return { dispose: sinon.stub() };
                }),
            };
            mockEntityManager.getInstance.returns(mockEntityManager);
            mockDescribeCreateOrShow = sinon.stub();
            mockInteractivePanel = {
                currentPanel: null,
                deleteEntity: sinon.stub(),
            };
            const mod = proxyquire('../../manage_erd/EntityTreePanel', {
                'fs': fsStub,
                'vscode': vsMock,
                '../utils/EntityManager': { EntityManager: mockEntityManager },
                '../utils/ObjectRegistry': { ObjectRegistry: ObjectRegistry_1.ObjectRegistry },
                './DescribeEntity': { DescribeEntityPanel: { createOrShow: mockDescribeCreateOrShow } },
                './InteractiveERDPanel': { InteractiveERDPanel: mockInteractivePanel },
            });
            EntityTreePanel = mod.EntityTreePanel;
        });
        teardown(() => {
            (0, testHelpers_1.resetSingletons)();
        });
        test('constructor registers itself in ObjectRegistry as "EntityTreePanel"', () => {
            const panel = new EntityTreePanel(createMockContext());
            assert.strictEqual(ObjectRegistry_1.ObjectRegistry.getInstance().get('EntityTreePanel'), panel);
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
            const loadMsg = webview.postMessage.args.find((a) => a[0].command === 'loadEntities');
            assert.ok(loadMsg, 'should post loadEntities message');
            assert.ok(Array.isArray(loadMsg[0].entities));
        });
        test('when visibility changes to visible → reloads entities', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview, fireVisibilityChange } = createMockWebviewView();
            panel.resolveWebviewView(view);
            webview.postMessage.resetHistory();
            view.visible = true;
            fireVisibilityChange();
            const loadMsg = webview.postMessage.args.find((a) => a[0].command === 'loadEntities');
            assert.ok(loadMsg, 'should post loadEntities on visibility change');
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
        test('onDidChangeEntities → posts loadEntities to webview', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview } = createMockWebviewView();
            panel.resolveWebviewView(view);
            webview.postMessage.resetHistory();
            const newEntities = [{ id: '2', name: 'Order', columns: [], linkedEntities: [] }];
            entityChangeCallback(newEntities);
            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'loadEntities');
            assert.deepStrictEqual(msg.entities, newEntities);
        });
        test('onDidChangeEntities — does nothing if webviewView not yet resolved', () => {
            new EntityTreePanel(createMockContext());
            // Do NOT call resolveWebviewView
            const newEntities = [{ id: '2', name: 'Order', columns: [], linkedEntities: [] }];
            assert.doesNotThrow(() => entityChangeCallback(newEntities));
        });
        test('message "alert" → calls showErrorMessage', async () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);
            await fireMessage({ command: 'alert', text: 'Something went wrong' });
            assert.ok(vsMock.window.showErrorMessage.calledWith('Something went wrong'));
        });
        test('message "openEntityDetails" — with active InteractiveERDPanel', async () => {
            mockInteractivePanel.currentPanel = {
                openEntityDetails: sinon.stub(),
                deleteEntity: sinon.stub(),
            };
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);
            const entity = { id: '1', name: 'User' };
            await fireMessage({ command: 'openEntityDetails', entity });
            assert.ok(mockInteractivePanel.currentPanel.openEntityDetails.calledOnce);
            assert.deepStrictEqual(mockInteractivePanel.currentPanel.openEntityDetails.firstCall.args[0], entity);
        });
        test('message "openEntityDetails" — no active InteractiveERDPanel', async () => {
            mockInteractivePanel.currentPanel = null;
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);
            const entity = { id: '1', name: 'User' };
            assert.doesNotThrow(() => fireMessage({ command: 'openEntityDetails', entity }));
        });
        test('message "showInfoMessage" → calls showInformationMessage', async () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);
            await fireMessage({ command: 'showInfoMessage', message: 'Entity saved' });
            assert.ok(vsMock.window.showInformationMessage.calledWith('Entity saved'));
        });
        test('constructor subscribes to EntityManager.onDidChangeEntitiesPath', () => {
            new EntityTreePanel(createMockContext());
            assert.ok(entityPathChangeCallback, 'onDidChangeEntitiesPath callback should be captured');
        });
        test('onDidChangeEntitiesPath → posts updateEntitiesPath to webview', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview } = createMockWebviewView();
            panel.resolveWebviewView(view);
            webview.postMessage.resetHistory();
            entityPathChangeCallback('/new/path/entities.json');
            const pathMsg = webview.postMessage.args.find((a) => a[0].command === 'updateEntitiesPath');
            assert.ok(pathMsg, 'should post updateEntitiesPath message');
            assert.strictEqual(pathMsg[0].entitiesFilePath, '/new/path/entities.json');
        });
        test('onDidChangeEntitiesPath — does nothing if webviewView not yet resolved', () => {
            new EntityTreePanel(createMockContext());
            assert.doesNotThrow(() => entityPathChangeCallback('/some/path.json'));
        });
        test('resolveWebviewView posts updateEntitiesPath with initial path', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview } = createMockWebviewView();
            panel.resolveWebviewView(view);
            const pathMsg = webview.postMessage.args.find((a) => a[0].command === 'updateEntitiesPath');
            assert.ok(pathMsg, 'should post updateEntitiesPath on resolve');
            assert.strictEqual(pathMsg[0].entitiesFilePath, 'resources/entities.json');
        });
        test('when visibility changes to visible → sends updateEntitiesPath', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, webview, fireVisibilityChange } = createMockWebviewView();
            panel.resolveWebviewView(view);
            webview.postMessage.resetHistory();
            view.visible = true;
            fireVisibilityChange();
            const pathMsg = webview.postMessage.args.find((a) => a[0].command === 'updateEntitiesPath');
            assert.ok(pathMsg, 'should post updateEntitiesPath on visibility change');
        });
        test('message "browseAssets" → calls executeCommand("acaciaAssets.focus")', async () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);
            await fireMessage({ command: 'browseAssets' });
            assert.ok(vsMock.commands.executeCommand.calledWith('acaciaAssets.focus'));
        });
        test('resolveWebviewView generates HTML with file-indicator element', () => {
            const panel = new EntityTreePanel(createMockContext());
            const { view } = createMockWebviewView();
            panel.resolveWebviewView(view);
            const html = view.webview.html;
            assert.ok(html.includes('file-indicator'), 'should contain file indicator element');
            assert.ok(html.includes('file-name'), 'should contain file name element');
        });
        test('message "deleteEntity" — also notifies InteractiveERDPanel', async () => {
            mockInteractivePanel.currentPanel = {
                openEntityDetails: sinon.stub(),
                deleteEntity: sinon.stub(),
            };
            const panel = new EntityTreePanel(createMockContext());
            const { view, fireMessage } = createMockWebviewView();
            panel.resolveWebviewView(view);
            await fireMessage({ command: 'deleteEntity', entityName: 'User' });
            assert.ok(mockEntityManager.deleteEntity.calledWith('User'));
            assert.ok(mockInteractivePanel.currentPanel.deleteEntity.calledOnce);
            assert.strictEqual(mockInteractivePanel.currentPanel.deleteEntity.firstCall.args[0], 'User');
        });
    });
    // ── DescribeEntityPanel ─────────────────────────────────────────────
    suite('DescribeEntityPanel', () => {
        let DescribeEntityPanel;
        let vsMock;
        let panelKit;
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
        let ERDGenerationPanel;
        let vsMock;
        let panelKit;
        let chooseJSONFileStub;
        let mockInteractivePanel;
        setup(() => {
            panelKit = createMockWebviewPanel();
            vsMock = createBaseVscodeStub(panelKit.panel);
            chooseJSONFileStub = sinon.stub();
            mockInteractivePanel = {
                currentPanel: null,
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
//# sourceMappingURL=panels.test.js.map