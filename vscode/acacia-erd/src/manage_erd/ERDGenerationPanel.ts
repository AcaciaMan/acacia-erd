import * as vscode from 'vscode';
import * as path from 'path';
import { chooseJSONFile, InteractiveERDPanel } from './InteractiveERDPanel';



export class ERDGenerationPanel {
    public static currentPanel: ERDGenerationPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (ERDGenerationPanel.currentPanel) {
            ERDGenerationPanel.currentPanel._panel.reveal(column);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'erdGeneration',
                'ERD Generation Parameters',
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))],
                }
            );

            ERDGenerationPanel.currentPanel = new ERDGenerationPanel(panel, extensionPath);
        }
    }

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'generateERD':
                    this.generateERD(message.parameters);
                    this._panel.dispose();
                    break;
            }
        });
    }

    public dispose() {
        ERDGenerationPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;

        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'erd_generation.js')
        );
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        const stylePathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'erd_generation.css')
        );
        const styleUri = webview.asWebviewUri(stylePathOnDisk);

        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ERD Generation Parameters</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <h1>ERD Generation Parameters</h1>
                <form id="erd-generation-form">
                    <label for="maxEntities">Max Entities Amount:</label>
                    <input type="number" id="maxEntities" name="maxEntities" min="1" required>
                    <br>
                    <label for="discoverLinkedEntities">Discover Linked Entities By Names:</label>
                    <input type="checkbox" id="discoverLinkedEntities" name="discoverLinkedEntities">
                    <br>
                    <label for="entityName">Entity Name:</label>
                    <input type="text" id="entityName" name="entityName">
                    <br>
                    <button type="submit">Generate ERD</button>
                </form>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    private generateERD(parameters: { maxEntities: number, discoverLinkedEntities: boolean, entityName: string }) {
        vscode.window.showInformationMessage(`Generating ERD for ${parameters.entityName} with max ${parameters.maxEntities} entities. Discover linked entities: ${parameters.discoverLinkedEntities}`);
        // Implement the ERD generation logic here
        if (InteractiveERDPanel.currentPanel) {
            chooseJSONFile(InteractiveERDPanel.currentPanel._panel.webview, parameters);
        } else {
            vscode.window.showErrorMessage('InteractiveERDPanel is not available.');
        }
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