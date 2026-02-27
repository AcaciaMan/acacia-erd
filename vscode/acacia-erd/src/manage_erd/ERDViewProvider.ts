import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { InteractiveERDPanel } from './InteractiveERDPanel';
import { ERDGenerationPanel } from './ERDGenerationPanel';
import { EntityManager } from '../utils/EntityManager';
import { SourceFolderManager } from '../utils/SourceFolderManager';
import { DbConnectionManager } from '../utils/DbConnectionManager';
import { EntitiesListManager } from '../utils/EntitiesListManager';
import { DimensionManager } from '../utils/DimensionManager';

export class ERDViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly sourceFolderManager: SourceFolderManager,
        private readonly dbConnectionManager: DbConnectionManager,
        private readonly entitiesListManager: EntitiesListManager,
        private readonly dimensionManager?: DimensionManager
    ) {}

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
                    InteractiveERDPanel.createOrShow(this.context.extensionPath, this.dimensionManager, this.entitiesListManager);
                    break;
                case 'generateERD':
                    vscode.window.showInformationMessage('Opening ERD Generator...');
                    ERDGenerationPanel.createOrShow(this.context.extensionPath);
                    break;
                case 'viewEntities':
                    // Focus on the Entity Tree view
                    vscode.commands.executeCommand('openEntityTree.focus');
                    break;
                case 'viewAssets':
                    vscode.commands.executeCommand('acaciaAssets.focus');
                    break;
                case 'requestStatus':
                    this.sendStatus(webviewView.webview);
                    break;
                case 'refresh':
                    // Refresh the webview
                    webviewView.webview.html = htmlContent;
                    vscode.window.showInformationMessage('View refreshed');
                    break;
            }
        });

        // Subscribe to changes to update status
        const entityMgr = EntityManager.getInstance();
        entityMgr.onDidChangeEntities(() => this.sendStatus(webviewView.webview));
        entityMgr.onDidChangeEntitiesPath(() => this.sendStatus(webviewView.webview));
        this.sourceFolderManager.onDidChange(() => this.sendStatus(webviewView.webview));
        this.dbConnectionManager.onDidChange(() => this.sendStatus(webviewView.webview));
        this.entitiesListManager.onDidChange(() => this.sendStatus(webviewView.webview));
    }

    private sendStatus(webview: vscode.Webview): void {
        const entityMgr = EntityManager.getInstance();
        webview.postMessage({
            command: 'updateStatus',
            entityCount: entityMgr.getEntities().length,
            entitiesListCount: this.entitiesListManager.getLists().length,
            sourceFolderCount: this.sourceFolderManager.getFolders().length,
            dbConnectionCount: this.dbConnectionManager.getConnections().length,
            entitiesFilePath: entityMgr.getEntitiesJsonPath()
        });
    }
}