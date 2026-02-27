"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERDViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const InteractiveERDPanel_1 = require("./InteractiveERDPanel");
const ERDGenerationPanel_1 = require("./ERDGenerationPanel");
const EntityManager_1 = require("../utils/EntityManager");
class ERDViewProvider {
    context;
    sourceFolderManager;
    dbConnectionManager;
    entitiesListManager;
    constructor(context, sourceFolderManager, dbConnectionManager, entitiesListManager) {
        this.context = context;
        this.sourceFolderManager = sourceFolderManager;
        this.dbConnectionManager = dbConnectionManager;
        this.entitiesListManager = entitiesListManager;
    }
    resolveWebviewView(webviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))]
        };
        const htmlPath = path.join(this.context.extensionPath, 'resources', 'manage_erd.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        webviewView.webview.html = htmlContent;
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'createERD':
                    vscode.window.showInformationMessage('Opening ERD Editor...');
                    InteractiveERDPanel_1.InteractiveERDPanel.createOrShow(this.context.extensionPath);
                    break;
                case 'generateERD':
                    vscode.window.showInformationMessage('Opening ERD Generator...');
                    ERDGenerationPanel_1.ERDGenerationPanel.createOrShow(this.context.extensionPath);
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
        const entityMgr = EntityManager_1.EntityManager.getInstance();
        entityMgr.onDidChangeEntities(() => this.sendStatus(webviewView.webview));
        entityMgr.onDidChangeEntitiesPath(() => this.sendStatus(webviewView.webview));
        this.sourceFolderManager.onDidChange(() => this.sendStatus(webviewView.webview));
        this.dbConnectionManager.onDidChange(() => this.sendStatus(webviewView.webview));
        this.entitiesListManager.onDidChange(() => this.sendStatus(webviewView.webview));
    }
    sendStatus(webview) {
        const entityMgr = EntityManager_1.EntityManager.getInstance();
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
exports.ERDViewProvider = ERDViewProvider;
//# sourceMappingURL=ERDViewProvider.js.map