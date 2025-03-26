import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { InteractiveERDPanel } from './InteractiveERDPanel';

export class EntityTreePanel implements vscode.WebviewViewProvider {

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
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
                <ul id="entity-tree">
                    <!-- Tree will be populated by JavaScript -->
                </ul>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    private _loadEntities(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration('acacia-erd');
        const entitiesPath = config.get<string>('entitiesJsonPath', 'resources/entities.json');

        fs.readFile(entitiesPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading entities.json:', err);
                vscode.window.showErrorMessage('Error reading entities.json' + err);
                return;
            }
            const entities = JSON.parse(data);
            webview.postMessage({ command: 'loadEntities', entities });
        });
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