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
exports.EntitiesListManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class EntitiesListManager {
    _onDidChange = new vscode.EventEmitter();
    onDidChange = this._onDidChange.event;
    _configListener;
    constructor() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.entitiesLists')) {
                this._onDidChange.fire(this.getLists());
            }
        });
    }
    /** Read all entities lists from settings. */
    getLists() {
        return vscode.workspace.getConfiguration('acacia-erd')
            .get('entitiesLists', []);
    }
    /** Add a new entities list. Shows warning if name already exists. */
    async addList(name, jsonPath) {
        const lists = this.getLists();
        if (lists.some(l => l.name === name)) {
            vscode.window.showWarningMessage(`Entities list "${name}" already exists.`);
            return;
        }
        const storedPath = this.toWorkspaceRelativePath(jsonPath);
        lists.push({ name, jsonPath: storedPath });
        await this.saveLists(lists);
    }
    /** Remove an entities list by name. */
    async removeList(name) {
        const lists = this.getLists().filter(l => l.name !== name);
        await this.saveLists(lists);
    }
    /** Rename an entities list. */
    async renameList(oldName, newName) {
        const lists = this.getLists();
        const list = lists.find(l => l.name === oldName);
        if (list) {
            list.name = newName;
            await this.saveLists(lists);
        }
    }
    /** Edit the JSON path of an existing entities list. */
    async editListPath(name, newPath) {
        const lists = this.getLists();
        const list = lists.find(l => l.name === name);
        if (list) {
            list.jsonPath = this.toWorkspaceRelativePath(newPath);
            await this.saveLists(lists);
        }
    }
    /** Resolve a relative jsonPath to an absolute path. */
    resolveAbsolutePath(list) {
        if (path.isAbsolute(list.jsonPath)) {
            return list.jsonPath;
        }
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder) {
            return path.resolve(wsFolder, list.jsonPath);
        }
        return path.resolve(list.jsonPath);
    }
    /** Convert absolute path to workspace-relative when possible. */
    toWorkspaceRelativePath(absolutePath) {
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder && path.isAbsolute(absolutePath)) {
            const relative = path.relative(wsFolder, absolutePath);
            if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
                return relative;
            }
        }
        return absolutePath;
    }
    /** Save lists to config and fire change event. */
    async saveLists(lists) {
        await vscode.workspace.getConfiguration('acacia-erd')
            .update('entitiesLists', lists, vscode.ConfigurationTarget.Workspace);
        this._onDidChange.fire(lists);
    }
    dispose() {
        this._configListener.dispose();
        this._onDidChange.dispose();
    }
}
exports.EntitiesListManager = EntitiesListManager;
//# sourceMappingURL=EntitiesListManager.js.map