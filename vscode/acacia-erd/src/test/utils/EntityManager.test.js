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
const path = __importStar(require("path"));
const sinon = __importStar(require("sinon"));
const proxyquire = require("proxyquire");
const testHelpers_1 = require("../testHelpers");
// ─── Shared mock factories ─────────────────────────────────────────────────
/** Sample entities for tests. */
const sampleEntities = [
    { id: '1', name: 'User', description: 'A user', columns: ['id', 'name'], linkedEntities: ['Order'] },
    { id: '2', name: 'Order', description: 'An order', columns: ['id', 'total'], linkedEntities: ['User'] },
];
function createFsStub(fileContents = JSON.stringify(sampleEntities)) {
    return {
        readFileSync: sinon.stub().returns(fileContents),
        writeFileSync: sinon.stub(),
        '@noCallThru': true,
    };
}
const MOCK_WORKSPACE = '/mock/workspace';
function createMockFileSystemWatcher() {
    return {
        onDidChange: sinon.stub(),
        onDidCreate: sinon.stub(),
        onDidDelete: sinon.stub(),
        dispose: sinon.stub(),
    };
}
function createVscodeStub() {
    const updateStub = sinon.stub().resolves();
    const mock = {
        workspace: {
            getConfiguration: sinon.stub().callsFake((_section) => ({
                get: sinon.stub().returns('resources/entities.json'),
                update: updateStub,
            })),
            workspaceFolders: [{ uri: { fsPath: MOCK_WORKSPACE } }],
            createFileSystemWatcher: sinon.stub().callsFake(() => createMockFileSystemWatcher()),
            onDidChangeConfiguration: sinon.stub().returns({ dispose: sinon.stub() }),
        },
        window: {
            showErrorMessage: sinon.stub(),
            showInformationMessage: sinon.stub(),
        },
        RelativePattern: class RelativePattern {
            base;
            pattern;
            constructor(base, pattern) {
                this.base = base;
                this.pattern = pattern;
            }
        },
        EventEmitter: class MockEventEmitter {
            listeners = [];
            get event() {
                return (listener) => {
                    this.listeners.push(listener);
                    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
                };
            }
            fire(data) {
                this.listeners.forEach(l => l(data));
            }
            dispose() {
                this.listeners = [];
            }
        },
        '@noCallThru': true,
    };
    return { mock, updateStub };
}
/**
 * Loads a fresh EntityManager class with injected mocks via proxyquire.
 * Returns the class itself (not an instance) so tests can call getInstance().
 */
