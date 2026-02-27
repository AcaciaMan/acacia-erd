import * as vscode from 'vscode';
import * as path from 'path';
import { getNonce } from '../utils/nonce';
import { DimensionManager, DimensionAssignments } from '../utils/DimensionManager';
import { SourceFolderManager } from '../utils/SourceFolderManager';
import { DbConnectionManager } from '../utils/DbConnectionManager';
import { EntitiesListManager } from '../utils/EntitiesListManager';

/** Messages FROM the webview TO the extension */
type DimensionEditorMessage =
    // Dimension CRUD
    | { command: 'addDimension'; name: string }
    | { command: 'removeDimension'; dimensionId: string }
    | { command: 'renameDimension'; dimensionId: string; newName: string }
    // Value CRUD
    | { command: 'addValue'; dimensionId: string; label: string }
    | { command: 'removeValue'; dimensionId: string; valueId: string }
    | { command: 'renameValue'; dimensionId: string; valueId: string; newLabel: string }
    // Asset dimension assignment
    | { command: 'updateAssignment'; assetType: 'sourceFolder' | 'dbConnection' | 'entitiesList'; assetName: string; dimensionId: string; valueIds: string[] }
    // Lifecycle
    | { command: 'ready' };

/** Flattened asset representation for the webview */
interface AssetInfo {
    type: 'sourceFolder' | 'dbConnection' | 'entitiesList';
    name: string;
    detail: string;  // path or connectionPath or jsonPath
    dimensions: DimensionAssignments;
}

export class DimensionEditorPanel {
    public static currentPanel: DimensionEditorPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private readonly _dimensionManager: DimensionManager;
    private readonly _sourceFolderManager: SourceFolderManager;
    private readonly _dbConnectionManager: DbConnectionManager;
    private readonly _entitiesListManager: EntitiesListManager;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Opens the Dimension Editor and scrolls to / highlights a specific asset.
     * @param assetType  'sourceFolder' | 'dbConnection' | 'entitiesList'
     * @param assetName  The name of the asset to focus
     */
    public static focusAsset(
        extensionPath: string,
        dimensionManager: DimensionManager,
        sourceFolderManager: SourceFolderManager,
        dbConnectionManager: DbConnectionManager,
        entitiesListManager: EntitiesListManager,
        assetType: string,
        assetName: string
    ): void {
        // Ensure panel is open
        DimensionEditorPanel.createOrShow(
            extensionPath,
            dimensionManager,
            sourceFolderManager,
            dbConnectionManager,
            entitiesListManager
        );

        // Post focusAsset message once the webview is ready
        if (DimensionEditorPanel.currentPanel) {
            DimensionEditorPanel.currentPanel.focusAssetInWebview(assetType, assetName);
        }
    }

    /** Send a focusAsset message to the webview to scroll/highlight a specific asset. */
    public focusAssetInWebview(assetType: string, assetName: string): void {
        setTimeout(() => {
            this._panel.webview.postMessage({
                command: 'focusAsset',
                assetType,
                assetName,
            });
        }, 300);
    }

    public static createOrShow(
        extensionPath: string,
        dimensionManager: DimensionManager,
        sourceFolderManager: SourceFolderManager,
        dbConnectionManager: DbConnectionManager,
        entitiesListManager: EntitiesListManager
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DimensionEditorPanel.currentPanel) {
            DimensionEditorPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'dimensionEditor',
            'Dimension Editor',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))],
                retainContextWhenHidden: true,
            }
        );

        DimensionEditorPanel.currentPanel = new DimensionEditorPanel(
            panel,
            extensionPath,
            dimensionManager,
            sourceFolderManager,
            dbConnectionManager,
            entitiesListManager
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionPath: string,
        dimensionManager: DimensionManager,
        sourceFolderManager: SourceFolderManager,
        dbConnectionManager: DbConnectionManager,
        entitiesListManager: EntitiesListManager
    ) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._dimensionManager = dimensionManager;
        this._sourceFolderManager = sourceFolderManager;
        this._dbConnectionManager = dbConnectionManager;
        this._entitiesListManager = entitiesListManager;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message: DimensionEditorMessage) => {
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
                        await this.updateAssetDimensions(
                            message.assetType,
                            message.assetName,
                            message.dimensionId,
                            message.valueIds
                        );
                        this.sendAssetsUpdate();
                        break;

                    case 'ready':
                        this.sendDataToWebview();
                        break;
                }
            },
            null,
            this._disposables
        );

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

    public dispose(): void {
        DimensionEditorPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(): void {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    // ── Data helpers ──────────────────────────────────────────────

    private getAllAssets(): AssetInfo[] {
        const assets: AssetInfo[] = [];
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

    private sendDataToWebview(): void {
        this._panel.webview.postMessage({
            command: 'loadData',
            dimensions: this._dimensionManager.getDimensions(),
            assets: this.getAllAssets(),
        });
    }

    private sendDimensionsUpdate(): void {
        this._panel.webview.postMessage({
            command: 'dimensionsUpdated',
            dimensions: this._dimensionManager.getDimensions(),
        });
    }

    private sendAssetsUpdate(): void {
        this._panel.webview.postMessage({
            command: 'assetsUpdated',
            assets: this.getAllAssets(),
        });
    }

    // ── Asset dimension updates ───────────────────────────────────

    private async updateAssetDimensions(
        assetType: 'sourceFolder' | 'dbConnection' | 'entitiesList',
        assetName: string,
        dimensionId: string,
        valueIds: string[]
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration('acacia-erd');

        switch (assetType) {
            case 'sourceFolder': {
                const folders = [...this._sourceFolderManager.getFolders()];
                const folder = folders.find(f => f.name === assetName);
                if (folder) {
                    if (!folder.dimensions) { folder.dimensions = {}; }
                    folder.dimensions[dimensionId] = valueIds;
                    await config.update('sourceFolders', folders, vscode.ConfigurationTarget.Workspace);
                }
                break;
            }
            case 'dbConnection': {
                const connections = [...this._dbConnectionManager.getConnections()];
                const conn = connections.find(c => c.name === assetName);
                if (conn) {
                    if (!conn.dimensions) { conn.dimensions = {}; }
                    conn.dimensions[dimensionId] = valueIds;
                    await config.update('dbConnections', connections, vscode.ConfigurationTarget.Workspace);
                }
                break;
            }
            case 'entitiesList': {
                const lists = [...this._entitiesListManager.getLists()];
                const list = lists.find(l => l.name === assetName);
                if (list) {
                    if (!list.dimensions) { list.dimensions = {}; }
                    list.dimensions[dimensionId] = valueIds;
                    await config.update('entitiesLists', lists, vscode.ConfigurationTarget.Workspace);
                }
                break;
            }
        }
    }

    // ── HTML generation ───────────────────────────────────────────

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionPath, 'resources', 'dimension_editor.js'))
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionPath, 'resources', 'dimension_editor.css'))
        );
        const nonce = getNonce();

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
