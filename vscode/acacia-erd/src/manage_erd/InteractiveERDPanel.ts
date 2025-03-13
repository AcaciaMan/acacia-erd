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
                    localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))],
                    retainContextWhenHidden: true
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
                    vscode.window.showInformationMessage(`Entity clicked: ${message.entity.name}`);
                    break;
                case 'openEntityDetails':
                    this.openEntityDetails(message.entity);
                    break;
                case 'saveEntity':
                    this.saveEntity(message.entity);
                    break;
                case 'usageClicked':
                    vscode.window.showInformationMessage(`Usage clicked: ${message.usage.text}`);
                    break;
                case 'openUsageDetails':
                    this.openUsageDetails(message.usage);
                    break;
                case 'saveUsage':
                    this.saveUsage(message.usage);
                    break;
                case 'createSVG':
                    saveSVGFile(message.svgContent);
                    break;    
                case 'loadSVG':
                    loadSVGFile(panel.webview);
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
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'interactive_erd.js')
        );
        const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);

        const usageScriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'usage_erd.js')
        );
        const usageScriptUri = this._panel.webview.asWebviewUri(usageScriptPathOnDisk);

        htmlContent = htmlContent.replace(
            '<script src="/resources/interactive_erd.js"></script>',
            `<script src="${scriptUri}"></script>`
        ).replace(
            '<script src="/resources/usage_erd.js"></script>',
            `<script src="${usageScriptUri}"></script>`
        );

        this._panel.webview.html = htmlContent;
    }

    private async openEntityDetails(entity: { id: string, name: string }) {
        const panel = vscode.window.createWebviewPanel(
            'editEntity',
            `Edit ${entity.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(this._extensionPath, 'resources'))],
                retainContextWhenHidden: true
            }
        );

        const htmlPath = path.join(this._extensionPath, 'resources', 'edit_entity.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;

        const entityDetails = {
            id: entity.id,
            name: entity.name,
            description: "Description of " + entity.name,
            columns: ["Column1", "Column2", "Column3"]
        };

        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'saveEntity':
                    this.saveEntity(message.entity);
                    break;
            }
        });

        panel.webview.postMessage(entityDetails);
    }

    private saveEntity(entity: { id: string, name: string, description: string, columns: string[] }) {
        vscode.window.showInformationMessage(`Entity saved: ${entity.name}`);
        // Send a message to the interactive ERD webview to update the entity
        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.webview.postMessage({
                command: 'updateEntity',
                entity: entity
            });
        }
    }

    private async openUsageDetails(usage: { id: string, text: string }) {
        const panel = vscode.window.createWebviewPanel(
            'editUsage',
            `Edit Usage`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(this._extensionPath, 'resources'))],
                retainContextWhenHidden: true
            }
        );

        const htmlPath = path.join(this._extensionPath, 'resources', 'edit_usage.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;

        const usageDetails = {
            id: usage.id,
            text: usage.text
        };

        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'saveUsage':
                    this.saveUsage(message.usage);
                    break;
            }
        });

        panel.webview.postMessage(usageDetails);
    }

    private saveUsage(usage: { id: string, text: string }) {
        vscode.window.showInformationMessage(`Usage saved: ${usage.text}`);
        // Send a message to the interactive ERD webview to update the usage
        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.webview.postMessage({
                command: 'updateUsage',
                usage: usage
            });
        }
    }

    
}

function saveSVGFile(svgContent: string) {
    const options: vscode.SaveDialogOptions = {
        saveLabel: 'Save SVG',
        filters: {
            'SVG Files': ['svg']
        }
    };

    vscode.window.showSaveDialog(options).then(fileUri => {
        if (fileUri) {
            const svgWithDimensions = svgContent.replace(
                '<svg ',
                '<svg width="1000" height="1000" style="background-color: white;" '
            );

            fs.writeFileSync(fileUri.fsPath, svgWithDimensions);
            vscode.window.showInformationMessage('SVG file saved successfully');
        }
    });
}

function loadSVGFile(webview: vscode.Webview) {
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Open SVG',
        filters: {
            'SVG Files': ['svg']
        }
    };

    vscode.window.showOpenDialog(options).then(fileUri => {
        if (fileUri && fileUri[0]) {
            const svgContent = fs.readFileSync(fileUri[0].fsPath, 'utf8');

            const svgWithoutDimensions = svgContent.replace(
                /<svg[^>]*xml/,
                '<svg xml'
            );
            webview.postMessage({
                command: 'loadSVGContent',
                svgContent: svgWithoutDimensions
            });
        }
    });
}