function loadEntityManager(fsStub, vscodeMock) {
    const mod = proxyquire('../../utils/EntityManager', {
        'fs': fsStub,
        'vscode': vscodeMock,
    });
    return mod.EntityManager;
}
// ─── Tests ──────────────────────────────────────────────────────────────────
suite('EntityManager', () => {
    let fsStub;
    let vscodeKit;
    let EntityManager;
    setup(() => {
        (0, testHelpers_1.resetSingletons)();
        fsStub = createFsStub();
        vscodeKit = createVscodeStub();
        EntityManager = loadEntityManager(fsStub, vscodeKit.mock);
    });
    teardown(() => {
        (0, testHelpers_1.resetSingletons)();
        sinon.restore();
    });
    // ── 1. Constructor & Singleton ──────────────────────────────────────
    suite('Constructor & Singleton', () => {
        test('getInstance() returns the same instance on repeated calls', () => {
            const a = EntityManager.getInstance();
            const b = EntityManager.getInstance();
            assert.strictEqual(a, b);
        });
        test('constructor reads config for entitiesJsonPath', () => {
            EntityManager.getInstance();
            assert.ok(vscodeKit.mock.workspace.getConfiguration.calledWith('acacia-erd'));
        });
        test('constructor resolves relative path against workspace folder', () => {
            EntityManager.getInstance();
            assert.ok(fsStub.readFileSync.calledOnce);
            const calledPath = fsStub.readFileSync.firstCall.args[0];
            const expectedPath = path.resolve(MOCK_WORKSPACE, 'resources/entities.json');
            assert.ok(calledPath === expectedPath, `Expected workspace-resolved path ${expectedPath}, got: ${calledPath}`);
        });
        test('constructor sets up file watcher', () => {
            EntityManager.getInstance();
            assert.ok(vscodeKit.mock.workspace.createFileSystemWatcher.calledOnce);
        });
        test('constructor sets up config change listener', () => {
            EntityManager.getInstance();
            assert.ok(vscodeKit.mock.workspace.onDidChangeConfiguration.calledOnce);
        });
    });
    // ── 2. loadEntities() ───────────────────────────────────────────────
    suite('loadEntities()', () => {
        test('successfully loads and parses a valid JSON array', () => {
            const mgr = EntityManager.getInstance();
            const entities = mgr.getEntities();
            assert.strictEqual(entities.length, 2);
            assert.strictEqual(entities[0].name, 'User');
            assert.strictEqual(entities[1].name, 'Order');
        });
        test('handles empty file gracefully — sets entities to []', () => {
            const emptyFs = createFsStub();
            emptyFs.readFileSync.throws(new SyntaxError('Unexpected end of JSON input'));
            const EM = loadEntityManager(emptyFs, vscodeKit.mock);
            const mgr = EM.getInstance();
            assert.deepStrictEqual(mgr.getEntities(), []);
            // Should NOT show error message for empty file
            assert.ok(vscodeKit.mock.window.showErrorMessage.notCalled);
        });
        test('handles missing file — sets entities to [], shows error message', () => {
            const badFs = createFsStub();
            const err = new Error('ENOENT: no such file or directory');
            badFs.readFileSync.throws(err);
            const EM = loadEntityManager(badFs, vscodeKit.mock);
            const mgr = EM.getInstance();
            assert.deepStrictEqual(mgr.getEntities(), []);
            assert.ok(vscodeKit.mock.window.showErrorMessage.calledOnce);
            assert.ok(vscodeKit.mock.window.showErrorMessage.firstCall.args[0]
                .includes('ENOENT'));
        });
        test('handles invalid JSON — sets entities to [], shows error message', () => {
            const badFs = createFsStub();
            badFs.readFileSync.returns('{not valid json');
            // JSON.parse will throw, which loadEntities catches
            // We need readFileSync to return invalid JSON, but the real JSON.parse runs
            // So let's use a fresh stub that returns bad content
            const EM = loadEntityManager(badFs, vscodeKit.mock);
            const mgr = EM.getInstance();
            assert.deepStrictEqual(mgr.getEntities(), []);
            assert.ok(vscodeKit.mock.window.showErrorMessage.calledOnce);
        });
    });
    // ── 3. getEntities() / getEntity() / setEntity() ────────────────────
    suite('getEntities() / getEntity() / setEntity()', () => {
        test('getEntities() returns loaded entities array', () => {
            const mgr = EntityManager.getInstance();
            const entities = mgr.getEntities();
            assert.ok(Array.isArray(entities));
            assert.strictEqual(entities.length, 2);
        });
        test('getEntity() returns undefined initially', () => {
            const mgr = EntityManager.getInstance();
            assert.strictEqual(mgr.getEntity(), undefined);
        });
        test('setEntity() stores entity, getEntity() returns it', () => {
            const mgr = EntityManager.getInstance();
            const entity = { id: '99', name: 'Test', description: 'desc' };
            mgr.setEntity(entity);
            assert.deepStrictEqual(mgr.getEntity(), entity);
        });
        test('setEntity(undefined) clears the stored entity', () => {
            const mgr = EntityManager.getInstance();
            mgr.setEntity({ id: '1', name: 'X' });
            mgr.setEntity(undefined);
            assert.strictEqual(mgr.getEntity(), undefined);
        });
    });
    // ── 4. getEntityByName() ────────────────────────────────────────────
    suite('getEntityByName()', () => {
        test('returns entity when found', () => {
            const mgr = EntityManager.getInstance();
            const entity = mgr.getEntityByName('User');
            assert.strictEqual(entity.name, 'User');
            assert.strictEqual(entity.id, '1');
        });
        test('throws Error with descriptive message when not found', () => {
            const mgr = EntityManager.getInstance();
            assert.throws(() => mgr.getEntityByName('NonExistent'), (err) => {
                assert.ok(err.message.includes('NonExistent'));
                return true;
            });
        });
    });
    // ── 5. addEntity() ──────────────────────────────────────────────────
    suite('addEntity()', () => {
        test('adds entity and persists to file', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            mgr.addEntity({ id: '3', name: 'Product', description: 'A product', columns: ['id'], linkedEntities: [] });
            assert.strictEqual(mgr.getEntities().length, 3);
            assert.ok(fsStub.writeFileSync.calledOnce);
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            assert.strictEqual(writtenJson.length, 3);
            assert.strictEqual(writtenJson[2].name, 'Product');
        });
        test('refuses duplicate entity name — shows error, does NOT save', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            mgr.addEntity({ id: '3', name: 'User' }); // 'User' already exists
            assert.ok(vscodeKit.mock.window.showErrorMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            assert.strictEqual(mgr.getEntities().length, 2); // unchanged
        });
        test('refuses empty entity name — shows error, does NOT save', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            mgr.addEntity({ id: '3', name: '' });
            assert.ok(vscodeKit.mock.window.showErrorMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
        });
        test('only stores Entity type fields', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            mgr.addEntity({
                id: '3',
                name: 'Widget',
                description: 'A widget',
                columns: ['a'],
                linkedEntities: ['b'],
                extraField: 'should be ignored',
                anotherExtra: 42,
            });
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            const added = writtenJson.find((e) => e.name === 'Widget');
            assert.ok(added);
            assert.strictEqual(added.extraField, undefined);
            assert.strictEqual(added.anotherExtra, undefined);
            // Valid fields should be present
            assert.strictEqual(added.id, '3');
            assert.strictEqual(added.description, 'A widget');
        });
        test('calls notifyChange() after successful add', () => {
            const mgr = EntityManager.getInstance();
            const changeSpy = sinon.spy();
            mgr.onDidChangeEntities(changeSpy);
            mgr.addEntity({ id: '4', name: 'Category', description: '', columns: [], linkedEntities: [] });
            assert.ok(changeSpy.called);
        });
    });
    // ── 6. updateEntity() ───────────────────────────────────────────────
    suite('updateEntity()', () => {
        test('updates existing entity fields and saves', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            const oldEntity = { name: 'User' };
            const updatedEntity = { name: 'User', description: 'Updated desc', columns: ['id', 'email'], linkedEntities: ['Order', 'Profile'] };
            mgr.updateEntity(updatedEntity, oldEntity);
            assert.ok(fsStub.writeFileSync.calledOnce);
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            const user = writtenJson.find((e) => e.name === 'User');
            assert.strictEqual(user.description, 'Updated desc');
            assert.deepStrictEqual(user.columns, ['id', 'email']);
            assert.deepStrictEqual(user.linkedEntities, ['Order', 'Profile']);
        });
        test('handles entity rename — old name replaced with new name', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            const oldEntity = { name: 'User' };
            const updatedEntity = { name: 'Person', description: 'Renamed', columns: ['id'], linkedEntities: [] };
            mgr.updateEntity(updatedEntity, oldEntity);
            assert.ok(fsStub.writeFileSync.calledOnce);
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            assert.ok(writtenJson.find((e) => e.name === 'Person'));
            assert.ok(!writtenJson.find((e) => e.name === 'User'));
        });
        test('if old entity not found during rename, delegates to addEntity()', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            const oldEntity = { name: 'NonExistent' };
            const updatedEntity = { id: '10', name: 'Brand', description: '', columns: [], linkedEntities: [] };
            mgr.updateEntity(updatedEntity, oldEntity);
            // Should have been added via addEntity
            assert.ok(fsStub.writeFileSync.calledOnce);
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            assert.ok(writtenJson.find((e) => e.name === 'Brand'));
        });
        test('if updated entity not found (same name), delegates to addEntity()', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            // Same name for old and updated but that name doesn't exist
            const oldEntity = { name: 'Ghost' };
            const updatedEntity = { id: '11', name: 'Ghost', description: 'new', columns: [], linkedEntities: [] };
            mgr.updateEntity(updatedEntity, oldEntity);
            // Since 'Ghost' is not found in entities, addEntity should be called
            assert.ok(fsStub.writeFileSync.calledOnce);
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            assert.ok(writtenJson.find((e) => e.name === 'Ghost'));
        });
        test('calls notifyChange() after successful update', () => {
            const mgr = EntityManager.getInstance();
            const changeSpy = sinon.spy();
            mgr.onDidChangeEntities(changeSpy);
            mgr.updateEntity({ name: 'User', description: 'changed', columns: [], linkedEntities: [] }, { name: 'User' });
            assert.ok(changeSpy.called);
        });
    });
    // ── 7. deleteEntity() ───────────────────────────────────────────────
    suite('deleteEntity()', () => {
        test('removes entity by name and saves', () => {
            const mgr = EntityManager.getInstance();
            fsStub.writeFileSync.resetHistory();
            mgr.deleteEntity('User');
            assert.ok(fsStub.writeFileSync.calledOnce);
            const writtenJson = JSON.parse(fsStub.writeFileSync.firstCall.args[1]);
            assert.strictEqual(writtenJson.length, 1);
            assert.ok(!writtenJson.find((e) => e.name === 'User'));
        });
        test('entity is gone from getEntities() after deletion', () => {
            const mgr = EntityManager.getInstance();
            mgr.deleteEntity('Order');
            const remaining = mgr.getEntities();
            assert.ok(!remaining.find((e) => e.name === 'Order'));
        });
        test('calls notifyChange() after successful delete', () => {
            const mgr = EntityManager.getInstance();
            const changeSpy = sinon.spy();
            mgr.onDidChangeEntities(changeSpy);
            mgr.deleteEntity('User');
            assert.ok(changeSpy.calledOnce);
        });
    });
    // ── 8. notifyChange() ───────────────────────────────────────────────
    suite('notifyChange()', () => {
        test('fires onDidChangeEntities event with current entities', () => {
            const mgr = EntityManager.getInstance();
            const changeSpy = sinon.spy();
            mgr.onDidChangeEntities(changeSpy);
            mgr.notifyChange();
            assert.ok(changeSpy.calledOnce);
            const entities = changeSpy.firstCall.args[0];
            assert.ok(Array.isArray(entities));
            assert.strictEqual(entities.length, 2);
        });
        test('multiple subscribers all receive the event', () => {
            const mgr = EntityManager.getInstance();
            const spy1 = sinon.spy();
            const spy2 = sinon.spy();
            mgr.onDidChangeEntities(spy1);
            mgr.onDidChangeEntities(spy2);
            mgr.notifyChange();
            assert.ok(spy1.calledOnce);
            assert.ok(spy2.calledOnce);
        });
        test('disposed listener does not receive events', () => {
            const mgr = EntityManager.getInstance();
            const listener = sinon.stub();
            const subscription = mgr.onDidChangeEntities(listener);
            subscription.dispose();
            mgr.notifyChange();
            assert.ok(listener.notCalled);
        });
        test('when no subscribers, does not throw', () => {
            const mgr = EntityManager.getInstance();
            assert.doesNotThrow(() => mgr.notifyChange());
        });
    });
    // ── 9. setEntitiesJsonPath() ────────────────────────────────────────
    suite('setEntitiesJsonPath()', () => {
        test('calls vscode.workspace.getConfiguration().update() with new path', () => {
            const mgr = EntityManager.getInstance();
            mgr.setEntitiesJsonPath('/new/path/entities.json');
            // getConfiguration() is called (with no args for the update call)
            assert.ok(vscodeKit.mock.workspace.getConfiguration.called);
            const configObj = vscodeKit.mock.workspace.getConfiguration.returnValues[vscodeKit.mock.workspace.getConfiguration.callCount - 1];
            assert.ok(configObj.update.calledWith('acacia-erd.entitiesJsonPath', '/new/path/entities.json', false));
        });
        test('after update resolves: reloads entities and calls notifyChange', async () => {
            const mgr = EntityManager.getInstance();
            const changeSpy = sinon.spy();
            mgr.onDidChangeEntities(changeSpy);
            fsStub.readFileSync.resetHistory();
            mgr.setEntitiesJsonPath('/new/path.json');
            // The update().then() is async — wait a tick for the promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));
            // After the promise resolves, readFileSync should be called again (reload)
            assert.ok(fsStub.readFileSync.called);
            // And the path should be updated
            assert.strictEqual(mgr.getEntitiesJsonPath(), '/new/path.json');
            // notifyChange should have been called
            assert.ok(changeSpy.called);
        });
        test('stores workspace-relative path when file is inside workspace', async () => {
            const mgr = EntityManager.getInstance();
            mgr.setEntitiesJsonPath(path.resolve(MOCK_WORKSPACE, 'data/entities.json'));
            await new Promise(resolve => setTimeout(resolve, 10));
            const configObj = vscodeKit.mock.workspace.getConfiguration.returnValues[vscodeKit.mock.workspace.getConfiguration.callCount - 1];
            const storedPath = configObj.update.firstCall.args[1];
            assert.ok(!path.isAbsolute(storedPath), `Expected relative path, got: ${storedPath}`);
        });
        test('stores absolute path when file is outside workspace', async () => {
            const mgr = EntityManager.getInstance();
            mgr.setEntitiesJsonPath('/other/location/entities.json');
            await new Promise(resolve => setTimeout(resolve, 10));
            const configObj = vscodeKit.mock.workspace.getConfiguration.returnValues[vscodeKit.mock.workspace.getConfiguration.callCount - 1];
            const storedPath = configObj.update.firstCall.args[1];
            assert.strictEqual(storedPath, '/other/location/entities.json');
        });
        test('fires onDidChangeEntitiesPath event', async () => {
            const mgr = EntityManager.getInstance();
            const listener = sinon.stub();
            mgr.onDidChangeEntitiesPath(listener);
            mgr.setEntitiesJsonPath('/new/path.json');
            await new Promise(resolve => setTimeout(resolve, 10));
            assert.ok(listener.calledOnce);
        });
        test('re-creates file watcher after path change', async () => {
            const mgr = EntityManager.getInstance();
            const initialCallCount = vscodeKit.mock.workspace.createFileSystemWatcher.callCount;
            mgr.setEntitiesJsonPath('/new/path.json');
            await new Promise(resolve => setTimeout(resolve, 10));
            assert.ok(vscodeKit.mock.workspace.createFileSystemWatcher.callCount > initialCallCount, 'Expected file watcher to be re-created');
        });
    });
    // ── 10. dispose() ───────────────────────────────────────────────────
    suite('dispose()', () => {
        test('disposes file watcher', () => {
            const mgr = EntityManager.getInstance();
            const watcher = vscodeKit.mock.workspace.createFileSystemWatcher.returnValues[0];
            mgr.dispose();
            assert.ok(watcher.dispose.called);
        });
        test('can be called multiple times without error', () => {
            const mgr = EntityManager.getInstance();
            assert.doesNotThrow(() => {
                mgr.dispose();
                mgr.dispose();
            });
        });
    });
    // ── 11. File Watcher ────────────────────────────────────────────────
    suite('File Watcher', () => {
        test('clears entities when file is deleted', () => {
            const mgr = EntityManager.getInstance();
            assert.strictEqual(mgr.getEntities().length, 2);
            const watcher = vscodeKit.mock.workspace.createFileSystemWatcher.returnValues[0];
            const onDidDeleteCallback = watcher.onDidDelete.firstCall.args[0];
            onDidDeleteCallback();
            assert.strictEqual(mgr.getEntities().length, 0);
        });
        test('fires notifyChange when file is deleted', () => {
            const mgr = EntityManager.getInstance();
            const changeSpy = sinon.spy();
            mgr.onDidChangeEntities(changeSpy);
            const watcher = vscodeKit.mock.workspace.createFileSystemWatcher.returnValues[0];
            const onDidDeleteCallback = watcher.onDidDelete.firstCall.args[0];
            onDidDeleteCallback();
            assert.ok(changeSpy.calledOnce);
        });
        test('reloads entities when file changes externally (after debounce)', async () => {
            EntityManager.getInstance();
            fsStub.readFileSync.resetHistory();
            const watcher = vscodeKit.mock.workspace.createFileSystemWatcher.returnValues[0];
            const onDidChangeCallback = watcher.onDidChange.firstCall.args[0];
            onDidChangeCallback();
            // Before debounce timeout, no reload
            assert.ok(fsStub.readFileSync.notCalled);
            // Wait for debounce (300ms + buffer)
            await new Promise(resolve => setTimeout(resolve, 350));
            assert.ok(fsStub.readFileSync.calledOnce);
        });
        test('reloads entities when file is created (after debounce)', async () => {
            EntityManager.getInstance();
            fsStub.readFileSync.resetHistory();
            const watcher = vscodeKit.mock.workspace.createFileSystemWatcher.returnValues[0];
            const onDidCreateCallback = watcher.onDidCreate.firstCall.args[0];
            onDidCreateCallback();
            await new Promise(resolve => setTimeout(resolve, 350));
            assert.ok(fsStub.readFileSync.calledOnce);
        });
        test('debounce collapses multiple rapid changes into one reload', async () => {
            EntityManager.getInstance();
            fsStub.readFileSync.resetHistory();
            const watcher = vscodeKit.mock.workspace.createFileSystemWatcher.returnValues[0];
            const onDidChangeCallback = watcher.onDidChange.firstCall.args[0];
            // Fire multiple changes rapidly
            onDidChangeCallback();
            onDidChangeCallback();
            onDidChangeCallback();
            await new Promise(resolve => setTimeout(resolve, 350));
            // Should only reload once due to debounce
            assert.strictEqual(fsStub.readFileSync.callCount, 1);
        });
    });
});
//# sourceMappingURL=EntityManager.test.js.map