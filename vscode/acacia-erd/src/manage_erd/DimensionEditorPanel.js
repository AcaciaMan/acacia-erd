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
exports.DimensionEditorPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const nonce_1 = require("../utils/nonce");
class DimensionEditorPanel {
    static currentPanel;
    _panel;
    _extensionPath;
    _dimensionManager;
    _sourceFolderManager;
    _dbConnectionManager;
    _entitiesListManager;
    _disposables = [];
    static createOrShow(extensionPath, dimensionManager, sourceFolderManager, dbConnectionManager, entitiesListManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (DimensionEditorPanel.currentPanel) {
            DimensionEditorPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('dimensionEditor', 'Dimension Editor', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))],
            retainContextWhenHidden: true,
        });
        DimensionEditorPanel.currentPanel = new DimensionEditorPanel(panel, extensionPath, dimensionManager, sourceFolderManager, dbConnectionManager, entitiesListManager);
    }
    constructor(panel, extensionPath, dimensionManager, sourceFolderManager, dbConnectionManager, entitiesListManager) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._dimensionManager = dimensionManager;
        this._sourceFolderManager = sourceFolderManager;
        this._dbConnectionManager = dbConnectionManager;
        this._entitiesListManager = entitiesListManager;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'addDimension':
                    this._dimensionManager.addDimension(message.name);
                    this.sendDimensionsUpdate();
                    break;
                case 'removeDimension':
                    this._dimensionManager.removeDimension(message.dimensionId);
                    this.sendDimensionsUpdate();
                    break;
                case 'renameDimension':
                    this._dimensionManager.renameDimension(message.dimensionId, message.newName);
                    this.sendDimensionsUpdate();
                    break;
                case 'addValue':
                    this._dimensionManager.addValue(message.dimensionId, message.label);
                    this.sendDimensionsUpdate();
                    break;
                case 'removeValue':
                    this._dimensionManager.removeValue(message.dimensionId, message.valueId);
                    this.sendDimensionsUpdate();
                    break;
                case 'renameValue':
                    this._dimensionManager.renameValue(message.dimensionId, message.valueId, message.newLabel);
                    this.sendDimensionsUpdate();
                    break;
                case 'updateAssignment':
                    await this.updateAssetDimensions(message.assetType, message.assetName, message.dimensionId, message.valueIds);
                    this.sendAssetsUpdate();
                    break;
                case 'ready':
                    this.sendDataToWebview();
                    break;
            }
        }, null, this._disposables);
        // Subscribe to external changes
        this._dimensionManager.onDidChangeDimensions(() => {
            this._panel.webview.postMessage({
                command: 'dimensionsUpdated',
                dimensions: this._dimensionManager.getDimensions(),
            });
        }, null, this._disposables);
        this._sourceFolderManager.onDidChange(() => this.sendAssetsUpdate(), null, this._disposables);
        this._dbConnectionManager.onDidChange(() => this.sendAssetsUpdate(), null, this._disposables);
        this._entitiesListManager.onDidChange(() => this.sendAssetsUpdate(), null, this._disposables);
    }
    dispose() {
        DimensionEditorPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    // ── Data helpers ──────────────────────────────────────────────
    getAllAssets() {
        const assets = [];
        for (const f of this._sourceFolderManager.getFolders()) {
            assets.push({
                type: 'sourceFolder',
                name: f.name,
                detail: f.path,
                dimensions: f.dimensions || {},
            });
        }
        for (const c of this._dbConnectionManager.getConnections()) {
            assets.push({
                type: 'dbConnection',
                name: c.name,
                detail: c.connectionPath,
                dimensions: c.dimensions || {},
            });
        }
        for (const l of this._entitiesListManager.getLists()) {
            assets.push({
                type: 'entitiesList',
                name: l.name,
                detail: l.jsonPath,
                dimensions: l.dimensions || {},
            });
        }
        return assets;
    }
    sendDataToWebview() {
        this._panel.webview.postMessage({
            command: 'loadData',
            dimensions: this._dimensionManager.getDimensions(),
            assets: this.getAllAssets(),
        });
    }
    sendDimensionsUpdate() {
        this._panel.webview.postMessage({
            command: 'dimensionsUpdated',
            dimensions: this._dimensionManager.getDimensions(),
        });
    }
    sendAssetsUpdate() {
        this._panel.webview.postMessage({
            command: 'assetsUpdated',
            assets: this.getAllAssets(),
        });
    }
    // ── Asset dimension updates ───────────────────────────────────
    async updateAssetDimensions(assetType, assetName, dimensionId, valueIds) {
        const config = vscode.workspace.getConfiguration('acacia-erd');
        switch (assetType) {
            case 'sourceFolder': {
                const folders = [...this._sourceFolderManager.getFolders()];
                const folder = folders.find(f => f.name === assetName);
                if (folder) {
                    if (!folder.dimensions) {
                        folder.dimensions = {};
                    }
                    folder.dimensions[dimensionId] = valueIds;
                    await config.update('sourceFolders', folders, vscode.ConfigurationTarget.Workspace);
                }
                break;
            }
            case 'dbConnection': {
                const connections = [...this._dbConnectionManager.getConnections()];
                const conn = connections.find(c => c.name === assetName);
                if (conn) {
                    if (!conn.dimensions) {
                        conn.dimensions = {};
                    }
                    conn.dimensions[dimensionId] = valueIds;
                    await config.update('dbConnections', connections, vscode.ConfigurationTarget.Workspace);
                }
                break;
            }
            case 'entitiesList': {
                const lists = [...this._entitiesListManager.getLists()];
                const list = lists.find(l => l.name === assetName);
                if (list) {
                    if (!list.dimensions) {
                        list.dimensions = {};
                    }
                    list.dimensions[dimensionId] = valueIds;
                    await config.update('entitiesLists', lists, vscode.ConfigurationTarget.Workspace);
                }
                break;
            }
        }
    }
    // ── HTML generation ───────────────────────────────────────────
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, 'resources', 'dimension_editor.js')));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, 'resources', 'dimension_editor.css')));
        const nonce = (0, nonce_1.getNonce)();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Dimension Editor</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>Dimension Editor</h1>
                <div class="header-subtitle">Manage dimension definitions and assign them to assets</div>
            </div>
        </div>
        <div id="editor-root">
            <!-- Tabs: Dimensions | Assignments -->
            <div class="tabs">
                <button class="tab active" data-tab="dimensions">Dimensions</button>
                <button class="tab" data-tab="assignments">Asset Assignments</button>
            </div>
            <div class="tab-content" id="dimensions-tab">
                <!-- Populated by JS -->
                <div class="loading">Loading dimensions...</div>
            </div>
            <div class="tab-content hidden" id="assignments-tab">
                <!-- Populated by JS -->
                <div class="loading">Loading assets...</div>
            </div>
        </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.DimensionEditorPanel = DimensionEditorPanel;
//# sourceMappingURL=DimensionEditorPanel.js.map