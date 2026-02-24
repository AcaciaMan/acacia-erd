import * as vscode from 'vscode';
import * as path from 'path';
import { Entity } from '../utils/EntityManager';

export class DescribeEntityPanel {
    public static currentPanel: DescribeEntityPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string, entity: Entity) {
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

    private constructor(panel: vscode.WebviewPanel, extensionPath: string, entity: Entity) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._update(entity);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            _e => {
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

    private _update(entity: Entity) {
        const webview = this._panel.webview;

        this._panel.webview.html = this._getHtmlForWebview(webview, entity);
    }

    private _getHtmlForWebview(webview: vscode.Webview, entity: Entity) {
        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'describe_entity.js')
        );
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        const stylePathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'describe_entity.css')
        );
        const styleUri = webview.asWebviewUri(stylePathOnDisk);

        const nonce = getNonce();
        
        const columns = entity.columns || [];
        const linkedEntities = entity.linkedEntities || [];
        const description = entity.description || 'No description available';

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Describe Entity - ${entity.name}</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="header-content">
                            <div class="header-title">
                                <svg class="entity-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z"/>
                                    <path d="M11 5H5v1h6V5zm0 2H5v1h6V7zm0 2H5v1h6V9z"/>
                                </svg>
                                <h1 class="entity-name">${entity.name}</h1>
                            </div>
                            <p class="entity-description">${description}</p>
                        </div>
                        <div class="header-actions">
                            <button class="action-button" onclick="window.print()">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13 4V1H3v3H1v7h2v4h10v-4h2V4h-2zM4 2h8v2H4V2zm8 12H4V9h8v5zm2-5h-1V8H3v1H2V5h12v4z"/>
                                </svg>
                                Print
                            </button>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/>
                                </svg>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">Columns</div>
                                <div class="stat-value">${columns.length}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 2L1 5v5l7 3 7-3V5l-7-3zm0 1.5L13.5 6 8 8.5 2.5 6 8 3.5zM2 7.2L7.5 10v4.3L2 11.8V7.2zm6.5 7.1V10l5.5-2.8v4.6l-5.5 2.5z"/>
                                </svg>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">Relationships</div>
                                <div class="stat-value">${linkedEntities.length}</div>
                            </div>
                        </div>
                    </div>

                    <div class="table-section">
                        <div class="table-header">
                            <div class="table-title">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/>
                                </svg>
                                Columns
                            </div>
                            <div class="search-box">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.5 10h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2C12 2.5 9.5 0 6.5 0S1 2.5 1 5.5 3.5 11 6.5 11c1.6 0 3.1-.6 4.2-1.6l.3.3v.8l5 5 1.5-1.5-5-5zm-5 0C4 10 2 8 2 5.5S4 1 6.5 1 11 3 11 5.5 9 10 6.5 10z"/>
                                </svg>
                                <input type="text" id="search-input" placeholder="Search columns...">
                            </div>
                        </div>
                        <div class="table-container">
                            ${columns.length > 0 ? `
                                <table id="entity-table">
                                    <thead>
                                        <tr>
                                            <th class="sortable" data-sort="order">Order</th>
                                            <th class="sortable" data-sort="name">Column Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${columns.map((column: string, index: number) => `
                                            <tr>
                                                <td><span class="column-order">${index + 1}</span></td>
                                                <td><span class="column-name">${column}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : `
                                <div class="empty-state">
                                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/>
                                    </svg>
                                    <div class="empty-state-title">No columns defined</div>
                                    <div class="empty-state-description">This entity doesn't have any columns yet.</div>
                                </div>
                            `}
                        </div>
                    </div>

                    ${linkedEntities.length > 0 ? `
                        <div class="relationships-section">
                            <div class="relationships-title">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 2L1 5v5l7 3 7-3V5l-7-3zm0 1.5L13.5 6 8 8.5 2.5 6 8 3.5zM2 7.2L7.5 10v4.3L2 11.8V7.2zm6.5 7.1V10l5.5-2.8v4.6l-5.5 2.5z"/>
                                </svg>
                                Linked Entities
                            </div>
                            <div class="relationships-grid">
                                ${linkedEntities.map((linkedEntity: string) => `
                                    <div class="relationship-tag">
                                        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z"/>
                                        </svg>
                                        ${linkedEntity}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
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