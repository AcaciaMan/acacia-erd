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
exports.setConfigValue = setConfigValue;
exports.clearConfigValues = clearConfigValues;
exports.createMockVscode = createMockVscode;
exports.createTempEntitiesDir = createTempEntitiesDir;
exports.entitiesJsonPath = entitiesJsonPath;
exports.cleanupTempDirs = cleanupTempDirs;
exports.resetAllStubs = resetAllStubs;
exports.resetSingletons = resetSingletons;
const sinon = __importStar(require("sinon"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// ─── Mock vscode namespace ──────────────────────────────────────────────────
/**
 * Configuration values that can be set per-test.
 * Keys are dot-separated config paths, e.g. "acacia-erd.entitiesJsonPath".
 */
let configValues = {};
/** Set a configuration value that `workspace.getConfiguration` will return. */
function setConfigValue(key, value) {
    configValues[key] = value;
}
/** Clear all custom configuration values. */
function clearConfigValues() {
    configValues = {};
}
/**
 * Creates a fresh mock `vscode` namespace with sinon stubs.
 * Call this once at module level or inside `beforeEach`.
 */
function createMockVscode() {
    const mockVscode = {
        window: {
            showErrorMessage: sinon.stub().resolves(undefined),
            showInformationMessage: sinon.stub().resolves(undefined),
            showWarningMessage: sinon.stub().resolves(undefined),
            showSaveDialog: sinon.stub().resolves(undefined),
            showOpenDialog: sinon.stub().resolves(undefined),
        },
        workspace: {
            getConfiguration: sinon.stub().callsFake((section) => {
                return {
                    get: (key, defaultValue) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        if (fullKey in configValues) {
                            return configValues[fullKey];
                        }
                        return defaultValue;
                    },
                    update: sinon.stub().resolves(),
                };
            }),
        },
        env: {
            openExternal: sinon.stub().resolves(true),
        },
        commands: {
            executeCommand: sinon.stub().resolves(undefined),
        },
        Uri: {
            file: (filePath) => ({
                scheme: 'file',
                path: filePath.replace(/\\/g, '/'),
                fsPath: filePath,
                toString: () => `file:///${filePath.replace(/\\/g, '/')}`,
            }),
            parse: (str) => ({
                scheme: 'file',
                path: str,
                fsPath: str,
                toString: () => str,
            }),
        },
        ViewColumn: {
            One: 1,
            Two: 2,
            Three: 3,
            Active: -1,
            Beside: -2,
        },
    };
    return mockVscode;
}
// ─── Temp directory helpers ─────────────────────────────────────────────────
const tempDirs = [];
/**
 * Creates a temporary directory and writes a default `entities.json` inside it.
 * Returns the full path to the temp directory.
 *
 * @param entities  Optional array to serialise as JSON (defaults to empty array).
 */
function createTempEntitiesDir(entities = []) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acacia-erd-test-'));
    const filePath = path.join(dir, 'entities.json');
    fs.writeFileSync(filePath, JSON.stringify(entities, null, 2), 'utf8');
    tempDirs.push(dir);
    return dir;
}
/**
 * Returns the path to `entities.json` inside the given temp directory.
 */
function entitiesJsonPath(dir) {
    return path.join(dir, 'entities.json');
}
/**
 * Removes all temporary directories created by `createTempEntitiesDir`.
 */
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
// ─── Sinon helpers ──────────────────────────────────────────────────────────
/**
 * Restores all sinon stubs/spies/mocks and clears config values.
 * Call in `afterEach`.
 */
function resetAllStubs() {
    sinon.restore();
    clearConfigValues();
}
// ─── Singleton reset helpers ────────────────────────────────────────────────
/**
 * Resets the singleton instances of `EntityManager` and `ObjectRegistry`.
 *
 * This forcibly sets the private static `instance` field to `undefined`
 * so that the next call to `getInstance()` creates a fresh instance.
 */
function resetSingletons() {
    const { EntityManager } = require('../utils/EntityManager');
    const { ObjectRegistry } = require('../utils/ObjectRegistry');
    // Force-clear private static fields via bracket notation
    EntityManager.instance = undefined;
    ObjectRegistry.instance = undefined;
}
//# sourceMappingURL=testHelpers.js.map