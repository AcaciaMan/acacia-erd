import * as vscode from 'vscode';
import * as path from 'path';

export class DescribeEntityPanel {
    public static currentPanel: DescribeEntityPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string, entity: any) {
        const column = vscode.ViewColumn.Two;

        if (DescribeEntityPanel.currentPanel) {
            DescribeEntityPanel.currentPanel._panel.reveal(column);
            DescribeEntityPanel.currentPanel._update(entity);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'describeEntity',
                'Describe Entity',
                column,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))],
                }
            );

            DescribeEntityPanel.currentPanel = new DescribeEntityPanel(panel, extensionPath, entity);
        }
    }

    private constructor(panel: vscode.WebviewPanel, extensionPath: string, entity: any) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._update(entity);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update(entity);
                }
            },
            null,
            this._disposables
        );

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        DescribeEntityPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(entity: any) {
        const webview = this._panel.webview;

        this._panel.webview.html = this._getHtmlForWebview(webview, entity);
    }

    private _getHtmlForWebview(webview: vscode.Webview, entity: any) {
        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'describe_entity.js')
        );
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        const stylePathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'describe_entity.css')
        );
        const styleUri = webview.asWebviewUri(stylePathOnDisk);

        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Describe Entity</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <h1 id="entity-name">${entity.name}</h1>
                <table id="entity-table">
                    <thead>
                        <tr>
                            <th data-sort="order">Order</th>
                            <th data-sort="name">Column Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entity.columns.map((column: any, index: number) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${column}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
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