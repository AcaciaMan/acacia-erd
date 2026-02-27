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
exports.DbConnectionManager = void 0;
const vscode = __importStar(require("vscode"));
class DbConnectionManager {
    _onDidChange = new vscode.EventEmitter();
    onDidChange = this._onDidChange.event;
    _configListener;
    constructor() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.dbConnections')) {
                this._onDidChange.fire(this.getConnections());
            }
        });
    }
    getConnections() {
        return vscode.workspace.getConfiguration('acacia-erd')
            .get('dbConnections', []);
    }
    async addConnection(name, connectionPath) {
        const connections = this.getConnections();
        if (connections.some(c => c.name === name)) {
            vscode.window.showWarningMessage(`DB connection "${name}" already exists.`);
            return;
        }
        connections.push({ name, connectionPath });
        await this.saveConnections(connections);
    }
    async removeConnection(name) {
        const connections = this.getConnections().filter(c => c.name !== name);
        await this.saveConnections(connections);
    }
    async renameConnection(oldName, newName) {
        const connections = this.getConnections();
        const conn = connections.find(c => c.name === oldName);
        if (conn) {
            conn.name = newName;
            await this.saveConnections(connections);
        }
    }
    async editConnectionPath(name, newPath) {
        const connections = this.getConnections();
        const conn = connections.find(c => c.name === name);
        if (conn) {
            conn.connectionPath = newPath;
            await this.saveConnections(connections);
        }
    }
    async saveConnections(connections) {
        await vscode.workspace.getConfiguration('acacia-erd')
            .update('dbConnections', connections, vscode.ConfigurationTarget.Workspace);
        this._onDidChange.fire(connections);
    }
    dispose() {
        this._configListener.dispose();
        this._onDidChange.dispose();
    }
}
exports.DbConnectionManager = DbConnectionManager;
//# sourceMappingURL=DbConnectionManager.js.map