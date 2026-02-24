import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── Mock vscode namespace ──────────────────────────────────────────────────

/**
 * Configuration values that can be set per-test.
 * Keys are dot-separated config paths, e.g. "acacia-erd.entitiesJsonPath".
 */
let configValues: Record<string, any> = {};

/** Set a configuration value that `workspace.getConfiguration` will return. */
export function setConfigValue(key: string, value: any): void {
    configValues[key] = value;
}

/** Clear all custom configuration values. */
export function clearConfigValues(): void {
    configValues = {};
}

/**
 * Creates a fresh mock `vscode` namespace with sinon stubs.
 * Call this once at module level or inside `beforeEach`.
 */
export function createMockVscode() {
    const mockVscode = {
        window: {
            showErrorMessage: sinon.stub().resolves(undefined),
            showInformationMessage: sinon.stub().resolves(undefined),
            showWarningMessage: sinon.stub().resolves(undefined),
            showSaveDialog: sinon.stub().resolves(undefined),
            showOpenDialog: sinon.stub().resolves(undefined),
        },
        workspace: {
            getConfiguration: sinon.stub().callsFake((section?: string) => {
                return {
                    get: <T>(key: string, defaultValue?: T): T | undefined => {
                        const fullKey = section ? `${section}.${key}` : key;
                        if (fullKey in configValues) {
                            return configValues[fullKey] as T;
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
            file: (filePath: string) => ({
                scheme: 'file',
                path: filePath.replace(/\\/g, '/'),
                fsPath: filePath,
                toString: () => `file:///${filePath.replace(/\\/g, '/')}`,
            }),
            parse: (str: string) => ({
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

const tempDirs: string[] = [];

/**
 * Creates a temporary directory and writes a default `entities.json` inside it.
 * Returns the full path to the temp directory.
 *
 * @param entities  Optional array to serialise as JSON (defaults to empty array).
 */
export function createTempEntitiesDir(entities: any[] = []): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acacia-erd-test-'));
    const filePath = path.join(dir, 'entities.json');
    fs.writeFileSync(filePath, JSON.stringify(entities, null, 2), 'utf8');
    tempDirs.push(dir);
    return dir;
}

/**
 * Returns the path to `entities.json` inside the given temp directory.
 */
export function entitiesJsonPath(dir: string): string {
    return path.join(dir, 'entities.json');
}

/**
 * Removes all temporary directories created by `createTempEntitiesDir`.
 */
export function cleanupTempDirs(): void {
    for (const dir of tempDirs) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        } catch {
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
export function resetAllStubs(): void {
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
export function resetSingletons(): void {
    const { EntityManager } = require('../utils/EntityManager');
    const { ObjectRegistry } = require('../utils/ObjectRegistry');

    // Force-clear private static fields via bracket notation
    (EntityManager as any).instance = undefined;
    (ObjectRegistry as any).instance = undefined;
}
