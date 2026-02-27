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
function createVscodeStub(initialConnections = []) {
    const updateStub = sinon.stub().resolves();
    const getStub = sinon.stub().returns(initialConnections);
    const mock = {
        workspace: {
            getConfiguration: sinon.stub().callsFake(() => ({
                get: getStub,
                update: updateStub,
            })),
            onDidChangeConfiguration: sinon.stub().returns({ dispose: sinon.stub() }),
        },
        window: {
            showWarningMessage: sinon.stub(),
        },
        ConfigurationTarget: {
            Workspace: 2,
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
    return { mock, updateStub, getStub };
}
function loadDbConnectionManager(vscodeMock) {
    const mod = proxyquire('../../utils/DbConnectionManager', {
        'vscode': vscodeMock,
    });
    return mod.DbConnectionManager;
}
suite('DbConnectionManager', () => {
    teardown(() => {
        sinon.restore();
    });
    suite('Constructor', () => {
        test('creates instance without error', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            assert.ok(manager);
            manager.dispose();
        });
        test('sets up configuration listener via onDidChangeConfiguration', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            assert.ok(mock.workspace.onDidChangeConfiguration.calledOnce);
            manager.dispose();
        });
    });
    suite('getConnections()', () => {
        test('returns empty array when no connections configured', () => {
            const { mock } = createVscodeStub([]);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            const connections = manager.getConnections();
            assert.deepStrictEqual(connections, []);
            manager.dispose();
        });
        test('returns configured connections from settings', () => {
            const configured = [
                { name: 'Dev DB', connectionPath: 'sqlite:///data/dev.db' },
                { name: 'Test DB', connectionPath: 'localhost:5432/testdb' },
            ];
            const { mock } = createVscodeStub(configured);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            const connections = manager.getConnections();
            assert.deepStrictEqual(connections, configured);
            manager.dispose();
        });
    });
    suite('addConnection()', () => {
        test('adds a connection and calls update() with the new array', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.addConnection('Dev DB', 'sqlite:///data/dev.db');
            assert.ok(updateStub.calledOnce);
            const saved = updateStub.firstCall.args[1];
            assert.strictEqual(saved.length, 1);
            assert.strictEqual(saved[0].name, 'Dev DB');
            assert.strictEqual(saved[0].connectionPath, 'sqlite:///data/dev.db');
            manager.dispose();
        });
        test('stores the connection path as-is (no transformation)', async () => {
            const { mock, updateStub } = createVscodeStub([]);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            const rawPath = 'server=myhost;database=mydb;TrustServerCertificate=true';
            await manager.addConnection('Prod', rawPath);
            const saved = updateStub.firstCall.args[1];
            assert.strictEqual(saved[0].connectionPath, rawPath);
            manager.dispose();
        });
        test('shows warning and does not add when name already exists', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.addConnection('Dev DB', 'other-path');
            assert.ok(mock.window.showWarningMessage.calledOnce);
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });
        test('fires onDidChange event after adding', async () => {
            const { mock } = createVscodeStub([]);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.addConnection('Dev DB', 'sqlite:///dev.db');
            assert.ok(eventFired);
            manager.dispose();
        });
    });
    suite('removeConnection()', () => {
        test('removes the connection by name and saves', async () => {
            const existing = [
                { name: 'Dev DB', connectionPath: 'sqlite:///dev.db' },
                { name: 'Test DB', connectionPath: 'localhost:5432/testdb' },
            ];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.removeConnection('Dev DB');
            assert.ok(updateStub.calledOnce);
            const saved = updateStub.firstCall.args[1];
            assert.strictEqual(saved.length, 1);
            assert.strictEqual(saved[0].name, 'Test DB');
            manager.dispose();
        });
        test('does not error when name not found', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.removeConnection('NonExistent');
            assert.ok(updateStub.calledOnce);
            const saved = updateStub.firstCall.args[1];
            assert.strictEqual(saved.length, 1);
            manager.dispose();
        });
        test('fires onDidChange event after removing', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.removeConnection('Dev DB');
            assert.ok(eventFired);
            manager.dispose();
        });
    });
    suite('renameConnection()', () => {
        test('renames an existing connection', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.renameConnection('Dev DB', 'Development Database');
            assert.ok(updateStub.calledOnce);
            const saved = updateStub.firstCall.args[1];
            assert.strictEqual(saved[0].name, 'Development Database');
            assert.strictEqual(saved[0].connectionPath, 'sqlite:///dev.db');
            manager.dispose();
        });
        test('does not error when old name not found', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.renameConnection('NonExistent', 'NewName');
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });
        test('fires onDidChange event after renaming', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.renameConnection('Dev DB', 'Development Database');
            assert.ok(eventFired);
            manager.dispose();
        });
    });
    suite('editConnectionPath()', () => {
        test('updates the connection path for an existing connection', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.editConnectionPath('Dev DB', 'localhost:5432/devdb');
            assert.ok(updateStub.calledOnce);
            const saved = updateStub.firstCall.args[1];
            assert.strictEqual(saved[0].name, 'Dev DB');
            assert.strictEqual(saved[0].connectionPath, 'localhost:5432/devdb');
            manager.dispose();
        });
        test('does not error when name not found', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock, updateStub } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            await manager.editConnectionPath('NonExistent', 'new-path');
            assert.ok(updateStub.notCalled);
            manager.dispose();
        });
        test('fires onDidChange event after editing', async () => {
            const existing = [{ name: 'Dev DB', connectionPath: 'sqlite:///dev.db' }];
            const { mock } = createVscodeStub(existing);
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            let eventFired = false;
            manager.onDidChange(() => { eventFired = true; });
            await manager.editConnectionPath('Dev DB', 'localhost:5432/devdb');
            assert.ok(eventFired);
            manager.dispose();
        });
    });
    suite('dispose()', () => {
        test('disposes config listener', () => {
            const { mock } = createVscodeStub();
            const configDispose = sinon.stub();
            mock.workspace.onDidChangeConfiguration = sinon.stub().returns({ dispose: configDispose });
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            manager.dispose();
            assert.ok(configDispose.calledOnce);
        });
        test('disposes event emitter', () => {
            const { mock } = createVscodeStub();
            const ManagerClass = loadDbConnectionManager(mock);
            const manager = new ManagerClass();
            manager.dispose();
            // No error means success
            assert.ok(true);
        });
    });
});
//# sourceMappingURL=DbConnectionManager.test.js.map