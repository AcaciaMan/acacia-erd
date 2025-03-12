import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class InteractiveERDPanel {
    public static currentPanel: InteractiveERDPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.reveal(column);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'interactiveERD',
                'Interactive ERD',
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))]
                }
            );

            InteractiveERDPanel.currentPanel = new InteractiveERDPanel(panel, extensionPath);
        }
    }

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, []);

        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'entityClicked':
                    vscode.window.showInformationMessage(`Entity clicked: ${message.entity}`);
                    break;
            }
        });
    }

    public dispose() {
        InteractiveERDPanel.currentPanel = undefined;
        this._panel.dispose();
    }

    private _update() {
        const htmlPath = path.join(this._extensionPath, 'resources', 'interactive_erd.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        this._panel.webview.html = htmlContent;
    }
}