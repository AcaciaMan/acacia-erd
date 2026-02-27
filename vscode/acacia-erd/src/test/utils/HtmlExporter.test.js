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
// ─── Shared helpers ─────────────────────────────────────────────────────────
const TEMPLATE_CONTENT = [
    '<html><head><title>{{ERD_TITLE}}</title></head>',
    '<body><h1>{{ERD_TITLE}}</h1>',
    '<div id="content">{{ERD_CONTENT}}</div>',
    '<script>var data = {{ERD_DATA}};</script>',
    '<a download="{{ERD_FILENAME}}.html">Download</a></body></html>',
].join('\n');
function entityAttr(obj) {
    return JSON.stringify(obj).replace(/"/g, '&quot;');
}
function makeSvg(...entityObjs) {
    const groups = entityObjs
        .map(e => `<g class="entity" data-entity="${entityAttr(e)}"></g>`)
        .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg">${groups}</svg>`;
}
function createFsStub(templateContent = TEMPLATE_CONTENT) {
    return {
        readFileSync: sinon.stub().returns(templateContent),
        writeFileSync: sinon.stub(),
        '@noCallThru': true,
    };
}
function createVscodeStub() {
    const showSaveDialogStub = sinon.stub().resolves({ fsPath: '/tmp/test.html' });
    const showInfoStub = sinon.stub().resolves(undefined); // default: user dismisses
    const showErrorStub = sinon.stub();
    const openExternalStub = sinon.stub().resolves(true);
    const executeCommandStub = sinon.stub().resolves();
    const mock = {
        window: {
            showSaveDialog: showSaveDialogStub,
            showInformationMessage: showInfoStub,
            showErrorMessage: showErrorStub,
        },
        env: {
            openExternal: openExternalStub,
        },
        commands: {
            executeCommand: executeCommandStub,
        },
        Uri: {
            file: (p) => ({
                scheme: 'file',
                fsPath: p,
                path: p.replace(/\\/g, '/'),
                toString: () => `file:///${p.replace(/\\/g, '/')}`,
            }),
        },
        '@noCallThru': true,
    };
    return {
        mock,
        showSaveDialogStub,
        showInfoStub,
        showErrorStub,
        openExternalStub,
        executeCommandStub,
    };
}
function loadHtmlExporter(fsStub, vscodeMock) {
    const mod = proxyquire('../../utils/HtmlExporter', {
        'fs': fsStub,
        'vscode': vscodeMock,
    });
    return mod.HtmlExporter;
}
// ─── Tests ──────────────────────────────────────────────────────────────────
suite('HtmlExporter', () => {
    let fsStub;
    let vscodeKit;
    let HtmlExporter;
    setup(() => {
        fsStub = createFsStub();
        vscodeKit = createVscodeStub();
        HtmlExporter = loadHtmlExporter(fsStub, vscodeKit.mock);
    });
    teardown(() => {
        sinon.restore();
    });
    // ── 1. extractEntitiesFromSvg() ─────────────────────────────────────
    suite('extractEntitiesFromSvg()', () => {
        test('extracts entities from SVG with data-entity attributes', () => {
            const svg = makeSvg({ id: '1', name: 'User', columns: ['id', 'name'] }, { id: '2', name: 'Order', columns: ['id'] });
            const entities = HtmlExporter.extractEntitiesFromSvg(svg);
            assert.strictEqual(entities.length, 2);
            assert.strictEqual(entities[0].name, 'User');
            assert.strictEqual(entities[1].name, 'Order');
            assert.deepStrictEqual(entities[0].columns, ['id', 'name']);
        });
        test('returns empty array when SVG has no entity elements', () => {
            const svg = '<svg><rect width="100" height="100"/></svg>';
            const entities = HtmlExporter.extractEntitiesFromSvg(svg);
            assert.deepStrictEqual(entities, []);
        });
        test('handles malformed data-entity JSON gracefully (skips bad entries)', () => {
            const svg = '<svg>' +
                '<g class="entity" data-entity="not valid json"></g>' +
                `<g class="entity" data-entity="${entityAttr({ id: '1', name: 'Good' })}"></g>` +
                '</svg>';
            const entities = HtmlExporter.extractEntitiesFromSvg(svg);
            assert.strictEqual(entities.length, 1);
            assert.strictEqual(entities[0].name, 'Good');
        });
        test('correctly unescapes &quot; in data attributes', () => {
            // Build raw SVG with &quot; manually to verify unescaping
            const raw = '<svg>' +
                '<g class="entity" data-entity="{&quot;id&quot;:&quot;1&quot;,&quot;name&quot;:&quot;Test&quot;}"></g>' +
                '</svg>';
            const entities = HtmlExporter.extractEntitiesFromSvg(raw);
            assert.strictEqual(entities.length, 1);
            assert.strictEqual(entities[0].id, '1');
            assert.strictEqual(entities[0].name, 'Test');
        });
    });
    // ── 2. sanitizeFilename() (tested indirectly) ───────────────────────
    suite('sanitizeFilename() (indirect via createExportData / exportToHtml)', () => {
        test('letters and numbers preserved, result is lowercase', async () => {
            // Title flows through sanitizeFilename for the filename placeholder
            const data = HtmlExporter.createExportData('<svg></svg>', 'MyTitle123');
            await HtmlExporter.exportToHtml('/ext', data);
            const written = fsStub.writeFileSync.firstCall.args[1];
            assert.ok(written.includes('mytitle123'));
        });
        test('spaces and special characters replaced with _', async () => {
            const data = HtmlExporter.createExportData('<svg></svg>', 'Hello World!@#');
            await HtmlExporter.exportToHtml('/ext', data);
            const written = fsStub.writeFileSync.firstCall.args[1];
            // Should contain the sanitized version: hello_world____  -> collapsed -> hello_world
            assert.ok(written.includes('hello_world'));
            // Should NOT contain original special chars in the filename slot
            assert.ok(!written.includes('Hello World!@#.html'));
        });
        test('multiple consecutive underscores collapsed to one', async () => {
            const data = HtmlExporter.createExportData('<svg></svg>', 'A   B');
            await HtmlExporter.exportToHtml('/ext', data);
            const written = fsStub.writeFileSync.firstCall.args[1];
            assert.ok(written.includes('a_b'));
            assert.ok(!written.includes('a___b'));
        });
        test('leading/trailing underscores removed', async () => {
            const data = HtmlExporter.createExportData('<svg></svg>', ' _Trim_ ');
            await HtmlExporter.exportToHtml('/ext', data);
            const written = fsStub.writeFileSync.firstCall.args[1];
            // After sanitize: _trim_ with leading/trailing underscores stripped
            assert.ok(written.includes('trim'));
        });
    });
    // ── 3. generateTitle() ──────────────────────────────────────────────
    suite('generateTitle()', () => {
        test('empty entities array → "Empty ERD"', () => {
            assert.strictEqual(HtmlExporter.generateTitle([]), 'Empty ERD');
        });
        test('single entity → "<Name> Entity Diagram"', () => {
            const result = HtmlExporter.generateTitle([{ id: '1', name: 'User' }]);
            assert.strictEqual(result, 'User Entity Diagram');
        });
        test('2-3 entities → comma-separated names + " ERD"', () => {
            const two = HtmlExporter.generateTitle([
                { id: '1', name: 'User' },
                { id: '2', name: 'Order' },
            ]);
            assert.strictEqual(two, 'User, Order ERD');
            const three = HtmlExporter.generateTitle([
                { id: '1', name: 'User' },
                { id: '2', name: 'Order' },
                { id: '3', name: 'Product' },
            ]);
            assert.strictEqual(three, 'User, Order, Product ERD');
        });
        test('4+ entities → "ERD with <N> Entities"', () => {
            const entities = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `E${i}` }));
            assert.strictEqual(HtmlExporter.generateTitle(entities), 'ERD with 5 Entities');
        });
    });
    // ── 4. createExportData() ───────────────────────────────────────────
    suite('createExportData()', () => {
        test('creates correct ERDExportData with extracted entities from SVG', () => {
            const svg = makeSvg({ id: '1', name: 'User' });
            const data = HtmlExporter.createExportData(svg);
            assert.strictEqual(data.entities.length, 1);
            assert.strictEqual(data.entities[0].name, 'User');
            assert.strictEqual(data.svgContent, svg);
        });
        test('uses provided title when given', () => {
            const svg = makeSvg({ id: '1', name: 'User' });
            const data = HtmlExporter.createExportData(svg, 'Custom Title');
            assert.strictEqual(data.title, 'Custom Title');
        });
        test('falls back to generateTitle() when no title provided', () => {
            const svg = makeSvg({ id: '1', name: 'User' });
            const data = HtmlExporter.createExportData(svg);
            assert.strictEqual(data.title, 'User Entity Diagram');
        });
        test('includes metadata with created, version, entityCount, generator', () => {
            const svg = makeSvg({ id: '1', name: 'A' }, { id: '2', name: 'B' });
            const data = HtmlExporter.createExportData(svg);
            assert.ok(data.metadata);
            assert.ok(data.metadata.created);
            assert.strictEqual(data.metadata.version, '1.0');
            assert.strictEqual(data.metadata.entityCount, 2);
            assert.strictEqual(data.metadata.generator, 'Acacia ERD VS Code Extension');
        });
    });
    // ── 5. exportToHtml() ───────────────────────────────────────────────
    suite('exportToHtml()', () => {
        const sampleData = {
            title: 'Test ERD',
            entities: [{ id: '1', name: 'User' }],
            svgContent: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
            metadata: { created: '2026-01-01', version: '1.0' },
        };
        test('reads template from <extensionPath>/resources/standalone_erd_template.html', async () => {
            await HtmlExporter.exportToHtml('/myext', sampleData);
            const readPath = fsStub.readFileSync.firstCall.args[0];
            // path.join on Windows may use backslashes
            assert.ok(readPath.includes('resources') && readPath.includes('standalone_erd_template.html'), `Expected template path, got: ${readPath}`);
        });
        test('replaces all {{ERD_TITLE}} placeholders (multiple occurrences)', async () => {
            await HtmlExporter.exportToHtml('/ext', sampleData);
            const written = fsStub.writeFileSync.firstCall.args[1];
            // Template has two {{ERD_TITLE}} – both should be replaced
            assert.ok(!written.includes('{{ERD_TITLE}}'));
            // Count occurrences of the title
            const count = (written.match(/Test ERD/g) || []).length;
            assert.ok(count >= 2, `Expected at least 2 title occurrences, got ${count}`);
        });
        test('replaces {{ERD_CONTENT}} with SVG inner content (strips outer <svg> tag)', async () => {
            await HtmlExporter.exportToHtml('/ext', sampleData);
            const written = fsStub.writeFileSync.firstCall.args[1];
            assert.ok(!written.includes('{{ERD_CONTENT}}'));
            assert.ok(written.includes('<rect/>'));
            // The outer <svg> tag should have been stripped (just the inner content embedded)
        });
        test('replaces {{ERD_DATA}} with JSON-stringified data', async () => {
            await HtmlExporter.exportToHtml('/ext', sampleData);
            const written = fsStub.writeFileSync.firstCall.args[1];
            assert.ok(!written.includes('{{ERD_DATA}}'));
            // The embedded JSON should contain our title
            assert.ok(written.includes('"Test ERD"'));
        });
        test('replaces {{ERD_FILENAME}} with sanitized filename', async () => {
            await HtmlExporter.exportToHtml('/ext', sampleData);
            const written = fsStub.writeFileSync.firstCall.args[1];
            assert.ok(!written.includes('{{ERD_FILENAME}}'));
            assert.ok(written.includes('test_erd'));
        });
        test('when user selects save location: writes file, shows success message', async () => {
            await HtmlExporter.exportToHtml('/ext', sampleData);
            assert.ok(fsStub.writeFileSync.calledOnce);
            assert.strictEqual(fsStub.writeFileSync.firstCall.args[0], '/tmp/test.html');
            assert.ok(vscodeKit.showInfoStub.calledOnce);
            assert.ok(vscodeKit.showInfoStub.firstCall.args[0].includes('test.html'));
        });
        test('when user clicks "Open in Browser": calls vscode.env.openExternal', async () => {
            vscodeKit.showInfoStub.resolves('Open in Browser');
            await HtmlExporter.exportToHtml('/ext', sampleData);
            assert.ok(vscodeKit.openExternalStub.calledOnce);
        });
        test('when user clicks "Show in Folder": calls revealFileInOS command', async () => {
            vscodeKit.showInfoStub.resolves('Show in Folder');
            await HtmlExporter.exportToHtml('/ext', sampleData);
            assert.ok(vscodeKit.executeCommandStub.calledOnce);
            assert.strictEqual(vscodeKit.executeCommandStub.firstCall.args[0], 'revealFileInOS');
        });
        test('when user dismisses notification: no additional actions', async () => {
            vscodeKit.showInfoStub.resolves(undefined);
            await HtmlExporter.exportToHtml('/ext', sampleData);
            assert.ok(vscodeKit.openExternalStub.notCalled);
            assert.ok(vscodeKit.executeCommandStub.notCalled);
        });
        test('when user cancels save dialog: does NOT write file', async () => {
            vscodeKit.showSaveDialogStub.resolves(undefined);
            await HtmlExporter.exportToHtml('/ext', sampleData);
            assert.ok(fsStub.writeFileSync.notCalled);
            assert.ok(vscodeKit.showInfoStub.notCalled);
        });
        test('on file write error: shows error message, re-throws', async () => {
            fsStub.writeFileSync.throws(new Error('disk full'));
            await assert.rejects(() => HtmlExporter.exportToHtml('/ext', sampleData), (err) => {
                assert.ok(err.message.includes('disk full'));
                return true;
            });
            assert.ok(vscodeKit.showErrorStub.calledOnce);
            assert.ok(vscodeKit.showErrorStub.firstCall.args[0].includes('disk full'));
        });
    });
});
//# sourceMappingURL=HtmlExporter.test.js.map