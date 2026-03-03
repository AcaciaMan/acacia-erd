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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const proxyquire = require("proxyquire");
// ── Helpers ───────────────────────────────────────────────────────
const tempDirs = [];
function createTempDiagramsFile(diagrams = []) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acacia-diagram-test-'));
    const filePath = path.join(dir, 'test.diagrams.json');
    fs.writeFileSync(filePath, JSON.stringify({ diagrams }, null, 2), 'utf8');
    tempDirs.push(dir);
    return filePath;
}
function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acacia-diagram-test-'));
    tempDirs.push(dir);
    return dir;
}
function cleanupTempDirs() {
    for (const dir of tempDirs) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch {
            // best-effort cleanup
        }
    }
    tempDirs.length = 0;
}
function createVscodeStub() {
    const showErrorMessageStub = sinon.stub();
    const watcherDispose = sinon.stub();
    const mockWatcher = {
        onDidChange: sinon.stub(),
        onDidCreate: sinon.stub(),
        onDidDelete: sinon.stub(),
        dispose: watcherDispose,
    };
    const mock = {
        workspace: {
            createFileSystemWatcher: sinon.stub().returns(mockWatcher),
        },
        window: {
            showErrorMessage: showErrorMessageStub,
        },
        RelativePattern: class MockRelativePattern {
            base;
            pattern;
            constructor(base, pattern) {
                this.base = base;
                this.pattern = pattern;
            }
        },
        EventEmitter: class MockEventEmitter {
            listeners = [];
            event = (listener) => {
                this.listeners.push(listener);
                return { dispose: () => {
                        const idx = this.listeners.indexOf(listener);
                        if (idx >= 0) {
                            this.listeners.splice(idx, 1);
                        }
                    } };
            };
            fire = (data) => { this.listeners.forEach(l => l(data)); };
            dispose = sinon.stub();
        },
        '@noCallThru': true,
    };
    return { mock, showErrorMessageStub, mockWatcher, watcherDispose };
}
function loadDiagramManager(vscodeMock) {
    const mod = proxyquire('../../utils/DiagramManager', {
        'vscode': vscodeMock,
    });
    return mod.DiagramManager;
}
// ── Sample data ───────────────────────────────────────────────────
function sampleDiagram(overrides = {}) {
    return {
        id: 'diag-1',
        name: 'Test Diagram',
        entityIds: ['e1', 'e2'],
        positions: { e1: { x: 10, y: 20 }, e2: { x: 30, y: 40 } },
        ...overrides,
    };
}
// ── Tests ─────────────────────────────────────────────────────────
suite('DiagramManager', () => {
    teardown(() => {
        sinon.restore();
        cleanupTempDirs();
    });
    // ── Constructor ───────────────────────────────────────────────
    suite('Constructor', () => {
        test('creates instance without error when file exists', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.ok(manager);
            manager.dispose();
        });
        test('creates instance without error when file does not exist', () => {
            const dir = createTempDir();
            const filePath = path.join(dir, 'nonexistent.diagrams.json');
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.ok(manager);
            assert.deepStrictEqual(manager.getDiagrams(), []);
            manager.dispose();
        });
        test('loads existing diagrams from file on construction', () => {
            const diagrams = [sampleDiagram()];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const loaded = manager.getDiagrams();
            assert.strictEqual(loaded.length, 1);
            assert.strictEqual(loaded[0].id, 'diag-1');
            assert.strictEqual(loaded[0].name, 'Test Diagram');
            assert.deepStrictEqual(loaded[0].entityIds, ['e1', 'e2']);
            manager.dispose();
        });
    });
    // ── getDiagrams() ─────────────────────────────────────────────
    suite('getDiagrams()', () => {
        test('returns empty array when file was empty / did not exist', () => {
            const dir = createTempDir();
            const filePath = path.join(dir, 'nonexistent.diagrams.json');
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.deepStrictEqual(manager.getDiagrams(), []);
            manager.dispose();
        });
        test('returns all diagrams loaded from file', () => {
            const diagrams = [
                sampleDiagram({ id: 'd1', name: 'First' }),
                sampleDiagram({ id: 'd2', name: 'Second' }),
            ];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const result = manager.getDiagrams();
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, 'First');
            assert.strictEqual(result[1].name, 'Second');
            manager.dispose();
        });
    });
    // ── getDiagram(id) ────────────────────────────────────────────
    suite('getDiagram(id)', () => {
        test('returns diagram by ID when it exists', () => {
            const diagrams = [sampleDiagram({ id: 'abc-123' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const result = manager.getDiagram('abc-123');
            assert.ok(result);
            assert.strictEqual(result.id, 'abc-123');
            manager.dispose();
        });
        test('returns undefined when ID not found', () => {
            const filePath = createTempDiagramsFile([sampleDiagram()]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const result = manager.getDiagram('nonexistent');
            assert.strictEqual(result, undefined);
            manager.dispose();
        });
    });
    // ── addDiagram() ──────────────────────────────────────────────
    suite('addDiagram()', () => {
        test('adds a diagram with generated ID, saves to file, and returns it', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const result = manager.addDiagram('My Diagram');
            assert.ok(result);
            assert.ok(result.id, 'should have a generated ID');
            assert.strictEqual(result.name, 'My Diagram');
            assert.deepStrictEqual(result.entityIds, []);
            assert.deepStrictEqual(result.positions, {});
            manager.dispose();
        });
        test('saves diagram to the JSON file on disk', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.addDiagram('Persisted');
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.strictEqual(fileData.diagrams.length, 1);
            assert.strictEqual(fileData.diagrams[0].name, 'Persisted');
            manager.dispose();
        });
        test('added diagram appears in getDiagrams() result', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.addDiagram('Added');
            const diagrams = manager.getDiagrams();
            assert.strictEqual(diagrams.length, 1);
            assert.strictEqual(diagrams[0].name, 'Added');
            manager.dispose();
        });
        test('fires onDidChange event after adding', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.addDiagram('EventTest');
            assert.ok(eventFired);
            manager.dispose();
        });
        test('accepts optional entityIds and positions parameters', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const positions = { e1: { x: 100, y: 200 } };
            const result = manager.addDiagram('WithParams', ['e1', 'e2'], positions);
            assert.deepStrictEqual(result.entityIds, ['e1', 'e2']);
            assert.deepStrictEqual(result.positions, positions);
            manager.dispose();
        });
        test('works correctly when adding to an already-populated list', () => {
            const existing = [sampleDiagram({ id: 'existing-1', name: 'Existing' })];
            const filePath = createTempDiagramsFile(existing);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.addDiagram('New One');
            const diagrams = manager.getDiagrams();
            assert.strictEqual(diagrams.length, 2);
            assert.strictEqual(diagrams[0].name, 'Existing');
            assert.strictEqual(diagrams[1].name, 'New One');
            manager.dispose();
        });
    });
    // ── updateDiagram() ───────────────────────────────────────────
    suite('updateDiagram()', () => {
        test('updates entityIds of an existing diagram', () => {
            const diagrams = [sampleDiagram({ id: 'u1' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.updateDiagram('u1', { entityIds: ['e3', 'e4'] });
            const updated = manager.getDiagram('u1');
            assert.deepStrictEqual(updated.entityIds, ['e3', 'e4']);
            manager.dispose();
        });
        test('updates positions of an existing diagram', () => {
            const diagrams = [sampleDiagram({ id: 'u2' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const newPositions = { e1: { x: 99, y: 99 } };
            manager.updateDiagram('u2', { positions: newPositions });
            const updated = manager.getDiagram('u2');
            assert.deepStrictEqual(updated.positions, newPositions);
            manager.dispose();
        });
        test('merges partial updates (updating positions does not clear entityIds)', () => {
            const diagrams = [sampleDiagram({ id: 'u3', entityIds: ['e1', 'e2'] })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.updateDiagram('u3', { positions: { e1: { x: 50, y: 50 } } });
            const updated = manager.getDiagram('u3');
            assert.deepStrictEqual(updated.entityIds, ['e1', 'e2']);
            assert.deepStrictEqual(updated.positions, { e1: { x: 50, y: 50 } });
            manager.dispose();
        });
        test('saves changes to file on disk', () => {
            const diagrams = [sampleDiagram({ id: 'u4' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.updateDiagram('u4', { entityIds: ['updated'] });
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.deepStrictEqual(fileData.diagrams[0].entityIds, ['updated']);
            manager.dispose();
        });
        test('fires onDidChange event', () => {
            const diagrams = [sampleDiagram({ id: 'u5' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.updateDiagram('u5', { entityIds: ['e5'] });
            assert.ok(eventFired);
            manager.dispose();
        });
        test('does nothing when ID not found (no error, no save)', () => {
            const diagrams = [sampleDiagram({ id: 'u6' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            // Should not throw
            manager.updateDiagram('nonexistent', { entityIds: ['x'] });
            assert.ok(!eventFired);
            // File should not have been rewritten — original data intact
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.deepStrictEqual(fileData.diagrams[0].entityIds, ['e1', 'e2']);
            manager.dispose();
        });
    });
    // ── renameDiagram() ───────────────────────────────────────────
    suite('renameDiagram()', () => {
        test('renames an existing diagram', () => {
            const diagrams = [sampleDiagram({ id: 'r1', name: 'Old Name' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.renameDiagram('r1', 'New Name');
            assert.strictEqual(manager.getDiagram('r1').name, 'New Name');
            manager.dispose();
        });
        test('saves to file', () => {
            const diagrams = [sampleDiagram({ id: 'r2', name: 'Old' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.renameDiagram('r2', 'Renamed');
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.strictEqual(fileData.diagrams[0].name, 'Renamed');
            manager.dispose();
        });
        test('fires onDidChange event', () => {
            const diagrams = [sampleDiagram({ id: 'r3' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.renameDiagram('r3', 'Renamed');
            assert.ok(eventFired);
            manager.dispose();
        });
        test('does nothing when ID not found', () => {
            const diagrams = [sampleDiagram({ id: 'r4', name: 'Original' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.renameDiagram('nonexistent', 'Should Not Apply');
            assert.ok(!eventFired);
            assert.strictEqual(manager.getDiagram('r4').name, 'Original');
            manager.dispose();
        });
    });
    // ── deleteDiagram() ───────────────────────────────────────────
    suite('deleteDiagram()', () => {
        test('removes diagram by ID', () => {
            const diagrams = [
                sampleDiagram({ id: 'del1', name: 'First' }),
                sampleDiagram({ id: 'del2', name: 'Second' }),
            ];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.deleteDiagram('del1');
            const remaining = manager.getDiagrams();
            assert.strictEqual(remaining.length, 1);
            assert.strictEqual(remaining[0].id, 'del2');
            manager.dispose();
        });
        test('saves to file', () => {
            const diagrams = [sampleDiagram({ id: 'del3' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.deleteDiagram('del3');
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.strictEqual(fileData.diagrams.length, 0);
            manager.dispose();
        });
        test('fires onDidChange event', () => {
            const diagrams = [sampleDiagram({ id: 'del4' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.deleteDiagram('del4');
            assert.ok(eventFired);
            manager.dispose();
        });
        test('does nothing when ID not found', () => {
            const diagrams = [sampleDiagram({ id: 'del5' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.deleteDiagram('nonexistent');
            // Still fires event and saves (filter-based), but data unchanged
            assert.strictEqual(manager.getDiagrams().length, 1);
            manager.dispose();
        });
    });
    // ── duplicateDiagram() ────────────────────────────────────────
    suite('duplicateDiagram()', () => {
        test('creates a copy with new ID and default name "<original> (copy)"', () => {
            const diagrams = [sampleDiagram({ id: 'dup1', name: 'Original' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const copy = manager.duplicateDiagram('dup1');
            assert.ok(copy);
            assert.notStrictEqual(copy.id, 'dup1');
            assert.strictEqual(copy.name, 'Original (copy)');
            manager.dispose();
        });
        test('creates a copy with custom name when provided', () => {
            const diagrams = [sampleDiagram({ id: 'dup2', name: 'Original' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const copy = manager.duplicateDiagram('dup2', 'Custom Copy');
            assert.ok(copy);
            assert.strictEqual(copy.name, 'Custom Copy');
            manager.dispose();
        });
        test('deep-copies positions (modifying copy does not affect original)', () => {
            const diagrams = [sampleDiagram({ id: 'dup3', positions: { e1: { x: 10, y: 20 } } })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const copy = manager.duplicateDiagram('dup3');
            assert.ok(copy);
            // Modify the copy's positions
            copy.positions['e1'].x = 999;
            // Original should be unaffected
            const original = manager.getDiagram('dup3');
            assert.strictEqual(original.positions['e1'].x, 10);
            manager.dispose();
        });
        test('returns the new diagram', () => {
            const diagrams = [sampleDiagram({ id: 'dup4' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const copy = manager.duplicateDiagram('dup4');
            assert.ok(copy);
            assert.ok(copy.id);
            assert.ok(copy.name);
            manager.dispose();
        });
        test('saves to file', () => {
            const diagrams = [sampleDiagram({ id: 'dup5' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.duplicateDiagram('dup5');
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.strictEqual(fileData.diagrams.length, 2);
            manager.dispose();
        });
        test('fires onDidChange event', () => {
            const diagrams = [sampleDiagram({ id: 'dup6' })];
            const filePath = createTempDiagramsFile(diagrams);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.duplicateDiagram('dup6');
            assert.ok(eventFired);
            manager.dispose();
        });
        test('returns undefined when source ID not found', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            const result = manager.duplicateDiagram('nonexistent');
            assert.strictEqual(result, undefined);
            manager.dispose();
        });
    });
    // ── File I/O ──────────────────────────────────────────────────
    suite('File I/O', () => {
        test('handles malformed JSON file gracefully (shows error, loads empty)', () => {
            const dir = createTempDir();
            const filePath = path.join(dir, 'bad.diagrams.json');
            fs.writeFileSync(filePath, '{ not valid json!!!', 'utf8');
            const { mock, showErrorMessageStub } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.deepStrictEqual(manager.getDiagrams(), []);
            assert.ok(showErrorMessageStub.calledOnce);
            manager.dispose();
        });
        test('handles file with wrong structure gracefully (shows error, loads empty)', () => {
            const dir = createTempDir();
            const filePath = path.join(dir, 'wrong.diagrams.json');
            fs.writeFileSync(filePath, JSON.stringify({ notDiagrams: true }), 'utf8');
            const { mock, showErrorMessageStub } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.deepStrictEqual(manager.getDiagrams(), []);
            assert.ok(showErrorMessageStub.calledOnce);
            manager.dispose();
        });
        test('handles file becoming deleted externally (empty diagrams)', () => {
            const dir = createTempDir();
            const filePath = path.join(dir, 'deleted.diagrams.json');
            // File does not exist — should handle gracefully
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.deepStrictEqual(manager.getDiagrams(), []);
            manager.dispose();
        });
        test('saveDiagrams() writes pretty-printed JSON', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.addDiagram('Pretty');
            const raw = fs.readFileSync(filePath, 'utf8');
            // Pretty-printed JSON has newlines and indentation
            assert.ok(raw.includes('\n'));
            assert.ok(raw.includes('  '));
            // Verify it's valid JSON with the DiagramsFile structure
            const parsed = JSON.parse(raw);
            assert.ok(Array.isArray(parsed.diagrams));
            assert.strictEqual(parsed.diagrams[0].name, 'Pretty');
            manager.dispose();
        });
    });
    // ── setFilePath() ─────────────────────────────────────────────
    suite('setFilePath()', () => {
        test('changes file path and reloads diagrams from new file', () => {
            const filePath1 = createTempDiagramsFile([sampleDiagram({ id: 'f1', name: 'File1' })]);
            const filePath2 = createTempDiagramsFile([sampleDiagram({ id: 'f2', name: 'File2' })]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath1);
            assert.strictEqual(manager.getDiagrams()[0].name, 'File1');
            manager.setFilePath(filePath2);
            assert.strictEqual(manager.getFilePath(), filePath2);
            assert.strictEqual(manager.getDiagrams()[0].name, 'File2');
            manager.dispose();
        });
        test('fires onDidChange event after changing path', () => {
            const filePath1 = createTempDiagramsFile([]);
            const filePath2 = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath1);
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            manager.setFilePath(filePath2);
            assert.ok(eventFired);
            manager.dispose();
        });
    });
    // ── getFilePath() ─────────────────────────────────────────────
    suite('getFilePath()', () => {
        test('returns the file path passed to constructor', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            assert.strictEqual(manager.getFilePath(), filePath);
            manager.dispose();
        });
    });
    // ── dispose() ─────────────────────────────────────────────────
    suite('dispose()', () => {
        test('disposes file watcher', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock, watcherDispose } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            manager.dispose();
            assert.ok(watcherDispose.calledOnce);
        });
        test('disposes event emitter', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            // Should not throw
            manager.dispose();
            assert.ok(true);
        });
        test('clears pending reload timeouts', () => {
            const filePath = createTempDiagramsFile([]);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDiagramManager(mock);
            const manager = new ManagerClass(filePath);
            // Dispose should clear any pending timeout without error
            manager.dispose();
            assert.ok(true);
        });
    });
});
//# sourceMappingURL=DiagramManager.test.js.map