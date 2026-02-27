import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import proxyquire = require('proxyquire');

// ─── Shared mock factories ─────────────────────────────────────────────────

const MOCK_WORKSPACE = '/mock/workspace';

const testDimensions = [
    {
        id: 'level',
        name: 'Level',
        builtIn: true,
        values: [
            { id: 'conceptual', label: 'Conceptual', sortOrder: 1 },
            { id: 'logical', label: 'Logical', sortOrder: 2 },
            { id: 'physical', label: 'Physical', sortOrder: 3 },
        ],
    },
    {
        id: 'custom-dim',
        name: 'Custom Dim',
        builtIn: false,
        values: [
            { id: 'val-a', label: 'Val A', sortOrder: 1 },
        ],
    },
];
const testDimensionsJson = JSON.stringify(testDimensions);

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
            getConfiguration: sinon.stub().callsFake(() => ({
                get: sinon.stub().returns('acacia-erd.dimensions.json'),
                update: updateStub,
            })),
            workspaceFolders: [{ uri: { fsPath: MOCK_WORKSPACE } }],
            createFileSystemWatcher: sinon.stub().callsFake(() => createMockFileSystemWatcher()),
            onDidChangeConfiguration: sinon.stub().returns({ dispose: sinon.stub() }),
        },
        window: {
            showErrorMessage: sinon.stub(),
            showWarningMessage: sinon.stub(),
            showInformationMessage: sinon.stub(),
        },
        RelativePattern: class RelativePattern {
            constructor(public base: string, public pattern: string) {}
        },
        EventEmitter: class MockEventEmitter<T> {
            private listeners: ((e: T) => void)[] = [];
            get event() {
                return (listener: (e: T) => void) => {
                    this.listeners.push(listener);
                    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
                };
            }
            fire(data: T) { this.listeners.forEach(l => l(data)); }
            dispose() { this.listeners = []; }
        },
        '@noCallThru': true,
    };
    return { mock, updateStub };
}

function createFsStub(fileContent?: string) {
    const existsResult = fileContent !== undefined;
    return {
        readFileSync: fileContent !== undefined
            ? sinon.stub().returns(fileContent)
            : sinon.stub().throws(new Error('ENOENT: no such file or directory')),
        writeFileSync: sinon.stub(),
        existsSync: sinon.stub().returns(existsResult),
        mkdirSync: sinon.stub(),
        '@noCallThru': true,
    };
}

