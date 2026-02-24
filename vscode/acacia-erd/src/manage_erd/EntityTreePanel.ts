import * as vscode from 'vscode';
import * as path from 'path';
import { ObjectRegistry } from '../utils/ObjectRegistry';

import { InteractiveERDPanel } from './InteractiveERDPanel';
import { EntityManager, Entity } from '../utils/EntityManager';
import { DescribeEntityPanel } from './DescribeEntity';

type EntityTreeMessage =
    | { command: 'alert'; text: string }
    | { command: 'openEntityDetails'; entity: Entity }
    | { command: 'describeEntity'; entity: Entity }
    | { command: 'deleteEntity'; entityName: string }
    | { command: 'showInfoMessage'; message: string };

export class EntityTreePanel implements vscode.WebviewViewProvider {

    public _webviewView: vscode.WebviewView | undefined;
    private mgr: EntityManager = EntityManager.getInstance();

    constructor(private readonly context: vscode.ExtensionContext) {
        ObjectRegistry.getInstance().set('EntityTreePanel', this);

        // Subscribe to entity changes
        this.mgr.onDidChangeEntities((entities) => {
            if (this._webviewView) {
                this._webviewView.webview.postMessage({ command: 'loadEntities', entities });
            }
        });
    }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._webviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))]
        };

        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this.context.extensionPath, 'resources', 'entity_tree.js')
        );
        const scriptUri = webviewView.webview.asWebviewUri(scriptPathOnDisk);

        const stylePathOnDisk = vscode.Uri.file(
            path.join(this.context.extensionPath, 'resources', 'entity_tree.css')
        );
        const styleUri = webviewView.webview.asWebviewUri(stylePathOnDisk);

        const nonce = getNonce();

        webviewView.webview.html = this._getHtmlForWebview(scriptUri, styleUri, nonce);

        this._loadEntities(webviewView.webview);

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._loadEntities(webviewView.webview);
            }
        });

        webviewView.webview.onDidReceiveMessage(async (message: EntityTreeMessage) => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
                case 'openEntityDetails':
                    InteractiveERDPanel.currentPanel?.openEntityDetails(message.entity);
                    return;    
                case 'describeEntity':
                    DescribeEntityPanel.createOrShow(this.context.extensionPath, message.entity);
                    return;
                case 'deleteEntity':
                    this.deleteEntity(message.entityName);
                    // send a message to the InteractiveERDPanel to delete the entity from the graph
                    InteractiveERDPanel.currentPanel?.deleteEntity(message.entityName);
                    return;    
                case 'showInfoMessage':
                    vscode.window.showInformationMessage(message.message);
                    return;
            }
        });
    }

    private _getHtmlForWebview(scriptUri: vscode.Uri, styleUri: vscode.Uri, nonce: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Entity Tree</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <div class="header">
                    <div class="header-title">Entities</div>
                    <div class="stats-bar">
                        <div class="stat-item">
                            <span>Total:</span>
                            <span class="stat-value" id="total-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span>Visible:</span>
                            <span class="stat-value" id="visible-count">0</span>
                        </div>
                    </div>
                </div>
                <div id="controls">
                    <div class="search-container">
                        <svg class="search-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.5 10h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2C12 2.5 9.5 0 6.5 0S1 2.5 1 5.5 3.5 11 6.5 11c1.6 0 3.1-.6 4.2-1.6l.3.3v.8l5 5 1.5-1.5-5-5zm-5 0C4 10 2 8 2 5.5S4 1 6.5 1 11 3 11 5.5 9 10 6.5 10z"/>
                        </svg>
                        <input type="text" id="filter-input" placeholder="Search entities..." />
                    </div>
                    <div class="controls-row">
                        <select id="sort-select">
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="columns-desc">Most Columns</option>
                            <option value="relations-desc">Most Relations</option>
                        </select>
                        <div class="view-toggle">
                            <button id="list-view" class="active" title="List view">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/>
                                </svg>
                            </button>
                            <button id="card-view" title="Card view">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1h6v6H1V1zm1 1v4h4V2H2zm7-1h6v6H9V1zm1 1v4h4V2h-4zM1 9h6v6H1V9zm1 1v4h4v-4H2zm7-1h6v6H9V9zm1 1v4h4v-4h-4z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="entity-container">
                    <ul id="entity-tree">
                        <!-- Tree will be populated by JavaScript -->
                    </ul>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    private deleteEntity(entityName: string) {
        this.mgr.deleteEntity(entityName);
    
        vscode.window.showInformationMessage(`Entity with ID ${entityName} has been deleted.`);
    }

    public _loadEntities(webview: vscode.Webview) {
        const entities = this.mgr.getEntities();
            webview.postMessage({ command: 'loadEntities', entities });
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}