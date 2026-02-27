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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ERDViewProvider_1 = require("./manage_erd/ERDViewProvider");
const EntityTreePanel_1 = require("./manage_erd/EntityTreePanel");
const InteractiveERDPanel_1 = require("./manage_erd/InteractiveERDPanel");
const EntityManager_1 = require("./utils/EntityManager");
const SourceFolderManager_1 = require("./utils/SourceFolderManager");
const DbConnectionManager_1 = require("./utils/DbConnectionManager");
const AssetsTreeProvider_1 = require("./manage_erd/AssetsTreeProvider");
const EntitiesListManager_1 = require("./utils/EntitiesListManager");
const DimensionManager_1 = require("./utils/DimensionManager");
const DimensionEditorPanel_1 = require("./manage_erd/DimensionEditorPanel");
function activate(context) {
    console.log('Congratulations, your extension "acacia-erd" is now active!');
    // Create managers first (needed by ERDViewProvider and tree views)
    const sourceFolderManager = new SourceFolderManager_1.SourceFolderManager();
    const dbConnectionManager = new DbConnectionManager_1.DbConnectionManager();
    const entitiesListManager = new EntitiesListManager_1.EntitiesListManager();
    const dimensionManager = new DimensionManager_1.DimensionManager();
    context.subscriptions.push({ dispose: () => dimensionManager.dispose() });
    // ERD Dashboard - pass managers for status display
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('erdView', new ERDViewProvider_1.ERDViewProvider(context, sourceFolderManager, dbConnectionManager, entitiesListManager)));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('openEntityTree', new EntityTreePanel_1.EntityTreePanel(context)));
    // Register command to export interactive HTML
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.exportInteractiveHtml', async () => {
        if (InteractiveERDPanel_1.InteractiveERDPanel.currentPanel) {
            vscode.window.showInformationMessage('Please use the "Export HTML" button in the ERD panel.');
        }
        else {
            vscode.window.showWarningMessage('Please open an ERD diagram first before exporting.');
        }
    }));
    // Register command to open the Interactive ERD Editor
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.openERDEditor', () => {
        InteractiveERDPanel_1.InteractiveERDPanel.createOrShow(context.extensionPath);
    }));
    // Register command to focus the Entity Tree view
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.showEntityTree', () => {
        vscode.commands.executeCommand('openEntityTree.focus');
    }));
    // Ensure EntityManager is initialized and register its disposal
    const entityManager = EntityManager_1.EntityManager.getInstance();
    context.subscriptions.push({ dispose: () => entityManager.dispose() });
    // Assets tree (unified: Source Folders + DB Connections + Entities Lists)
    const assetsTreeProvider = new AssetsTreeProvider_1.AssetsTreeProvider(sourceFolderManager, dbConnectionManager, entitiesListManager, dimensionManager);
    const assetsTreeView = vscode.window.createTreeView('acaciaAssets', {
        treeDataProvider: assetsTreeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(assetsTreeView);
    context.subscriptions.push({ dispose: () => sourceFolderManager.dispose() });
    context.subscriptions.push({ dispose: () => entitiesListManager.dispose() });
    // Source Folders commands
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.addSourceFolder', async () => {
        const folderUris = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Source Folder'
        });
        if (folderUris && folderUris[0]) {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter a descriptive name for this source folder',
                placeHolder: 'e.g., App Source, Migrations, Models',
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Name cannot be empty';
                    }
                    return undefined;
                }
            });
            if (name) {
                await sourceFolderManager.addFolder(name.trim(), folderUris[0].fsPath);
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.removeSourceFolder', async (item) => {
        if (item) {
            await sourceFolderManager.removeFolder(item.folder.name);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.renameSourceFolder', async (item) => {
        if (item) {
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new name for the source folder',
                value: item.folder.name,
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Name cannot be empty';
                    }
                    return undefined;
                }
            });
            if (newName && newName.trim() !== item.folder.name) {
                await sourceFolderManager.renameFolder(item.folder.name, newName.trim());
            }
        }
    }));
    context.subscriptions.push({ dispose: () => dbConnectionManager.dispose() });
    // DB Connections commands
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.addDbConnection', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a descriptive name for this database connection',
            placeHolder: 'e.g., Dev DB, Test DB, Production Schema',
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
        const connectionPath = await vscode.window.showInputBox({
            prompt: 'Enter the connection path (file path, connection string, or URL — no credentials)',
            placeHolder: 'e.g., sqlite:///data/dev.db, ./schema/prod.sql, localhost:5432/mydb',
            validateInput: (value) => {
                if (!value || !value.trim()) {
                    return 'Connection path cannot be empty';
                }
                return undefined;
            }
        });
        if (connectionPath) {
            await dbConnectionManager.addConnection(name.trim(), connectionPath.trim());
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.removeDbConnection', async (item) => {
        if (item) {
            await dbConnectionManager.removeConnection(item.connection.name);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.renameDbConnection', async (item) => {
        if (item) {
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new name for the database connection',
                value: item.connection.name,
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Name cannot be empty';
                    }
                    return undefined;
                }
            });
            if (newName && newName.trim() !== item.connection.name) {
                await dbConnectionManager.renameConnection(item.connection.name, newName.trim());
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.editDbConnectionPath', async (item) => {
        if (item) {
            const newPath = await vscode.window.showInputBox({
                prompt: 'Enter new connection path',
                value: item.connection.connectionPath,
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Connection path cannot be empty';
                    }
                    return undefined;
                }
            });
            if (newPath && newPath.trim() !== item.connection.connectionPath) {
                await dbConnectionManager.editConnectionPath(item.connection.name, newPath.trim());
            }
        }
    }));
    // Entities Lists commands
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.addEntitiesList', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a descriptive name for this entities list',
            placeHolder: 'e.g., Main Schema, Auth Module, User Management',
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
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select Entities JSON File',
            filters: { 'JSON Files': ['json'] }
        });
        if (fileUri && fileUri[0]) {
            await entitiesListManager.addList(name.trim(), fileUri[0].fsPath);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.removeEntitiesList', async (item) => {
        if (item) {
            await entitiesListManager.removeList(item.list.name);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.renameEntitiesList', async (item) => {
        if (item) {
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new name for the entities list',
                value: item.list.name,
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Name cannot be empty';
                    }
                    return undefined;
                }
            });
            if (newName && newName.trim() !== item.list.name) {
                await entitiesListManager.renameList(item.list.name, newName.trim());
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.editEntitiesListPath', async (item) => {
        if (item) {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select New Entities JSON File',
                filters: { 'JSON Files': ['json'] }
            });
            if (fileUri && fileUri[0]) {
                await entitiesListManager.editListPath(item.list.name, fileUri[0].fsPath);
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.selectEntitiesList', async (item) => {
        if (item) {
            const entityManager = EntityManager_1.EntityManager.getInstance();
            entityManager.setEntitiesJsonPath(item.absolutePath);
            vscode.window.showInformationMessage(`Loaded entities list: ${item.list.name}`);
            // Focus the Entity Tree so user sees the loaded entities
            vscode.commands.executeCommand('openEntityTree.focus');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.refreshAssets', () => {
        assetsTreeProvider.refresh();
    }));
    // Dimension Editor command
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.openDimensionEditor', () => {
        DimensionEditorPanel_1.DimensionEditorPanel.createOrShow(context.extensionPath, dimensionManager, sourceFolderManager, dbConnectionManager, entitiesListManager);
    }));
    // Filter Assets commands
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.filterAssets', async () => {
        await showDimensionFilterPicker(dimensionManager, assetsTreeProvider);
        onFilterChanged(assetsTreeProvider, assetsTreeView);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.clearAssetFilters', () => {
        assetsTreeProvider.clearAllFilters();
        onFilterChanged(assetsTreeProvider, assetsTreeView);
    }));
    // Initialize filter context key and badge
    onFilterChanged(assetsTreeProvider, assetsTreeView);
    // Focus commands for views
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.showSourceFolders', () => {
        vscode.commands.executeCommand('acaciaAssets.focus');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('acacia-erd.showDbConnections', () => {
        vscode.commands.executeCommand('acaciaAssets.focus');
    }));
}
// This method is called when your extension is deactivated
function deactivate() { }
function updateFilterContext(assetsTreeProvider) {
    vscode.commands.executeCommand('setContext', 'acacia-erd.hasActiveFilters', assetsTreeProvider.hasActiveFilters());
}
function updateFilterBadge(treeView, assetsTreeProvider) {
    const count = assetsTreeProvider.getActiveFilterCount();
    if (count > 0) {
        treeView.badge = {
            value: count,
            tooltip: `Filtering by ${count} dimension${count > 1 ? 's' : ''}`
        };
    }
    else {
        treeView.badge = undefined;
    }
}
function onFilterChanged(assetsTreeProvider, assetsTreeView) {
    updateFilterContext(assetsTreeProvider);
    updateFilterBadge(assetsTreeView, assetsTreeProvider);
}
async function showDimensionFilterPicker(dimensionManager, assetsTreeProvider) {
    const dimensions = dimensionManager.getDimensions();
    if (dimensions.length === 0) {
        vscode.window.showInformationMessage('No dimensions defined. Open the Dimension Editor to create dimensions.');
        return;
    }
    // Step 1: Show dimensions list
    const currentFilters = assetsTreeProvider.getFilters();
    const items = dimensions.map(dim => {
        const activeValues = currentFilters.get(dim.id);
        const description = activeValues && activeValues.size > 0
            ? `(${activeValues.size} value${activeValues.size > 1 ? 's' : ''} selected)`
            : '';
        return {
            label: dim.name,
            description,
            dimensionId: dim.id,
            iconPath: activeValues && activeValues.size > 0
                ? new vscode.ThemeIcon('filter-filled')
                : new vscode.ThemeIcon('filter'),
        };
    });
    // Add "Clear All" option if filters are active
    if (assetsTreeProvider.hasActiveFilters()) {
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator,
        });
        items.push({
            label: '$(clear-all) Clear All Filters',
            action: 'clearAll',
        });
    }
    const picked = await vscode.window.showQuickPick(items, {
        title: 'Filter Assets by Dimension',
        placeHolder: 'Select a dimension to filter by...',
    });
    if (!picked) {
        return;
    }
    if (picked.action === 'clearAll') {
        assetsTreeProvider.clearAllFilters();
        updateFilterContext(assetsTreeProvider);
        return;
    }
    if (!picked.dimensionId) {
        return;
    }
    // Step 2: Show values for the selected dimension
    const dimension = dimensionManager.getDimension(picked.dimensionId);
    if (!dimension) {
        return;
    }
    const activeValues = currentFilters.get(dimension.id);
    const valueItems = [
        // Dimension values sorted by sortOrder
        ...dimension.values
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(val => ({
            label: val.label,
            valueId: val.id,
            picked: activeValues?.has(val.id) || false,
        })),
        // Separator + "Unspecified" option
        {
            label: '',
            kind: vscode.QuickPickItemKind.Separator,
            valueId: '',
        },
        {
            label: 'Unspecified',
            description: 'Assets with no value for this dimension',
            valueId: '__unspecified__',
            picked: activeValues?.has('__unspecified__') || false,
        },
    ];
    const pickedValues = await vscode.window.showQuickPick(valueItems, {
        title: `Filter by ${dimension.name}`,
        placeHolder: 'Select values to include (multi-select)...',
        canPickMany: true,
    });
    if (pickedValues === undefined) {
        // User cancelled — don't change anything
        return;
    }
    // Apply filter
    const selectedIds = new Set(pickedValues.map(v => v.valueId).filter(Boolean));
    assetsTreeProvider.setDimensionFilter(dimension.id, selectedIds);
}
//# sourceMappingURL=extension.js.map