import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DescribeEntityPanel } from './DescribeEntity';
import { ERDGenerationPanel } from './ERDGenerationPanel';
import { EntityTreePanel } from './EntityTreePanel';
import { ObjectRegistry } from '../utils/ObjectRegistry';


export class InteractiveERDPanel {
    public static currentPanel: InteractiveERDPanel | undefined;
    public readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _place: vscode.Uri | undefined;

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
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    enableFindWidget: true,
                    enableForms: true
                }
            );

            InteractiveERDPanel.currentPanel = new InteractiveERDPanel(panel, extensionPath);
        }
    }

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._update();

        // Send a message to the interactive ERD webview to load the entities list
        const entitiesJsonPath = vscode.workspace.getConfiguration().get('acacia-erd.entitiesJsonPath');
        if (entitiesJsonPath) {
            this._panel.webview.postMessage({
                command: 'loadEntitiesList',
                entitiesListPath: entitiesJsonPath
            });
        }

        this._panel.onDidDispose(() => this.dispose(), null, []);

        this._panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'entityClicked':
                    vscode.window.showInformationMessage(`Entity clicked: ${message.entity.name}`);
                    break;
                case 'openEntityDetails':
                    this.openEntityDetails(message.entity);
                    break;
                case 'describeEntity':
                    DescribeEntityPanel.createOrShow(this._extensionPath, message.entity);
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
                    this._place = await saveSVGFile(message.svgContent, undefined);
                    break;    
                case 'saveSVG':
                    console.log('saveSVG', this._place?.fsPath);
                        this._place = await saveSVGFile(message.svgContent, this._place);
                        break;     
                case 'loadSVG':
                    this._place = await loadSVGFile(panel.webview);
                    break;    
                case 'chooseJSON':
                    ERDGenerationPanel.createOrShow(this._extensionPath);
                    break;
                case 'chooseEntitiesList':
                    chooseEntitiesList(panel.webview);
                    break;     
                case 'deleteEntity':
                    deleteEntity(message.entityId);
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

        const generateScriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'generate_erd.js')
        );
        const generateScriptUri = this._panel.webview.asWebviewUri(generateScriptPathOnDisk);

        const pluralizeScriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'pluralize.js')
        );
        const pluralizeScriptUri = this._panel.webview.asWebviewUri(pluralizeScriptPathOnDisk);

        const iconsScriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'resources', 'icons.js')
        );
        const iconsScriptUri = this._panel.webview.asWebviewUri(iconsScriptPathOnDisk);

        htmlContent = htmlContent.replace(
            '<script src="/resources/interactive_erd.js"></script>',
            `<script src="${scriptUri}"></script>`
        ).replace(
            '<script src="/resources/usage_erd.js"></script>',
            `<script src="${usageScriptUri}"></script>`
        ).replace(
            '<script src="/resources/generate_erd.js"></script>',
            `<script src="${generateScriptUri}"></script>`
        ).replace(
            '<script src="/resources/pluralize.js"></script>',
            `<script src="${pluralizeScriptUri}"></script>`
        ).replace(
            '<script src="/resources/icons.js"></script>',
            `<script src="${iconsScriptUri}"></script>`
        );

        this._panel.webview.html = htmlContent;
    }

    public async openEntityDetails(entity: { id: string, name: string, description?: string, columns?: string[], linkedEntities?: string[] }) {
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
            description: entity.description || "Description of " + entity.name,
            columns: entity.columns || ["Column1", "Column2", "Column3"],
            linkedEntities: entity.linkedEntities || []
        };

        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'saveEntity':
                    this.saveEntity(message.entity);
                    panel.dispose();
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
                    panel.dispose();
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

async function saveSVGFile(svgContent: string, place: vscode.Uri | undefined): Promise<vscode.Uri | undefined> {

    let result: vscode.Uri | undefined = undefined;
    if (place !== undefined) {
        result = place;
    } else {
        const options: vscode.SaveDialogOptions = {
            saveLabel: 'Save SVG',
            filters: {
                'SVG Files': ['svg']
            }
        };

        place = await vscode.window.showSaveDialog(options);
    }

  if (place !== undefined) {
    const svgWithDimensions = svgContent.replace(
      '<svg ',
      '<svg width="1000" height="1000" style="background-color: white;" '
    );

    fs.writeFileSync(place.fsPath, svgWithDimensions);
    vscode.window.showInformationMessage('SVG file saved successfully');   
    result = place;
  }
    return result;
}

async function loadSVGFile(webview: vscode.Webview): Promise<vscode.Uri | undefined> {
    let result: vscode.Uri | undefined = undefined;
    const fileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Open SVG',
        filters: {
            'SVG Files': ['svg']
        }
    });

    if (fileUri && fileUri[0]) {
        result = fileUri[0];
        const svgContent = fs.readFileSync(fileUri[0].fsPath, 'utf8');

        const svgWithoutDimensions = svgContent.replace(
            /<svg[^>]*?xml/,
            '<svg id="erd-svg" xml'
        );
        webview.postMessage({
            command: 'loadSVGContent',
            svgContent: svgWithoutDimensions
        });
    }

    return result;

}

export function chooseJSONFile(webview: vscode.Webview, parameters: { maxEntities: number, discoverLinkedEntities: boolean, entityName: string }) {
    try {
    const entitiesJsonPath = vscode.workspace.getConfiguration().get('acacia-erd.entitiesJsonPath');
            if (typeof entitiesJsonPath === 'string') {
                const jsonContent = fs.readFileSync(entitiesJsonPath, 'utf8');
                const entities = JSON.parse(jsonContent);
                webview.postMessage({
                    command: 'loadEntities',
                    entities: entities,
                    parameters: parameters
                });
            }
        } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage('Error loading JSON file: ' + error.message);
                } else {
                    vscode.window.showErrorMessage('Error loading JSON file');
                }
        }
}

function chooseEntitiesList(webview: vscode.Webview) {
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Open JSON',
        filters: {
            'JSON Files': ['json']
        }
    };

    vscode.window.showOpenDialog(options).then(fileUri => {
        if (fileUri && fileUri[0]) {
            // update workspace setting with the path to the entities list
            vscode.workspace.getConfiguration().update('acacia-erd.entitiesJsonPath', fileUri[0].fsPath, false).then(() => {

                // reload the entities list in the EntityTreePanel
                const entityTreePanel = ObjectRegistry.getInstance().get<EntityTreePanel>('EntityTreePanel');
                if (entityTreePanel) {
                    if (entityTreePanel._webviewView) {
                        entityTreePanel._loadEntities(entityTreePanel._webviewView.webview);
                    } else {
                        vscode.window.showErrorMessage('EntityTreePanel webview is not available.');
                    }
                }

            webview.postMessage({
                command: 'loadEntitiesList',
                entitiesListPath: fileUri[0].fsPath
            });
        });
    }

    });
}

function deleteEntity(entityId: string) {
    // Implement any additional logic needed for deleting the entity
    vscode.window.showInformationMessage(`Entity ${entityId} deleted`);
}