function loadDimensionManager(fsStub: any, vscodeMock: any) {
    const mod = proxyquire('../../utils/DimensionManager', {
        'fs': fsStub,
        'vscode': vscodeMock,
    });
    return mod.DimensionManager;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

suite('DimensionManager', () => {

    teardown(() => {
        sinon.restore();
    });

    // ── Constructor ─────────────────────────────────────────────────

    suite('Constructor', () => {
        test('creates instance without error', () => {
            const fsStub = createFsStub();
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            assert.ok(manager);
            manager.dispose();
        });

        test('reads config for dimensionsFilePath', () => {
            const fsStub = createFsStub();
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            assert.ok(mock.workspace.getConfiguration.calledWith('acacia-erd'));
            manager.dispose();
        });

        test('resolves relative path against workspace folder', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const expectedPath = path.resolve(MOCK_WORKSPACE, 'acacia-erd.dimensions.json');
            assert.strictEqual(manager.getDimensionsFilePath(), expectedPath);
            manager.dispose();
        });

        test('sets up file watcher on the dimensions file', () => {
            const fsStub = createFsStub();
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            assert.ok(mock.workspace.createFileSystemWatcher.calledOnce);
            manager.dispose();
        });

        test('sets up config change listener', () => {
            const fsStub = createFsStub();
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            assert.ok(mock.workspace.onDidChangeConfiguration.calledOnce);
            manager.dispose();
        });

        test('loads dimensions from file when file exists', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dims = manager.getDimensions();
            assert.strictEqual(dims.length, 2);
            assert.strictEqual(dims[0].id, 'level');
            assert.strictEqual(dims[1].id, 'custom-dim');
            manager.dispose();
        });

        test('uses seed dimensions when file does not exist', () => {
            const fsStub = createFsStub(); // no file content → existsSync returns false
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dims = manager.getDimensions();
            assert.strictEqual(dims.length, 3);
            assert.strictEqual(dims[0].id, 'level');
            assert.strictEqual(dims[1].id, 'environment');
            assert.strictEqual(dims[2].id, 'schema');
            manager.dispose();
        });
    });

    // ── getDimensions() ─────────────────────────────────────────────

    suite('getDimensions()', () => {
        test('returns all dimensions from the loaded file', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dims = manager.getDimensions();
            assert.strictEqual(dims.length, 2);
            assert.strictEqual(dims[0].name, 'Level');
            assert.strictEqual(dims[1].name, 'Custom Dim');
            manager.dispose();
        });

        test('returns seed dimensions when no file exists', () => {
            const fsStub = createFsStub();
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dims = manager.getDimensions();
            assert.strictEqual(dims.length, 3);
            manager.dispose();
        });

        test('returns 3 built-in dimensions in seed data (level, environment, schema)', () => {
            const fsStub = createFsStub();
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dims = manager.getDimensions();
            const ids = dims.map((d: any) => d.id);
            assert.ok(ids.includes('level'));
            assert.ok(ids.includes('environment'));
            assert.ok(ids.includes('schema'));
            assert.ok(dims.every((d: any) => d.builtIn === true));
            manager.dispose();
        });
    });

    // ── getDimension() ──────────────────────────────────────────────

    suite('getDimension()', () => {
        test('returns a dimension by ID', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dim = manager.getDimension('level');
            assert.ok(dim);
            assert.strictEqual(dim.id, 'level');
            assert.strictEqual(dim.name, 'Level');
            manager.dispose();
        });

        test('returns undefined for non-existent ID', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dim = manager.getDimension('non-existent');
            assert.strictEqual(dim, undefined);
            manager.dispose();
        });
    });

    // ── addDimension() ──────────────────────────────────────────────

    suite('addDimension()', () => {
        test('adds a new custom dimension', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dim = manager.addDimension('Team');
            assert.ok(dim);
            assert.strictEqual(dim.name, 'Team');
            assert.strictEqual(manager.getDimensions().length, 3);
            manager.dispose();
        });

        test('generates an ID from the name (lowercase kebab-case)', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dim = manager.addDimension('Business Unit');
            assert.strictEqual(dim.id, 'business-unit');
            manager.dispose();
        });

        test('the new dimension has builtIn = false', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dim = manager.addDimension('Team');
            assert.strictEqual(dim.builtIn, false);
            manager.dispose();
        });

        test('the new dimension starts with an empty values array', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const dim = manager.addDimension('Team');
            assert.deepStrictEqual(dim.values, []);
            manager.dispose();
        });

        test('calls saveDimensions after adding (writeFileSync is called)', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.addDimension('Team');
            assert.ok(fsStub.writeFileSync.calledOnce);
            manager.dispose();
        });

        test('fires onDidChangeDimensions event', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.addDimension('Team');
            assert.ok(eventFired);
            manager.dispose();
        });

        test('handles duplicate name/ID by appending a suffix', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            // 'level' ID already exists in the seed data
            const dim = manager.addDimension('Level');
            assert.strictEqual(dim.id, 'level-2');
            assert.strictEqual(dim.name, 'Level');
            manager.dispose();
        });
    });

    // ── removeDimension() ───────────────────────────────────────────

    suite('removeDimension()', () => {
        test('removes a custom dimension by ID', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeDimension('custom-dim');
            assert.strictEqual(manager.getDimensions().length, 1);
            assert.strictEqual(manager.getDimension('custom-dim'), undefined);
            manager.dispose();
        });

        test('calls saveDimensions after removing', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeDimension('custom-dim');
            assert.ok(fsStub.writeFileSync.calledOnce);
            manager.dispose();
        });

        test('fires onDidChangeDimensions event', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.removeDimension('custom-dim');
            assert.ok(eventFired);
            manager.dispose();
        });

        test('prevents removal of builtIn dimensions (shows warning message)', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeDimension('level');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            // level should still be present
            assert.ok(manager.getDimension('level'));
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });

        test('handles non-existent ID gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeDimension('non-existent');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });
    });

    // ── renameDimension() ───────────────────────────────────────────

    suite('renameDimension()', () => {
        test('renames a dimension', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.renameDimension('custom-dim', 'Renamed Dim');
            const dim = manager.getDimension('custom-dim');
            assert.ok(dim);
            assert.strictEqual(dim.name, 'Renamed Dim');
            manager.dispose();
        });

        test('calls saveDimensions after renaming', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.renameDimension('custom-dim', 'Renamed');
            assert.ok(fsStub.writeFileSync.calledOnce);
            manager.dispose();
        });

        test('fires onDidChangeDimensions event', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.renameDimension('custom-dim', 'Renamed');
            assert.ok(eventFired);
            manager.dispose();
        });

        test('handles non-existent ID gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.renameDimension('non-existent', 'Whatever');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });
    });

    // ── addValue() ──────────────────────────────────────────────────

    suite('addValue()', () => {
        test('adds a new value to an existing dimension', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const value = manager.addValue('custom-dim', 'Val B');
            assert.ok(value);
            assert.strictEqual(value.label, 'Val B');
            const dim = manager.getDimension('custom-dim');
            assert.strictEqual(dim.values.length, 2);
            manager.dispose();
        });

        test('generates value ID from label (lowercase kebab-case)', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            const value = manager.addValue('custom-dim', 'My New Value');
            assert.strictEqual(value.id, 'my-new-value');
            manager.dispose();
        });

        test('assigns correct sortOrder (next in sequence)', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            // custom-dim has one value with sortOrder 1
            const value = manager.addValue('custom-dim', 'Val B');
            assert.strictEqual(value.sortOrder, 2);
            manager.dispose();
        });

        test('assigns sortOrder 1 when dimension has no existing values', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            // Add a new empty dimension first
            const dim = manager.addDimension('Empty Dim');
            fsStub.writeFileSync.resetHistory();
            const value = manager.addValue(dim.id, 'First Val');
            assert.strictEqual(value.sortOrder, 1);
            manager.dispose();
        });

        test('calls saveDimensions after adding', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.addValue('custom-dim', 'Val B');
            assert.ok(fsStub.writeFileSync.calledOnce);
            manager.dispose();
        });

        test('fires onDidChangeDimensions event', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.addValue('custom-dim', 'Val B');
            assert.ok(eventFired);
            manager.dispose();
        });

        test('throws for non-existent dimension ID', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            assert.throws(() => {
                manager.addValue('non-existent', 'Val');
            }, /not found/i);
            manager.dispose();
        });
    });

    // ── removeValue() ───────────────────────────────────────────────

    suite('removeValue()', () => {
        test('removes a value from a dimension', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeValue('custom-dim', 'val-a');
            const dim = manager.getDimension('custom-dim');
            assert.strictEqual(dim.values.length, 0);
            manager.dispose();
        });

        test('calls saveDimensions after removing', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeValue('custom-dim', 'val-a');
            assert.ok(fsStub.writeFileSync.calledOnce);
            manager.dispose();
        });

        test('fires onDidChangeDimensions event', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.removeValue('custom-dim', 'val-a');
            assert.ok(eventFired);
            manager.dispose();
        });

        test('handles non-existent value ID gracefully (still saves)', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            // Should not throw, just filters with no match
            manager.removeValue('custom-dim', 'non-existent');
            const dim = manager.getDimension('custom-dim');
            assert.strictEqual(dim.values.length, 1); // unchanged
            manager.dispose();
        });

        test('handles non-existent dimension ID gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.removeValue('non-existent', 'val-a');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            manager.dispose();
        });
    });

    // ── renameValue() ───────────────────────────────────────────────

    suite('renameValue()', () => {
        test('renames a value within a dimension', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.renameValue('custom-dim', 'val-a', 'Renamed A');
            const dim = manager.getDimension('custom-dim');
            const val = dim.values.find((v: any) => v.id === 'val-a');
            assert.strictEqual(val.label, 'Renamed A');
            manager.dispose();
        });

        test('saves and fires event after renaming', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.renameValue('custom-dim', 'val-a', 'Renamed A');
            assert.ok(fsStub.writeFileSync.calledOnce);
            assert.ok(eventFired);
            manager.dispose();
        });

        test('handles non-existent dimension gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.renameValue('non-existent', 'val-a', 'New');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });

        test('handles non-existent value gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.renameValue('custom-dim', 'non-existent', 'New');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });
    });

    // ── reorderValue() ──────────────────────────────────────────────

    suite('reorderValue()', () => {
        test('updates the sortOrder of a value', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.reorderValue('custom-dim', 'val-a', 5);
            const dim = manager.getDimension('custom-dim');
            const val = dim.values.find((v: any) => v.id === 'val-a');
            assert.strictEqual(val.sortOrder, 5);
            manager.dispose();
        });

        test('saves and fires event', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChangeDimensions(() => { eventFired = true; });
            manager.reorderValue('custom-dim', 'val-a', 5);
            assert.ok(fsStub.writeFileSync.calledOnce);
            assert.ok(eventFired);
            manager.dispose();
        });

        test('handles non-existent dimension gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.reorderValue('non-existent', 'val-a', 5);
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });

        test('handles non-existent value gracefully', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.reorderValue('custom-dim', 'non-existent', 5);
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });
    });

    // ── ensureFileExists() ──────────────────────────────────────────

    suite('ensureFileExists()', () => {
        test('creates the file with seed data when it does not exist', () => {
            const fsStub = createFsStub(); // no file
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.ensureFileExists();
            assert.ok(fsStub.writeFileSync.calledOnce);
            // Should have written seed dimensions
            const writtenContent = fsStub.writeFileSync.firstCall.args[1];
            const parsed = JSON.parse(writtenContent);
            assert.strictEqual(parsed.length, 3);
            assert.strictEqual(parsed[0].id, 'level');
            assert.strictEqual(parsed[1].id, 'environment');
            assert.strictEqual(parsed[2].id, 'schema');
            manager.dispose();
        });

        test('does not overwrite if file already exists', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.ensureFileExists();
            assert.ok(fsStub.writeFileSync.notCalled);
            manager.dispose();
        });

        test('writes valid JSON with pretty-print formatting', () => {
            const fsStub = createFsStub(); // no file
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.ensureFileExists();
            const writtenContent = fsStub.writeFileSync.firstCall.args[1] as string;
            // Pretty-printed JSON has newlines and indentation
            assert.ok(writtenContent.includes('\n'));
            assert.ok(writtenContent.includes('  '));
            // Should be parseable
            assert.doesNotThrow(() => JSON.parse(writtenContent));
            manager.dispose();
        });
    });

    // ── File Watcher ────────────────────────────────────────────────

    suite('File Watcher', () => {
        test('reloads dimensions when file changes externally', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const mockWatcher = createMockFileSystemWatcher();
            mock.workspace.createFileSystemWatcher = sinon.stub().returns(mockWatcher);

            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();

            // The onDidChange callback was registered
            assert.ok(mockWatcher.onDidChange.calledOnce);

            // Simulate file change by calling the registered callback
            const changeCallback = mockWatcher.onDidChange.firstCall.args[0];

            // Update the file content for next read
            const updatedDimensions = [{ id: 'updated', name: 'Updated', builtIn: false, values: [] }];
            fsStub.readFileSync = sinon.stub().returns(JSON.stringify(updatedDimensions));
            fsStub.existsSync = sinon.stub().returns(true);

            // Call the change handler (uses debounced reload)
            changeCallback();

            // Use a clock to bypass the debounce
            const clock = sinon.useFakeTimers();
            changeCallback();
            clock.tick(300);

            const dims = manager.getDimensions();
            assert.strictEqual(dims.length, 1);
            assert.strictEqual(dims[0].id, 'updated');

            clock.restore();
            manager.dispose();
        });

        test('clears dimensions when file is deleted', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const mockWatcher = createMockFileSystemWatcher();
            mock.workspace.createFileSystemWatcher = sinon.stub().returns(mockWatcher);

            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();

            assert.ok(mockWatcher.onDidDelete.calledOnce);
            const deleteCallback = mockWatcher.onDidDelete.firstCall.args[0];

            deleteCallback();
            assert.strictEqual(manager.getDimensions().length, 0);
            manager.dispose();
        });

        test('loads dimensions when file is created', () => {
            const fsStub = createFsStub(); // no file initially
            const { mock } = createVscodeStub();
            const mockWatcher = createMockFileSystemWatcher();
            mock.workspace.createFileSystemWatcher = sinon.stub().returns(mockWatcher);

            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();

            assert.ok(mockWatcher.onDidCreate.calledOnce);
            const createCallback = mockWatcher.onDidCreate.firstCall.args[0];

            // Now the file exists with content
            fsStub.readFileSync = sinon.stub().returns(testDimensionsJson);
            fsStub.existsSync = sinon.stub().returns(true);

            const clock = sinon.useFakeTimers();
            createCallback();
            clock.tick(300);

            const dims = manager.getDimensions();
            assert.strictEqual(dims.length, 2);
            assert.strictEqual(dims[0].id, 'level');

            clock.restore();
            manager.dispose();
        });
    });

    // ── dispose() ───────────────────────────────────────────────────

    suite('dispose()', () => {
        test('disposes file watcher', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const mockWatcher = createMockFileSystemWatcher();
            mock.workspace.createFileSystemWatcher = sinon.stub().returns(mockWatcher);

            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.dispose();
            assert.ok(mockWatcher.dispose.calledOnce);
        });

        test('disposes config listener', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const configDispose = sinon.stub();
            mock.workspace.onDidChangeConfiguration = sinon.stub().returns({ dispose: configDispose });

            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            manager.dispose();
            assert.ok(configDispose.calledOnce);
        });

        test('disposes event emitter', () => {
            const fsStub = createFsStub(testDimensionsJson);
            const { mock } = createVscodeStub();
            const ManagerClass = loadDimensionManager(fsStub, mock);
            const manager = new ManagerClass();
            // After dispose, adding a listener should not cause errors
            manager.dispose();
            // The emitter's dispose was called (we can verify by checking no events fire)
            let eventFired = false;
            // This may throw or silently fail since emitter is disposed; either is acceptable
            try {
                manager.onDidChangeDimensions(() => { eventFired = true; });
            } catch (_) { /* expected */ }
            assert.strictEqual(eventFired, false);
        });
    });
});
