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
exports.DimensionManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const SEED_DIMENSIONS = [
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
        id: 'environment',
        name: 'Environment',
        builtIn: true,
        values: [
            { id: 'prod', label: 'Prod', sortOrder: 1 },
            { id: 'pre-prod', label: 'Pre-Prod', sortOrder: 2 },
            { id: 'test', label: 'Test', sortOrder: 3 },
            { id: 'dev', label: 'Dev', sortOrder: 4 },
        ],
    },
    {
        id: 'schema',
        name: 'Schema',
        builtIn: true,
        values: [
            { id: 'relational', label: 'Relational', sortOrder: 1 },
            { id: 'star', label: 'Star', sortOrder: 2 },
            { id: 'snowflake', label: 'Snowflake', sortOrder: 3 },
            { id: 'galaxy', label: 'Galaxy', sortOrder: 4 },
            { id: 'flat', label: 'Flat', sortOrder: 5 },
            { id: 'nosql', label: 'NoSQL', sortOrder: 6 },
        ],
    },
];
class DimensionManager {
    dimensions = [];
    dimensionsFilePath;
    _watcher;
    _configListener;
    _reloadTimeout;
    _onDidChangeDimensions = new vscode.EventEmitter();
    onDidChangeDimensions = this._onDidChangeDimensions.event;
    constructor() {
        const configuredPath = vscode.workspace.getConfiguration('acacia-erd')
            .get('dimensionsFilePath', 'acacia-erd.dimensions.json');
        this.dimensionsFilePath = this.resolveFilePath(configuredPath);
        this.loadDimensions();
        this.setupFileWatcher();
        this.setupConfigListener();
    }
    // ── File watcher ──────────────────────────────────────────────
    setupFileWatcher() {
        this._watcher?.dispose();
        const filePattern = new vscode.RelativePattern(path.dirname(this.dimensionsFilePath), path.basename(this.dimensionsFilePath));
        this._watcher = vscode.workspace.createFileSystemWatcher(filePattern);
        this._watcher.onDidChange(() => {
            console.log('Dimensions file changed externally, reloading...');
            this.debouncedReload();
        });
        this._watcher.onDidCreate(() => {
            console.log('Dimensions file created, loading...');
            this.debouncedReload();
        });
        this._watcher.onDidDelete(() => {
            console.log('Dimensions file deleted, clearing dimensions...');
            this.dimensions = [];
            this.notifyChange();
        });
    }
    setupConfigListener() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.dimensionsFilePath')) {
                const newConfiguredPath = vscode.workspace.getConfiguration('acacia-erd')
                    .get('dimensionsFilePath', 'acacia-erd.dimensions.json');
                const newResolvedPath = this.resolveFilePath(newConfiguredPath);
                if (newResolvedPath !== this.dimensionsFilePath) {
                    this.dimensionsFilePath = newResolvedPath;
                    this.loadDimensions();
                    this.setupFileWatcher();
                    this.notifyChange();
                }
            }
        });
    }
    debouncedReload() {
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
        this._reloadTimeout = setTimeout(() => {
            this.loadDimensions();
            this.notifyChange();
            this._reloadTimeout = undefined;
        }, 300);
    }
    // ── Path resolution ───────────────────────────────────────────
    resolveFilePath(configuredPath) {
        if (path.isAbsolute(configuredPath)) {
            return configuredPath;
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceFolder) {
            return path.resolve(workspaceFolder, configuredPath);
        }
        return path.resolve(configuredPath);
    }
    // ── File I/O ──────────────────────────────────────────────────
    loadDimensions() {
        try {
            if (!fs.existsSync(this.dimensionsFilePath)) {
                // File doesn't exist yet — use seed data in memory
                this.dimensions = JSON.parse(JSON.stringify(SEED_DIMENSIONS));
                return;
            }
            const data = fs.readFileSync(this.dimensionsFilePath, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                this.dimensions = parsed;
            }
            else {
                this.dimensions = [];
                vscode.window.showErrorMessage('Error loading dimensions: expected an array');
            }
        }
        catch (error) {
            console.error('Error loading dimensions:', error);
            if (error instanceof Error) {
                if (error.message.includes('Unexpected end of JSON input')) {
                    this.dimensions = [];
                }
                else {
                    this.dimensions = [];
                    vscode.window.showErrorMessage('Error loading dimensions: ' + error.message);
                }
            }
            else {
                vscode.window.showErrorMessage('Error loading dimensions: Unknown error');
            }
        }
    }
    saveDimensions() {
        try {
            const dir = path.dirname(this.dimensionsFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dimensionsFilePath, JSON.stringify(this.dimensions, null, 2));
        }
        catch (error) {
            console.error('Error saving dimensions:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error saving dimensions: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('Error saving dimensions: Unknown error');
            }
        }
    }
    // ── ID generation ─────────────────────────────────────────────
    generateId(name) {
        let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!base) {
            base = 'dimension';
        }
        let candidate = base;
        let counter = 2;
        while (this.dimensions.some(d => d.id === candidate)) {
            candidate = `${base}-${counter}`;
            counter++;
        }
        return candidate;
    }
    generateValueId(existingValues, label) {
        let base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!base) {
            base = 'value';
        }
        let candidate = base;
        let counter = 2;
        while (existingValues.some(v => v.id === candidate)) {
            candidate = `${base}-${counter}`;
            counter++;
        }
        return candidate;
    }
    // ── Event ─────────────────────────────────────────────────────
    notifyChange() {
        this._onDidChangeDimensions.fire(this.dimensions);
    }
    // ── Public API — Read ─────────────────────────────────────────
    getDimensions() {
        return this.dimensions;
    }
    getDimension(id) {
        return this.dimensions.find(d => d.id === id);
    }
    // ── Public API — Dimension CRUD ───────────────────────────────
    addDimension(name) {
        const id = this.generateId(name);
        const dimension = {
            id,
            name,
            builtIn: false,
            values: [],
        };
        this.dimensions.push(dimension);
        this.saveDimensions();
        this.notifyChange();
        return dimension;
    }
    removeDimension(id) {
        const dimension = this.dimensions.find(d => d.id === id);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${id}" not found.`);
            return;
        }
        if (dimension.builtIn) {
            vscode.window.showWarningMessage(`Cannot delete built-in dimension "${dimension.name}".`);
            return;
        }
        this.dimensions = this.dimensions.filter(d => d.id !== id);
        this.saveDimensions();
        this.notifyChange();
    }
    renameDimension(id, newName) {
        const dimension = this.dimensions.find(d => d.id === id);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${id}" not found.`);
            return;
        }
        dimension.name = newName;
        this.saveDimensions();
        this.notifyChange();
    }
    // ── Public API — Dimension Value CRUD ─────────────────────────
    addValue(dimensionId, label) {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            throw new Error(`Dimension "${dimensionId}" not found.`);
        }
        const id = this.generateValueId(dimension.values, label);
        const maxSortOrder = dimension.values.length > 0
            ? Math.max(...dimension.values.map(v => v.sortOrder))
            : 0;
        const value = {
            id,
            label,
            sortOrder: maxSortOrder + 1,
        };
        dimension.values.push(value);
        this.saveDimensions();
        this.notifyChange();
        return value;
    }
    removeValue(dimensionId, valueId) {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${dimensionId}" not found.`);
            return;
        }
        dimension.values = dimension.values.filter(v => v.id !== valueId);
        this.saveDimensions();
        this.notifyChange();
    }
    renameValue(dimensionId, valueId, newLabel) {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${dimensionId}" not found.`);
            return;
        }
        const value = dimension.values.find(v => v.id === valueId);
        if (!value) {
            vscode.window.showWarningMessage(`Value "${valueId}" not found in dimension "${dimension.name}".`);
            return;
        }
        value.label = newLabel;
        this.saveDimensions();
        this.notifyChange();
    }
    reorderValue(dimensionId, valueId, newSortOrder) {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${dimensionId}" not found.`);
            return;
        }
        const value = dimension.values.find(v => v.id === valueId);
        if (!value) {
            vscode.window.showWarningMessage(`Value "${valueId}" not found in dimension "${dimension.name}".`);
            return;
        }
        value.sortOrder = newSortOrder;
        this.saveDimensions();
        this.notifyChange();
    }
    // ── File management ───────────────────────────────────────────
    ensureFileExists() {
        if (!fs.existsSync(this.dimensionsFilePath)) {
            this.dimensions = JSON.parse(JSON.stringify(SEED_DIMENSIONS));
            this.saveDimensions();
        }
    }
    getDimensionsFilePath() {
        return this.dimensionsFilePath;
    }
    // ── Lifecycle ─────────────────────────────────────────────────
    dispose() {
        this._watcher?.dispose();
        this._configListener?.dispose();
        this._onDidChangeDimensions.dispose();
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
    }
}
exports.DimensionManager = DimensionManager;
//# sourceMappingURL=DimensionManager.js.map