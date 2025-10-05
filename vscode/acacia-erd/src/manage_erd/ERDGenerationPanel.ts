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
                case 'cancel':
                    this._panel.dispose();
                    break;
                case 'showError':
                    vscode.window.showErrorMessage(message.message);
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
                <title>Generate ERD</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <svg class="header-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z"/>
                            <path d="M11 5H5v1h6V5zm0 2H5v1h6V7zm0 2H5v1h6V9z"/>
                        </svg>
                        <div class="header-content">
                            <h1>Generate ERD</h1>
                            <div class="header-subtitle">Configure parameters for entity relationship diagram generation</div>
                        </div>
                    </div>

                    <div class="info-banner">
                        <strong>💡 Quick Start:</strong> Choose a preset below or customize your own settings. The generator will create an interactive ERD based on your entity data.
                    </div>

                    <div class="presets-section">
                        <div class="presets-title">
                            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z"/>
                            </svg>
                            Quick Presets
                        </div>
                        <div class="presets-grid">
                            <div class="preset-card" data-preset="small">
                                <div class="preset-name">Small</div>
                                <div class="preset-description">Up to 5 entities</div>
                            </div>
                            <div class="preset-card" data-preset="medium">
                                <div class="preset-name">Medium</div>
                                <div class="preset-description">Up to 15 entities</div>
                            </div>
                            <div class="preset-card" data-preset="large">
                                <div class="preset-name">Large</div>
                                <div class="preset-description">Up to 30 entities</div>
                            </div>
                            <div class="preset-card" data-preset="all">
                                <div class="preset-name">All</div>
                                <div class="preset-description">All entities</div>
                            </div>
                        </div>
                    </div>

                    <form id="erd-generation-form">
                        <div class="form-section">
                            <div class="section-title">
                                <svg class="section-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 2h-12l-.5.5v11l.5.5h12l.5-.5v-11l-.5-.5zM13 13H2V3h11v10z"/>
                                    <path d="M4 5h8v1H4V5zm0 2h8v1H4V7zm0 2h5v1H4V9z"/>
                                </svg>
                                Generation Settings
                            </div>

                            <div class="form-group">
                                <label for="maxEntities">
                                    Maximum Entities
                                    <span class="range-value" id="maxEntitiesValue">10</span>
                                </label>
                                <div class="range-container">
                                    <input type="range" id="maxEntities" name="maxEntities" min="1" max="100" value="10">
                                    <div class="range-labels">
                                        <span>1</span>
                                        <span>100</span>
                                    </div>
                                </div>
                                <div class="input-hint">
                                    <svg class="hint-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.5 11h-1v-1h1v1zm0-2h-1V5h1v5z"/>
                                    </svg>
                                    <span>Limit the number of entities to include in the diagram (0 = unlimited)</span>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="checkbox-group">
                                    <input type="checkbox" id="discoverLinkedEntities" name="discoverLinkedEntities" checked>
                                    <div class="checkbox-content">
                                        <span class="checkbox-label">Auto-discover Relationships</span>
                                        <span class="checkbox-description">Automatically identify and include entities linked by foreign key references</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="advanced-toggle" id="advancedToggle">
                            <div class="advanced-toggle-label">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 3.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zM8 7a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 7zm5 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 13 7zM3 7a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 3 7z"/>
                                </svg>
                                Advanced Options
                            </div>
                            <svg class="advanced-toggle-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 6l4 4 4-4H4z"/>
                            </svg>
                        </div>

                        <div class="advanced-content" id="advancedContent">
                            <div class="form-section">
                                <div class="section-title">
                                    <svg class="section-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.5 10h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2C12 2.5 9.5 0 6.5 0S1 2.5 1 5.5 3.5 11 6.5 11c1.6 0 3.1-.6 4.2-1.6l.3.3v.8l5 5 1.5-1.5-5-5zm-5 0C4 10 2 8 2 5.5S4 1 6.5 1 11 3 11 5.5 9 10 6.5 10z"/>
                                    </svg>
                                    Focus on Specific Entity <span class="label-optional">(optional)</span>
                                </div>

                                <div class="form-group">
                                    <label for="entityName">Entity Name</label>
                                    <input type="text" id="entityName" name="entityName" placeholder="e.g., User, Product, Order">
                                    <div class="input-hint">
                                        <svg class="hint-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.5 11h-1v-1h1v1zm0-2h-1V5h1v5z"/>
                                        </svg>
                                        <span>Generate ERD centered around a specific entity and its relationships</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="button-group">
                            <button type="button" class="btn-secondary" id="cancelButton">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.5 10.5L8 8l-3.5 3.5-1-1L7 7 3.5 3.5l1-1L8 6l3.5-3.5 1 1L9 7l3.5 3.5-1 1z"/>
                                </svg>
                                Cancel
                            </button>
                            <button type="submit" class="btn-primary">
                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z"/>
                                </svg>
                                Generate ERD
                            </button>
                        </div>
                    </form>
                </div>
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