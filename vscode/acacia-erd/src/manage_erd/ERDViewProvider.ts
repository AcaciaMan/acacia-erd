import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { InteractiveERDPanel } from './InteractiveERDPanel';
import { ERDGenerationPanel } from './ERDGenerationPanel';

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

        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'createERD':
                    vscode.window.showInformationMessage('Opening ERD Editor...');
                    InteractiveERDPanel.createOrShow(this.context.extensionPath);
                    break;
                case 'generateERD':
                    vscode.window.showInformationMessage('Opening ERD Generator...');
                    ERDGenerationPanel.createOrShow(this.context.extensionPath);
                    break;
                case 'viewEntities':
                    // Focus on the Entity Tree view
                    vscode.commands.executeCommand('openEntityTree.focus');
                    break;
                case 'refresh':
                    // Refresh the webview
                    webviewView.webview.html = htmlContent;
                    vscode.window.showInformationMessage('View refreshed');
                    break;
            }
        });
    }

}