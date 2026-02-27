import * as assert from 'assert';
import * as sinon from 'sinon';
import proxyquire = require('proxyquire');
import { resetSingletons } from '../testHelpers';

// ─── Mock factories ─────────────────────────────────────────────────────────

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

function createMockWebviewPanel() {
    const { webview, fireMessage } = createMockWebview();
    let disposeCallback: (() => void) | undefined;
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
        onDidChangeViewState: sinon.stub().callsFake((_cb: (e: any) => void) => {
            return { dispose: sinon.stub() };
        }),
        visible: true,
    };
    return { panel, webview, fireMessage };
}

const DUMMY_HTML = [
    '<html><body>',
    '<script src="/resources/interactive_erd.js"></script>',
    '<script src="/resources/usage_erd.js"></script>',
    '<script src="/resources/generate_erd.js"></script>',
    '<script src="/resources/pluralize.js"></script>',
    '<script src="/resources/icons.js"></script>',
    '</body></html>',
].join('\n');

function createFsStub(htmlContent: string = DUMMY_HTML) {
    return {
        readFileSync: sinon.stub().returns(htmlContent),
        writeFileSync: sinon.stub(),
        '@noCallThru': true,
    };
}

function createVscodeStub(primaryPanel: any, secondaryPanel?: any) {
    let callCount = 0;
    return {
        window: {
            showInformationMessage: sinon.stub().resolves(undefined),
            showWarningMessage: sinon.stub(),
            showErrorMessage: sinon.stub(),
            showSaveDialog: sinon.stub().resolves(undefined),
            showOpenDialog: sinon.stub().resolves(undefined),
            createWebviewPanel: sinon.stub().callsFake(() => {
                callCount++;
                // First call returns primary panel, subsequent return secondary
                return callCount === 1 ? primaryPanel : (secondaryPanel ?? primaryPanel);
            }),
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

function createMockEntityManager() {
    let pathChangeCallback: ((path: string) => void) | undefined;

    const mgr: any = {
        getEntitiesJsonPath: sinon.stub().returns('resources/entities.json'),
        getEntities: sinon.stub().returns([
            { id: '1', name: 'User', columns: ['id', 'name'], linkedEntities: ['Order'] },
        ]),
        getEntityByName: sinon.stub().callsFake((name: string) => {
            if (name === 'User') {
                return { id: '1', name: 'User', description: 'A user', columns: ['id', 'name'], linkedEntities: ['Order'] };
            }
            throw new Error(`Entity with name ${name} not found`);
        }),
        updateEntity: sinon.stub(),
        deleteEntity: sinon.stub(),
        setEntitiesJsonPath: sinon.stub(),
        onDidChangeEntities: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidChangeEntitiesPath: sinon.stub().callsFake((cb: (path: string) => void) => {
            pathChangeCallback = cb;
            return { dispose: sinon.stub() };
        }),
    };
    return {
        EntityManager: {
            getInstance: sinon.stub().returns(mgr),
        },
        Entity: undefined,
        mgr,
        pathChangeCallback: () => pathChangeCallback,
        '@noCallThru': true,
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

suite('InteractiveERDPanel', () => {
    let InteractiveERDPanel: any;
    let chooseJSONFile: any;
    let fsStub: ReturnType<typeof createFsStub>;
    let vsMock: ReturnType<typeof createVscodeStub>;
    let emMock: ReturnType<typeof createMockEntityManager>;
    let panelKit: ReturnType<typeof createMockWebviewPanel>;
    let editPanelKit: ReturnType<typeof createMockWebviewPanel>;
    let describeCreateOrShow: sinon.SinonStub;
    let erdGenCreateOrShow: sinon.SinonStub;
    let htmlExporterMock: any;

    setup(() => {
        resetSingletons();
        panelKit = createMockWebviewPanel();
        editPanelKit = createMockWebviewPanel();
        fsStub = createFsStub();
        vsMock = createVscodeStub(panelKit.panel, editPanelKit.panel);
        emMock = createMockEntityManager();
        describeCreateOrShow = sinon.stub();
        erdGenCreateOrShow = sinon.stub();
        htmlExporterMock = {
            HtmlExporter: {
                createExportData: sinon.stub().returns({
                    title: 'Test',
                    entities: [],
                    svgContent: '<svg></svg>',
                    metadata: { created: '2026-01-01', version: '1.0' },
                }),
                exportToHtml: sinon.stub().resolves(),
            },
            '@noCallThru': true,
        };

        const mod = proxyquire('../../manage_erd/InteractiveERDPanel', {
            'fs': fsStub,
            'vscode': vsMock,
            '../utils/EntityManager': emMock,
            '../utils/HtmlExporter': htmlExporterMock,
            './DescribeEntity': { DescribeEntityPanel: { createOrShow: describeCreateOrShow }, '@noCallThru': true },
            './ERDGenerationPanel': { ERDGenerationPanel: { createOrShow: erdGenCreateOrShow }, '@noCallThru': true },
        });
        InteractiveERDPanel = mod.InteractiveERDPanel;
        chooseJSONFile = mod.chooseJSONFile;
        InteractiveERDPanel.currentPanel = undefined;
    });

    teardown(() => {
        if (InteractiveERDPanel) {
            InteractiveERDPanel.currentPanel = undefined;
        }
        sinon.restore();
    });

    // ── createOrShow() ──────────────────────────────────────────────────

    suite('createOrShow()', () => {
        test('creates new panel when currentPanel is undefined', () => {
            InteractiveERDPanel.createOrShow('/ext');
            assert.ok(vsMock.window.createWebviewPanel.calledOnce);
            assert.ok(InteractiveERDPanel.currentPanel);
        });

        test('reveals existing panel when currentPanel is already set', () => {
            InteractiveERDPanel.createOrShow('/ext');
            vsMock.window.createWebviewPanel.resetHistory();

            InteractiveERDPanel.createOrShow('/ext');
            assert.ok(vsMock.window.createWebviewPanel.notCalled);
            assert.ok(panelKit.panel.reveal.calledOnce);
        });

        test('sets correct webview options (enableScripts, localResourceRoots, retainContextWhenHidden)', () => {
            InteractiveERDPanel.createOrShow('/ext');
            const createCall = vsMock.window.createWebviewPanel.firstCall;
            const options = createCall.args[3];
            assert.strictEqual(options.enableScripts, true);
            assert.ok(Array.isArray(options.localResourceRoots));
            assert.strictEqual(options.retainContextWhenHidden, true);
        });
    });

    // ── _update() (via constructor) ─────────────────────────────────────

    suite('_update() (via constructor)', () => {
        test('reads interactive_erd.html from resources', () => {
            InteractiveERDPanel.createOrShow('/ext');
            assert.ok(fsStub.readFileSync.called);
            const readPath = fsStub.readFileSync.firstCall.args[0] as string;
            assert.ok(readPath.includes('interactive_erd.html'));
        });

        test('replaces script src attributes for all 5 JS files', () => {
            InteractiveERDPanel.createOrShow('/ext');
            const html = panelKit.webview.html;
            // Original script tags should be replaced
            assert.ok(!html.includes('src="/resources/interactive_erd.js"'));
            assert.ok(!html.includes('src="/resources/usage_erd.js"'));
            assert.ok(!html.includes('src="/resources/generate_erd.js"'));
            assert.ok(!html.includes('src="/resources/pluralize.js"'));
            assert.ok(!html.includes('src="/resources/icons.js"'));
            // Should contain webview URIs
            assert.ok(html.includes('webview-uri'));
        });

        test('posts loadEntitiesList message with entities path from EntityManager', () => {
            InteractiveERDPanel.createOrShow('/ext');
            assert.ok(panelKit.webview.postMessage.called);
            const firstMsg = panelKit.webview.postMessage.firstCall.args[0];
            assert.strictEqual(firstMsg.command, 'loadEntitiesList');
            assert.strictEqual(firstMsg.entitiesListPath, 'resources/entities.json');
        });
    });

    // ── Message handling ────────────────────────────────────────────────

    suite('Message handling', () => {
        test('entityClicked → calls showInformationMessage with entity name', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            await panelKit.fireMessage({ command: 'entityClicked', entity: { name: 'User' } });
            assert.ok(vsMock.window.showInformationMessage.calledOnce);
            assert.ok(
                (vsMock.window.showInformationMessage.firstCall.args[0] as string).includes('User')
            );
        });

        test('saveEntity → calls EntityManager.updateEntity() and posts updateEntity message', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            const entity = { id: '1', name: 'User', description: 'updated' };
            const oldEntity = { id: '1', name: 'User', description: 'old' };
            panelKit.webview.postMessage.resetHistory();

            await panelKit.fireMessage({ command: 'saveEntity', entity, oldEntity });

            assert.ok(emMock.mgr.updateEntity.calledOnce);
            assert.deepStrictEqual(emMock.mgr.updateEntity.firstCall.args[0], entity);
            assert.deepStrictEqual(emMock.mgr.updateEntity.firstCall.args[1], oldEntity);
            // Should post updateEntity message to webview
            const updateMsg = panelKit.webview.postMessage.args.find(
                (a: any[]) => a[0].command === 'updateEntity'
            );
            assert.ok(updateMsg, 'should post updateEntity message');
            assert.deepStrictEqual(updateMsg![0].entity, entity);
        });

        test('createSVG → calls showSaveDialog, writes SVG content with width/height', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            const saveUri = { fsPath: '/tmp/test.svg' };
            vsMock.window.showSaveDialog.resolves(saveUri);

            await panelKit.fireMessage({ command: 'createSVG', svgContent: '<svg id="erd"></svg>' });

            assert.ok(vsMock.window.showSaveDialog.calledOnce);
            assert.ok(fsStub.writeFileSync.calledOnce);
            const written = fsStub.writeFileSync.firstCall.args[1] as string;
            assert.ok(written.includes('width="1000"'));
            assert.ok(written.includes('height="1000"'));
        });

        test('saveSVG → writes to previously saved URI without showing dialog', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            // First, create an SVG to set _place
            const saveUri = { fsPath: '/tmp/saved.svg' };
            vsMock.window.showSaveDialog.resolves(saveUri);
            await panelKit.fireMessage({ command: 'createSVG', svgContent: '<svg id="x"></svg>' });

            // Now saveSVG should reuse the place
            fsStub.writeFileSync.resetHistory();
            vsMock.window.showSaveDialog.resetHistory();
            await panelKit.fireMessage({ command: 'saveSVG', svgContent: '<svg id="y"></svg>' });

            assert.ok(vsMock.window.showSaveDialog.notCalled, 'should not show save dialog again');
            assert.ok(fsStub.writeFileSync.calledOnce);
            assert.strictEqual(fsStub.writeFileSync.firstCall.args[0], '/tmp/saved.svg');
        });

        test('exportInteractiveHtml → calls HtmlExporter.createExportData and exportToHtml', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            await panelKit.fireMessage({
                command: 'exportInteractiveHtml',
                svgContent: '<svg></svg>',
                title: 'My ERD',
            });

            assert.ok(htmlExporterMock.HtmlExporter.createExportData.calledOnce);
            assert.strictEqual(htmlExporterMock.HtmlExporter.createExportData.firstCall.args[0], '<svg></svg>');
            assert.strictEqual(htmlExporterMock.HtmlExporter.createExportData.firstCall.args[1], 'My ERD');
            assert.ok(htmlExporterMock.HtmlExporter.exportToHtml.calledOnce);
        });

        test('loadSVG → calls showOpenDialog, reads SVG file, posts loadSVGContent', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            const fileUri = { fsPath: '/tmp/loaded.svg' };
            vsMock.window.showOpenDialog.resolves([fileUri]);
            fsStub.readFileSync.withArgs('/tmp/loaded.svg', 'utf8').returns(
                '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><rect/></svg>'
            );
            panelKit.webview.postMessage.resetHistory();

            await panelKit.fireMessage({ command: 'loadSVG' });

            assert.ok(vsMock.window.showOpenDialog.calledOnce);
            const loadMsg = panelKit.webview.postMessage.args.find(
                (a: any[]) => a[0].command === 'loadSVGContent'
            );
            assert.ok(loadMsg, 'should post loadSVGContent');
            assert.ok(loadMsg![0].svgContent.includes('<rect/>'));
        });

        test('loadSVG → user cancels dialog → no file read', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            vsMock.window.showOpenDialog.resolves(undefined);
            panelKit.webview.postMessage.resetHistory();

            await panelKit.fireMessage({ command: 'loadSVG' });

            // readFileSync should only have been called for the initial HTML load, not for SVG
            const svgReads = fsStub.readFileSync.args.filter(
                (a: any[]) => typeof a[0] === 'string' && a[0].endsWith('.svg')
            );
            assert.strictEqual(svgReads.length, 0);
        });

        test('chooseJSON → calls ERDGenerationPanel.createOrShow', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            await panelKit.fireMessage({ command: 'chooseJSON' });
            assert.ok(erdGenCreateOrShow.calledOnce);
        });

        test('deleteEntity message → calls showInformationMessage', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            vsMock.window.showInformationMessage.resetHistory();
            await panelKit.fireMessage({ command: 'deleteEntity', entityId: 'User' });
            assert.ok(vsMock.window.showInformationMessage.calledOnce);
            assert.ok(
                (vsMock.window.showInformationMessage.firstCall.args[0] as string).includes('User')
            );
        });
    });

    // ── dispose() ───────────────────────────────────────────────────────

    suite('dispose()', () => {
        test('sets currentPanel to undefined', () => {
            InteractiveERDPanel.createOrShow('/ext');
            assert.ok(InteractiveERDPanel.currentPanel);
            InteractiveERDPanel.currentPanel.dispose();
            assert.strictEqual(InteractiveERDPanel.currentPanel, undefined);
        });

        test('calls _panel.dispose()', () => {
            InteractiveERDPanel.createOrShow('/ext');
            InteractiveERDPanel.currentPanel.dispose();
            assert.ok(panelKit.panel.dispose.called);
        });
    });

    // ── deleteEntity() (public method) ──────────────────────────────────

    suite('deleteEntity() (public method)', () => {
        test('posts deleteEntity message with entityName to webview', () => {
            InteractiveERDPanel.createOrShow('/ext');
            panelKit.webview.postMessage.resetHistory();
            InteractiveERDPanel.currentPanel.deleteEntity('Order');

            const msg = panelKit.webview.postMessage.args.find(
                (a: any[]) => a[0].command === 'deleteEntity'
            );
            assert.ok(msg, 'should post deleteEntity message');
            assert.strictEqual(msg![0].entityName, 'Order');
        });
    });

    // ── saveEntity() ────────────────────────────────────────────────────

    suite('saveEntity()', () => {
        test('updates entity via EntityManager and posts updateEntity to webview', async () => {
            InteractiveERDPanel.createOrShow('/ext');
            const entity = { id: '2', name: 'Order', description: 'An order' };
            const oldEntity = { id: '2', name: 'Order', description: 'Old' };
            panelKit.webview.postMessage.resetHistory();

            await panelKit.fireMessage({ command: 'saveEntity', entity, oldEntity });

            assert.ok(emMock.mgr.updateEntity.calledWith(entity, oldEntity));
            const updateMsg = panelKit.webview.postMessage.args.find(
                (a: any[]) => a[0].command === 'updateEntity'
            );
            assert.ok(updateMsg);
            assert.deepStrictEqual(updateMsg![0].entity, entity);
        });
    });

    // ── Path sync (onDidChangeEntitiesPath) ─────────────────────────────

    suite('Path sync', () => {
        test('subscribes to EntityManager.onDidChangeEntitiesPath', () => {
            InteractiveERDPanel.createOrShow('/ext');
            assert.ok(emMock.mgr.onDidChangeEntitiesPath.calledOnce,
                'should subscribe to onDidChangeEntitiesPath');
        });

        test('onDidChangeEntitiesPath → posts loadEntitiesList to webview', () => {
            InteractiveERDPanel.createOrShow('/ext');
            panelKit.webview.postMessage.resetHistory();

            const cb = emMock.pathChangeCallback();
            assert.ok(cb, 'path change callback should be captured');
            cb('/new/path/entities.json');

            const pathMsg = panelKit.webview.postMessage.args.find(
                (a: any[]) => a[0].command === 'loadEntitiesList'
            );
            assert.ok(pathMsg, 'should post loadEntitiesList message');
            assert.strictEqual(pathMsg![0].entitiesListPath, '/new/path/entities.json');
        });

        test('dispose cleans up without error', () => {
            InteractiveERDPanel.createOrShow('/ext');
            assert.doesNotThrow(() => {
                InteractiveERDPanel.currentPanel.dispose();
            });
        });
    });

    // ── chooseJSONFile (exported function) ──────────────────────────────

    suite('chooseJSONFile()', () => {
        test('posts loadEntities message with entities and parameters', () => {
            const { webview } = createMockWebview();
            const params = { maxEntities: 5, discoverLinkedEntities: true, entityName: 'User' };
            chooseJSONFile(webview, params);

            assert.ok(webview.postMessage.calledOnce);
            const msg = webview.postMessage.firstCall.args[0];
            assert.strictEqual(msg.command, 'loadEntities');
            assert.ok(Array.isArray(msg.entities));
            assert.deepStrictEqual(msg.parameters, params);
        });
    });
});
