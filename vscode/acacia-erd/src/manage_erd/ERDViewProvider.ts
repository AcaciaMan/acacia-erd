import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


export class ERDViewProvider implements vscode.WebviewViewProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))]
        };

        const htmlPath = path.join(this.context.extensionPath, 'resources', 'manage_erd.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        webviewView.webview.html = htmlContent;

        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'createERD':
                    vscode.window.showInformationMessage('Creating a new ERD...');
                    // Add your logic to create a new ERD here
                    break;
            }
        });
    }
}