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
exports.DiagramManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class DiagramManager {
    diagrams = [];
    filePath;
    _watcher;
    _reloadTimeout;
    _onDidChange = new vscode.EventEmitter();
    /** Fires after any mutation (add, update, rename, delete, duplicate, external reload). */
    onDidChange = this._onDidChange.event;
    constructor(filePath) {
        this.filePath = filePath;
        this.loadDiagrams();
        this.setupFileWatcher();
    }
    // ── File watcher ──────────────────────────────────────────────
    setupFileWatcher() {
        this._watcher?.dispose();
        const filePattern = new vscode.RelativePattern(path.dirname(this.filePath), path.basename(this.filePath));
        this._watcher = vscode.workspace.createFileSystemWatcher(filePattern);
        this._watcher.onDidChange(() => {
            this.debouncedReload();
        });
        this._watcher.onDidCreate(() => {
            this.debouncedReload();
        });
        this._watcher.onDidDelete(() => {
            this.diagrams = [];
            this._onDidChange.fire(this.diagrams);
        });
    }
    debouncedReload() {
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
        this._reloadTimeout = setTimeout(() => {
            this.loadDiagrams();
            this._onDidChange.fire(this.diagrams);
            this._reloadTimeout = undefined;
        }, 300);
    }
    // ── File I/O ──────────────────────────────────────────────────
    /** Reads and parses the diagrams JSON file. Handles missing file and parse errors gracefully. */
    loadDiagrams() {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.diagrams = [];
                return;
            }
            const data = fs.readFileSync(this.filePath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object' && 'diagrams' in parsed && Array.isArray(parsed.diagrams)) {
                this.diagrams = parsed.diagrams;
            }
            else {
                this.diagrams = [];
                vscode.window.showErrorMessage('Error loading diagrams: expected { diagrams: [...] }');
            }
        }
        catch (error) {
            console.error('Error loading diagrams:', error);
            this.diagrams = [];
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error loading diagrams: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('Error loading diagrams: Unknown error');
            }
        }
    }
    /** Writes the current diagrams array to disk as a DiagramsFile. */
    saveDiagrams() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = { diagrams: this.diagrams };
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Error saving diagrams:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error saving diagrams: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('Error saving diagrams: Unknown error');
            }
        }
    }
    // ── Public API — Read ─────────────────────────────────────────
    /** Returns all diagrams. */
    getDiagrams() {
        return this.diagrams;
    }
    /** Find a diagram by ID. */
    getDiagram(id) {
        return this.diagrams.find(d => d.id === id);
    }
    // ── Public API — CRUD ─────────────────────────────────────────
    /** Creates a new diagram with a generated UUID, saves, fires event, and returns the new diagram. */
    addDiagram(name, entityIds, positions) {
        const diagram = {
            id: crypto.randomUUID(),
            name,
            entityIds: entityIds ?? [],
            positions: positions ?? {},
        };
        this.diagrams.push(diagram);
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
        return diagram;
    }
    /** Merges partial updates (entityIds, positions) into an existing diagram, saves, and fires event. */
    updateDiagram(id, updates) {
        const diagram = this.diagrams.find(d => d.id === id);
        if (!diagram) {
            return;
        }
        if (updates.entityIds !== undefined) {
            diagram.entityIds = updates.entityIds;
        }
        if (updates.positions !== undefined) {
            diagram.positions = updates.positions;
        }
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
    }
    /** Renames a diagram, saves, and fires event. */
    renameDiagram(id, newName) {
        const diagram = this.diagrams.find(d => d.id === id);
        if (!diagram) {
            return;
        }
        diagram.name = newName;
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
    }
    /** Removes a diagram by ID, saves, and fires event. */
    deleteDiagram(id) {
        this.diagrams = this.diagrams.filter(d => d.id !== id);
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
    }
    /** Deep-copies a diagram with a new UUID and name, saves, fires event, and returns the copy. */
    duplicateDiagram(id, newName) {
        const original = this.diagrams.find(d => d.id === id);
        if (!original) {
            return undefined;
        }
        const copy = {
            id: crypto.randomUUID(),
            name: newName ?? `${original.name} (copy)`,
            entityIds: [...original.entityIds],
            positions: JSON.parse(JSON.stringify(original.positions)),
        };
        this.diagrams.push(copy);
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
        return copy;
    }
    // ── Path management ───────────────────────────────────────────
    /** Returns the current diagrams file path. */
    getFilePath() {
        return this.filePath;
    }
    /** Changes the diagrams file path, disposes the old watcher, sets up a new one, and reloads. */
    setFilePath(newPath) {
        this.filePath = newPath;
        this._watcher?.dispose();
        this.loadDiagrams();
        this.setupFileWatcher();
        this._onDidChange.fire(this.diagrams);
    }
    // ── Lifecycle ─────────────────────────────────────────────────
    /** Disposes the file watcher, event emitter, and clears any pending timeouts. */
    dispose() {
        this._watcher?.dispose();
        this._onDidChange.dispose();
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
    }
}
exports.DiagramManager = DiagramManager;
//# sourceMappingURL=DiagramManager.js.map