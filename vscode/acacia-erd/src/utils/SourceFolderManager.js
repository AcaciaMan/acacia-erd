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
exports.SourceFolderManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class SourceFolderManager {
    _onDidChange = new vscode.EventEmitter();
    onDidChange = this._onDidChange.event;
    _configListener;
    constructor() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.sourceFolders')) {
                this._onDidChange.fire(this.getFolders());
            }
        });
    }
    getFolders() {
        return vscode.workspace.getConfiguration('acacia-erd')
            .get('sourceFolders', []);
    }
    async addFolder(name, folderPath) {
        const folders = this.getFolders();
        if (folders.some(f => f.name === name)) {
            vscode.window.showWarningMessage(`Source folder "${name}" already exists.`);
            return;
        }
        const storedPath = this.toWorkspaceRelativePath(folderPath);
        folders.push({ name, path: storedPath });
        await this.saveFolders(folders);
    }
    async removeFolder(name) {
        const folders = this.getFolders().filter(f => f.name !== name);
        await this.saveFolders(folders);
    }
    async renameFolder(oldName, newName) {
        const folders = this.getFolders();
        const folder = folders.find(f => f.name === oldName);
        if (folder) {
            folder.name = newName;
            await this.saveFolders(folders);
        }
    }
    resolveAbsolutePath(folder) {
        if (path.isAbsolute(folder.path)) {
            return folder.path;
        }
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder) {
            return path.resolve(wsFolder, folder.path);
        }
        return path.resolve(folder.path);
    }
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
    async saveFolders(folders) {
        await vscode.workspace.getConfiguration('acacia-erd')
            .update('sourceFolders', folders, vscode.ConfigurationTarget.Workspace);
        this._onDidChange.fire(folders);
    }
    dispose() {
        this._configListener.dispose();
        this._onDidChange.dispose();
    }
}
exports.SourceFolderManager = SourceFolderManager;
//# sourceMappingURL=SourceFolderManager.js.map