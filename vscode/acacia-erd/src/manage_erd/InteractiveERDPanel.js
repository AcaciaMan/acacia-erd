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
exports.InteractiveERDPanel = void 0;
exports.chooseJSONFile = chooseJSONFile;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const DescribeEntity_1 = require("./DescribeEntity");
const ERDGenerationPanel_1 = require("./ERDGenerationPanel");
const em = __importStar(require("../utils/EntityManager"));
const HtmlExporter_1 = require("../utils/HtmlExporter");
const DiagramManager_1 = require("../utils/DiagramManager");
class InteractiveERDPanel {
    static currentPanel;
    _panel;
    _extensionPath;
    _place;
    mgr = em.EntityManager.getInstance();
    dimensionManager;
    entitiesListManager;
    /** The currently open diagram, or undefined if no diagram is loaded (freeform mode). */
    _currentDiagram;
    /** The name of the entities list this diagram belongs to. */
    _currentListName;
    /** The DiagramManager for the current diagram's entities list. */
    _currentDiagramManager;
    /**
     * Open a specific diagram in the ERD panel.
     * Creates the panel if needed, then loads the diagram data into the webview.
     */
    static openDiagram(extensionPath, diagram, listName, diagramManager, dimensionManager, entitiesListManager) {
        // Ensure the panel exists
        InteractiveERDPanel.createOrShow(extensionPath, dimensionManager, entitiesListManager);
        const panel = InteractiveERDPanel.currentPanel;
        if (panel) {
            panel._currentDiagram = diagram;
            panel._currentListName = listName;
            panel._currentDiagramManager = diagramManager;
            // Update panel title to show diagram name
            panel._panel.title = `ERD: ${diagram.name}`;
            // Send diagram data to webview along with full entity objects
            const allEntities = em.EntityManager.getInstance().getEntities();
            panel._panel.webview.postMessage({
                command: 'loadDiagram',
                diagram: {
                    id: diagram.id,
                    name: diagram.name,
                    entityIds: diagram.entityIds,
                    positions: diagram.positions
                },
                entities: allEntities
            });
        }
    }
    static createOrShow(extensionPath, dimensionManager, entitiesListManager) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.reveal(column);
        }
        else {
            const panel = vscode.window.createWebviewPanel('interactiveERD', 'Interactive ERD', column || vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))],
                retainContextWhenHidden: true,
                enableCommandUris: true,
                enableFindWidget: true,
                enableForms: true
            });
            InteractiveERDPanel.currentPanel = new InteractiveERDPanel(panel, extensionPath, dimensionManager, entitiesListManager);
        }
    }
    constructor(panel, extensionPath, dimensionManager, entitiesListManager) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this.dimensionManager = dimensionManager;
        this.entitiesListManager = entitiesListManager;
        this._update();
        // Subscribe to entity changes from EntityManager
        this.mgr.onDidChangeEntities((entities) => {
            this._panel.webview.postMessage({
                command: 'updateEntities',
                entities: entities
            });
        });
        // Subscribe to entities path changes to keep the path display in sync
        this.mgr.onDidChangeEntitiesPath((newPath) => {
            this._panel.webview.postMessage({
                command: 'loadEntitiesList',
                entitiesListPath: newPath
            });
            this.sendDimensionsToWebview();
        });
        // When dimensions change externally, update the display
        if (this.dimensionManager) {
            this.dimensionManager.onDidChangeDimensions(() => {
                this.sendDimensionsToWebview();
            });
        }
        // When entities list configs change (e.g., dimensions reassigned in editor)
        if (this.entitiesListManager) {
            this.entitiesListManager.onDidChange(() => {
                this.sendDimensionsToWebview();
            });
        }
        // Send a message to the interactive ERD webview to load the entities list
        const entitiesJsonPath = this.mgr.getEntitiesJsonPath();
        if (entitiesJsonPath) {
            this._panel.webview.postMessage({
                command: 'loadEntitiesList',
                entitiesListPath: entitiesJsonPath
            });
        }
        // Send initial dimensions
        this.sendDimensionsToWebview();
        this._panel.onDidDispose(() => this.dispose(), null, []);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'entityClicked':
                    vscode.window.showInformationMessage(`Entity clicked: ${message.entity.name}`);
                    break;
                case 'openEntityDetails':
                    this.openEntityDetails(message.entity);
                    break;
                case 'describeEntity':
                    DescribeEntity_1.DescribeEntityPanel.createOrShow(this._extensionPath, message.entity);
                    break;
                case 'saveEntity':
                    this.saveEntity(message.entity, message.oldEntity);
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
                case 'exportInteractiveHtml':
                    await this.exportToInteractiveHtml(message.svgContent, message.title);
                    break;
                case 'loadSVG':
                    this._place = await loadSVGFile(panel.webview);
                    break;
                case 'chooseJSON':
                    ERDGenerationPanel_1.ERDGenerationPanel.createOrShow(this._extensionPath);
                    break;
                case 'chooseEntitiesList':
                    await chooseEntitiesList(panel.webview);
                    break;
                case 'deleteEntity':
                    deleteEntity(message.entityId);
                    break;
                case 'saveDiagram':
                    await this.handleSaveDiagram(message.entityIds, message.positions, message.svgContent);
                    break;
                case 'saveAsDiagram':
                    await this.handleSaveAsDiagram(message.entityIds, message.positions, message.svgContent);
                    break;
                case 'getDiagramState':
                    // Webview is requesting current diagram info (e.g., after being restored)
                    if (this._currentDiagram) {
                        this._panel.webview.postMessage({
                            command: 'diagramInfo',
                            diagram: this._currentDiagram,
                            listName: this._currentListName
                        });
                    }
                    break;
            }
        });
    }
    dispose() {
        InteractiveERDPanel.currentPanel = undefined;
        this._currentDiagram = undefined;
        this._currentListName = undefined;
        this._currentDiagramManager = undefined;
        this._panel.dispose();
    }
    _update() {
        const htmlPath = path.join(this._extensionPath, 'resources', 'interactive_erd.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'resources', 'interactive_erd.js'));
        const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);
        const usageScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'resources', 'usage_erd.js'));
        const usageScriptUri = this._panel.webview.asWebviewUri(usageScriptPathOnDisk);
        const generateScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'resources', 'generate_erd.js'));
        const generateScriptUri = this._panel.webview.asWebviewUri(generateScriptPathOnDisk);
        const pluralizeScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'resources', 'pluralize.js'));
        const pluralizeScriptUri = this._panel.webview.asWebviewUri(pluralizeScriptPathOnDisk);
        const iconsScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'resources', 'icons.js'));
        const iconsScriptUri = this._panel.webview.asWebviewUri(iconsScriptPathOnDisk);
        htmlContent = htmlContent.replace('<script src="/resources/interactive_erd.js"></script>', `<script src="${scriptUri}"></script>`).replace('<script src="/resources/usage_erd.js"></script>', `<script src="${usageScriptUri}"></script>`).replace('<script src="/resources/generate_erd.js"></script>', `<script src="${generateScriptUri}"></script>`).replace('<script src="/resources/pluralize.js"></script>', `<script src="${pluralizeScriptUri}"></script>`).replace('<script src="/resources/icons.js"></script>', `<script src="${iconsScriptUri}"></script>`);
        this._panel.webview.html = htmlContent;
    }
    async openEntityDetails(entity) {
        const panel = vscode.window.createWebviewPanel('editEntity', `Edit ${entity.name}`, vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this._extensionPath, 'resources'))],
            retainContextWhenHidden: true
        });
        const htmlPath = path.join(this._extensionPath, 'resources', 'edit_entity.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;
        let entityDetails;
        try {
            // Try to get the full entity details from the manager
            entityDetails = this.mgr.getEntityByName(entity.name);
            console.log('Entity loaded from manager:', entityDetails);
        }
        catch (error) {
            // If not found in manager, use the entity passed in or create default
            console.log('Entity not found in manager, using passed entity or default');
            entityDetails = {
                id: entity.id,
                name: entity.name,
                description: entity.description || "Description of " + entity.name,
                columns: entity.columns || ["Column1", "Column2", "Column3"],
                linkedEntities: entity.linkedEntities || []
            };
        }
        panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'webviewReady':
                    // Webview is ready, now send the entity data
                    console.log('Sending entity data to webview:', entityDetails);
                    panel.webview.postMessage(entityDetails);
                    break;
                case 'saveEntity':
                    this.saveEntity(message.entity, message.oldEntity);
                    panel.dispose();
                    break;
            }
        });
    }
    deleteEntity(entityName) {
        // Send a message to the interactive ERD webview to update the entity
        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.webview.postMessage({
                command: 'deleteEntity',
                entityName: entityName
            });
        }
    }
    saveEntity(entity, oldEntity) {
        vscode.window.showInformationMessage(`Entity saved: ${entity.name}`);
        // Update the entity in the EntityManager
        const mgr = em.EntityManager.getInstance();
        mgr.updateEntity(entity, oldEntity);
        // Send a message to the interactive ERD webview to update the entity
        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.webview.postMessage({
                command: 'updateEntity',
                entity: entity
            });
        }
    }
    async openUsageDetails(usage) {
        const panel = vscode.window.createWebviewPanel('editUsage', `Edit Usage`, vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this._extensionPath, 'resources'))],
            retainContextWhenHidden: true
        });
        const htmlPath = path.join(this._extensionPath, 'resources', 'edit_usage.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;
        const usageDetails = {
            id: usage.id,
            text: usage.text
        };
        panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'saveUsage':
                    this.saveUsage(message.usage);
                    panel.dispose();
                    break;
            }
        });
        panel.webview.postMessage(usageDetails);
    }
    saveUsage(usage) {
        vscode.window.showInformationMessage(`Usage saved: ${usage.text}`);
        // Send a message to the interactive ERD webview to update the usage
        if (InteractiveERDPanel.currentPanel) {
            InteractiveERDPanel.currentPanel._panel.webview.postMessage({
                command: 'updateUsage',
                usage: usage
            });
        }
    }
    async exportToInteractiveHtml(svgContent, title) {
        try {
            const exportData = HtmlExporter_1.HtmlExporter.createExportData(svgContent, title);
            await HtmlExporter_1.HtmlExporter.exportToHtml(this._extensionPath, exportData);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to export HTML: ${errorMessage}`);
        }
    }
    /**
     * Build display-friendly dimension labels for the active entities list.
     * Returns an array of { name, values } for dimensions that have assigned values.
     */
    getActiveListDimensions() {
        if (!this.entitiesListManager || !this.dimensionManager) {
            return [];
        }
        // Find the active entities list config by matching the current path
        const currentPath = this.mgr.getEntitiesJsonPath();
        if (!currentPath) {
            return [];
        }
        const lists = this.entitiesListManager.getLists();
        const activeList = lists.find(l => {
            const absPath = this.entitiesListManager.resolveAbsolutePath(l);
            return this.normalizePath(absPath) === this.normalizePath(currentPath);
        });
        if (!activeList?.dimensions) {
            return [];
        }
        const result = [];
        const allDimensions = this.dimensionManager.getDimensions();
        for (const dim of allDimensions) {
            const assignedValueIds = activeList.dimensions[dim.id] || [];
            if (assignedValueIds.length > 0) {
                const labels = assignedValueIds
                    .map(vid => dim.values.find(v => v.id === vid)?.label || vid)
                    .filter(Boolean);
                if (labels.length > 0) {
                    result.push({ name: dim.name, values: labels });
                }
            }
        }
        return result;
    }
    normalizePath(p) {
        const normalized = path.normalize(p);
        return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    }
    sendDimensionsToWebview() {
        const dimensions = this.getActiveListDimensions();
        this._panel.webview.postMessage({
            command: 'updateDimensions',
            dimensions
        });
    }
    async handleSaveDiagram(entityIds, positions, svgContent) {
        if (!this._currentDiagram || !this._currentDiagramManager) {
            // No diagram context — offer to create a new diagram
            vscode.window.showWarningMessage('No diagram is currently open. Use "Add ERD Diagram" from the Assets tree to create one first.');
            return;
        }
        try {
            // Update the diagram data
            this._currentDiagramManager.updateDiagram(this._currentDiagram.id, {
                entityIds,
                positions
            });
            // Also save the SVG alongside the diagrams file
            const diagramsFilePath = this._currentDiagramManager.getFilePath();
            const svgFileName = `${this._currentDiagram.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
            const svgPath = path.join(path.dirname(diagramsFilePath), svgFileName);
            const svgWithDimensions = svgContent.replace('<svg ', '<svg width="1000" height="1000" style="background-color: white;" ');
            fs.writeFileSync(svgPath, svgWithDimensions);
            // Refresh the in-memory diagram reference
            this._currentDiagram = this._currentDiagramManager.getDiagram(this._currentDiagram.id);
            vscode.window.showInformationMessage(`Diagram "${this._currentDiagram?.name}" saved`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save diagram: ${msg}`);
        }
    }
    async handleSaveAsDiagram(entityIds, positions, svgContent) {
        // Ask user for diagram name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the new ERD diagram',
            placeHolder: 'e.g., Overview, User Module, Full Schema',
            validateInput: (value) => {
                if (!value || !value.trim()) {
                    return 'Name cannot be empty';
                }
                return undefined;
            }
        });
        if (!name) {
            return;
        }
        // Determine which entities list to save under
        let listName = this._currentListName;
        let diagramMgr = this._currentDiagramManager;
        if (!listName || !diagramMgr) {
            // No diagram context — need to determine the entities list
            // Try to match current entities path to a configured list
            if (this.entitiesListManager) {
                const currentPath = this.mgr.getEntitiesJsonPath();
                const lists = this.entitiesListManager.getLists();
                const matchedList = lists.find(l => {
                    const absPath = this.entitiesListManager.resolveAbsolutePath(l);
                    return this.normalizePath(absPath) === this.normalizePath(currentPath);
                });
                if (matchedList) {
                    listName = matchedList.name;
                    // Ensure the list has a diagramsPath
                    if (!matchedList.diagramsPath) {
                        const baseName = path.basename(matchedList.jsonPath, path.extname(matchedList.jsonPath));
                        const dir = path.dirname(this.entitiesListManager.resolveAbsolutePath(matchedList));
                        const diagramsFileName = `${baseName}.diagrams.json`;
                        const diagramsAbsPath = path.join(dir, diagramsFileName);
                        await this.entitiesListManager.setDiagramsPath(matchedList.name, diagramsAbsPath);
                    }
                    // Re-read the list to get updated config with diagramsPath
                    const updatedList = this.entitiesListManager.getLists().find(l => l.name === listName);
                    if (updatedList?.diagramsPath) {
                        const absPath = path.isAbsolute(updatedList.diagramsPath)
                            ? updatedList.diagramsPath
                            : path.resolve(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', updatedList.diagramsPath);
                        diagramMgr = new DiagramManager_1.DiagramManager(absPath);
                    }
                }
                else {
                    vscode.window.showWarningMessage('Cannot save diagram: the current entities list is not registered in the Assets tree. Add it first.');
                    return;
                }
            }
            else {
                vscode.window.showWarningMessage('Cannot save diagram: no entities list manager available.');
                return;
            }
        }
        if (!diagramMgr || !listName) {
            return;
        }
        try {
            // Create the new diagram
            const newDiagram = diagramMgr.addDiagram(name.trim(), entityIds, positions);
            // Save SVG alongside
            const diagramsFilePath = diagramMgr.getFilePath();
            const svgFileName = `${name.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
            const svgPath = path.join(path.dirname(diagramsFilePath), svgFileName);
            const svgWithDimensions = svgContent.replace('<svg ', '<svg width="1000" height="1000" style="background-color: white;" ');
            fs.writeFileSync(svgPath, svgWithDimensions);
            // Update panel state to track the newly created diagram
            this._currentDiagram = newDiagram;
            this._currentListName = listName;
            this._currentDiagramManager = diagramMgr;
            this._panel.title = `ERD: ${newDiagram.name}`;
            vscode.window.showInformationMessage(`Diagram "${newDiagram.name}" created and saved`);
            // Notify webview about the new diagram context
            this._panel.webview.postMessage({
                command: 'diagramInfo',
                diagram: newDiagram,
                listName: listName
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to create diagram: ${msg}`);
        }
    }
    /** Get the currently loaded diagram, if any. */
    getCurrentDiagram() {
        return this._currentDiagram;
    }
    /** Get the entities list name for the current diagram. */
    getCurrentListName() {
        return this._currentListName;
    }
}
exports.InteractiveERDPanel = InteractiveERDPanel;
async function saveSVGFile(svgContent, place) {
    let result = undefined;
    if (place !== undefined) {
        result = place;
    }
    else {
        const options = {
            saveLabel: 'Save SVG',
            filters: {
                'SVG Files': ['svg']
            }
        };
        place = await vscode.window.showSaveDialog(options);
    }
    if (place !== undefined) {
        const svgWithDimensions = svgContent.replace('<svg ', '<svg width="1000" height="1000" style="background-color: white;" ');
        fs.writeFileSync(place.fsPath, svgWithDimensions);
        vscode.window.showInformationMessage('SVG file saved successfully');
        result = place;
    }
    return result;
}
async function loadSVGFile(webview) {
    let result = undefined;
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
        const svgWithoutDimensions = svgContent.replace(/<svg[^>]*?xml/, '<svg id="erd-svg" xml');
        webview.postMessage({
            command: 'loadSVGContent',
            svgContent: svgWithoutDimensions
        });
    }
    return result;
}
function chooseJSONFile(webview, parameters) {
    const entities = em.EntityManager.getInstance().getEntities();
    webview.postMessage({
        command: 'loadEntities',
        entities: entities,
        parameters: parameters
    });
}
async function chooseEntitiesList(webview) {
    const choice = await vscode.window.showQuickPick([
        { label: '$(folder-opened) Open Existing', description: 'Browse for an existing entities JSON file', value: 'open' },
        { label: '$(new-file) Create New', description: 'Create a new empty entities list', value: 'create' }
    ], { placeHolder: 'Open an existing entities list or create a new one' });
    if (!choice) {
        return;
    }
    if (choice.value === 'open') {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Open JSON',
            filters: { 'JSON Files': ['json'] }
        });
        if (fileUri && fileUri[0]) {
            applyEntitiesListPath(webview, fileUri[0].fsPath);
        }
    }
    else {
        const fileUri = await vscode.window.showSaveDialog({
            saveLabel: 'Create Entities List',
            filters: { 'JSON Files': ['json'] },
            defaultUri: vscode.workspace.workspaceFolders?.[0]
                ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'entities.json')
                : undefined
        });
        if (fileUri) {
            fs.writeFileSync(fileUri.fsPath, '[]', 'utf8');
            applyEntitiesListPath(webview, fileUri.fsPath);
            vscode.window.showInformationMessage(`Created new entities list: ${path.basename(fileUri.fsPath)}`);
        }
    }
}
function applyEntitiesListPath(webview, filePath) {
    const mgr = em.EntityManager.getInstance();
    mgr.setEntitiesJsonPath(filePath);
    webview.postMessage({
        command: 'loadEntitiesList',
        entitiesListPath: filePath
    });
}
function deleteEntity(entityId) {
    const entityManager = em.EntityManager.getInstance();
    entityManager.deleteEntity(entityId);
    vscode.window.showInformationMessage(`Entity ${entityId} deleted`);
}
//# sourceMappingURL=InteractiveERDPanel.js.map