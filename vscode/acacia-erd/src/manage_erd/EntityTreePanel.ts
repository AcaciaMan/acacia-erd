import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ObjectRegistry } from '../utils/ObjectRegistry';

import { InteractiveERDPanel } from './InteractiveERDPanel';
import { EntityManager } from '../utils/EntityManager';
import { DescribeEntityPanel } from './DescribeEntity';

export class EntityTreePanel implements vscode.WebviewViewProvider {

    public _webviewView: vscode.WebviewView | undefined;
    private mgr: EntityManager = EntityManager.getInstance();

    constructor(private readonly context: vscode.ExtensionContext) {
        ObjectRegistry.getInstance().set('EntityTreePanel', this);
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

        webviewView.webview.onDidReceiveMessage(async message => {
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
                <div id="controls">
                    <input type="text" id="filter-input" placeholder="Filter entities..." />
                    <select id="sort-select">
                        <option value="name-asc">Sort by Name (A-Z)</option>
                        <option value="name-desc">Sort by Name (Z-A)</option>
                    </select>
                </div>
                <ul id="entity-tree">
                    <!-- Tree will be populated by JavaScript -->
                </ul>
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