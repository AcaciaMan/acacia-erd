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
exports.AssetsTreeProvider = exports.EntitiesListItem = exports.DbConnectionItem = exports.SourceFolderItem = exports.AssetCategoryItem = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const EntityManager_1 = require("../utils/EntityManager");
class AssetCategoryItem extends vscode.TreeItem {
    categoryId;
    constructor(label, categoryId, iconId, description) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.categoryId = categoryId;
        this.contextValue = `assetCategory-${categoryId}`;
        this.iconPath = new vscode.ThemeIcon(iconId);
        if (description) {
            this.description = description;
        }
    }
}
exports.AssetCategoryItem = AssetCategoryItem;
class SourceFolderItem extends vscode.TreeItem {
    folder;
    absolutePath;
    constructor(folder, absolutePath) {
        super(folder.name, vscode.TreeItemCollapsibleState.None);
        this.folder = folder;
        this.absolutePath = absolutePath;
        this.description = folder.path;
        this.tooltip = `${folder.name}\n${absolutePath}`;
        this.contextValue = 'sourceFolder';
        // Show folder icon, dim if path doesn't exist
        const exists = fs.existsSync(absolutePath);
        this.iconPath = new vscode.ThemeIcon('folder', exists ? undefined : new vscode.ThemeColor('disabledForeground'));
        // Click to reveal in explorer
        this.command = {
            command: 'revealInExplorer',
            title: 'Reveal in Explorer',
            arguments: [vscode.Uri.file(absolutePath)]
        };
    }
}
exports.SourceFolderItem = SourceFolderItem;
class DbConnectionItem extends vscode.TreeItem {
    connection;
    constructor(connection) {
        super(connection.name, vscode.TreeItemCollapsibleState.None);
        this.connection = connection;
        this.description = connection.connectionPath;
        this.tooltip = `${connection.name}\n${connection.connectionPath}`;
        this.contextValue = 'dbConnection';
        this.iconPath = new vscode.ThemeIcon('database');
    }
}
exports.DbConnectionItem = DbConnectionItem;
class EntitiesListItem extends vscode.TreeItem {
    list;
    absolutePath;
    isActive;
    constructor(list, absolutePath, isActive = false) {
        super(list.name, vscode.TreeItemCollapsibleState.None);
        this.list = list;
        this.absolutePath = absolutePath;
        this.isActive = isActive;
        this.description = isActive ? `${list.jsonPath} ✦ active` : list.jsonPath;
        this.tooltip = `${list.name}\n${absolutePath}${isActive ? '\n(currently active)' : ''}`;
        this.contextValue = 'entitiesList';
        const exists = fs.existsSync(absolutePath);
        this.iconPath = new vscode.ThemeIcon(isActive ? 'check' : 'file-code', exists ? undefined : new vscode.ThemeColor('disabledForeground'));
        // Click to load this entities list into EntityManager
        this.command = {
            command: 'acacia-erd.selectEntitiesList',
            title: 'Select Entities List',
            arguments: [this]
        };
    }
}
exports.EntitiesListItem = EntitiesListItem;
class AssetsTreeProvider {
    sourceFolderManager;
    dbConnectionManager;
    entitiesListManager;
    dimensionManager;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    /** Active dimension filters. Key = dimensionId, Value = set of selected valueIds.
     *  Special value '__unspecified__' matches assets with no values for that dimension. */
    _filters = new Map();
    constructor(sourceFolderManager, dbConnectionManager, entitiesListManager, dimensionManager) {
        this.sourceFolderManager = sourceFolderManager;
        this.dbConnectionManager = dbConnectionManager;
        this.entitiesListManager = entitiesListManager;
        this.dimensionManager = dimensionManager;
        // Refresh tree when source folders change
        this.sourceFolderManager.onDidChange(() => {
            this._onDidChangeTreeData.fire();
        });
        // Refresh tree when DB connections change
        this.dbConnectionManager.onDidChange(() => {
            this._onDidChangeTreeData.fire();
        });
        // Refresh tree when entities lists change
        this.entitiesListManager.onDidChange(() => {
            this._onDidChangeTreeData.fire();
        });
        // Refresh tree when active entities path changes
        const entityManager = EntityManager_1.EntityManager.getInstance();
        entityManager.onDidChangeEntitiesPath(() => {
            this._onDidChangeTreeData.fire();
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root: return category headers
            if (this.hasActiveFilters()) {
                const totalEntLists = this.entitiesListManager.getLists().length;
                const filteredEntLists = this.entitiesListManager.getLists().filter(l => this.matchesFilter(l.dimensions)).length;
                const totalFolders = this.sourceFolderManager.getFolders().length;
                const filteredFolders = this.sourceFolderManager.getFolders().filter(f => this.matchesFilter(f.dimensions)).length;
                const totalConns = this.dbConnectionManager.getConnections().length;
                const filteredConns = this.dbConnectionManager.getConnections().filter(c => this.matchesFilter(c.dimensions)).length;
                return [
                    new AssetCategoryItem('Entities Lists', 'entitiesLists', 'list-tree', `${filteredEntLists}/${totalEntLists}`),
                    new AssetCategoryItem('Source Folders', 'sourceFolders', 'folder-library', `${filteredFolders}/${totalFolders}`),
                    new AssetCategoryItem('DB Connections', 'dbConnections', 'database', `${filteredConns}/${totalConns}`)
                ];
            }
            return [
                new AssetCategoryItem('Entities Lists', 'entitiesLists', 'list-tree'),
                new AssetCategoryItem('Source Folders', 'sourceFolders', 'folder-library'),
                new AssetCategoryItem('DB Connections', 'dbConnections', 'database')
            ];
        }
        if (element instanceof AssetCategoryItem) {
            switch (element.categoryId) {
                case 'entitiesLists': {
                    const activePath = this.getActiveAbsolutePath();
                    return this.entitiesListManager.getLists()
                        .filter(list => this.matchesFilter(list.dimensions))
                        .map(list => {
                        const absPath = this.entitiesListManager.resolveAbsolutePath(list);
                        const isActive = this.normalizePath(absPath) === this.normalizePath(activePath);
                        const item = new EntitiesListItem(list, absPath, isActive);
                        const dimSummary = this.getDimensionSummary(list.dimensions);
                        if (dimSummary) {
                            item.tooltip = `${item.tooltip}\n\n${dimSummary}`;
                        }
                        return item;
                    });
                }
                case 'sourceFolders': {
                    return this.sourceFolderManager.getFolders()
                        .filter(folder => this.matchesFilter(folder.dimensions))
                        .map(folder => {
                        const absPath = this.sourceFolderManager.resolveAbsolutePath(folder);
                        const item = new SourceFolderItem(folder, absPath);
                        const dimSummary = this.getDimensionSummary(folder.dimensions);
                        if (dimSummary) {
                            item.tooltip = `${item.tooltip}\n\n${dimSummary}`;
                        }
                        return item;
                    });
                }
                case 'dbConnections': {
                    return this.dbConnectionManager.getConnections()
                        .filter(conn => this.matchesFilter(conn.dimensions))
                        .map(conn => {
                        const item = new DbConnectionItem(conn);
                        const dimSummary = this.getDimensionSummary(conn.dimensions);
                        if (dimSummary) {
                            item.tooltip = `${item.tooltip}\n\n${dimSummary}`;
                        }
                        return item;
                    });
                }
            }
        }
        return [];
    }
    /** Set the filter for a specific dimension. Pass empty set to remove that dimension's filter. */
    setDimensionFilter(dimensionId, valueIds) {
        if (valueIds.size === 0) {
            this._filters.delete(dimensionId);
        }
        else {
            this._filters.set(dimensionId, valueIds);
        }
        this._onDidChangeTreeData.fire();
    }
    /** Clear all dimension filters. */
    clearAllFilters() {
        this._filters.clear();
        this._onDidChangeTreeData.fire();
    }
    /** Get current filter state (read-only). */
    getFilters() {
        return this._filters;
    }
    /** Check if any filters are active. */
    hasActiveFilters() {
        return this._filters.size > 0;
    }
    /** Get count of active filter dimensions. */
    getActiveFilterCount() {
        return this._filters.size;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getActiveAbsolutePath() {
        const entityManager = EntityManager_1.EntityManager.getInstance();
        const currentPath = entityManager.getEntitiesJsonPath();
        if (path.isAbsolute(currentPath)) {
            return currentPath;
        }
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder) {
            return path.resolve(wsFolder, currentPath);
        }
        return path.resolve(currentPath);
    }
    normalizePath(p) {
        const normalized = path.normalize(p);
        // On Windows, paths are case-insensitive
        return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    }
    matchesFilter(dimensions) {
        if (this._filters.size === 0) {
            return true; // no active filters → show everything
        }
        for (const [dimensionId, selectedValues] of this._filters) {
            const assetValues = dimensions?.[dimensionId] || [];
            const hasUnspecified = selectedValues.has('__unspecified__');
            if (assetValues.length === 0) {
                // Asset is "Unspecified" for this dimension
                if (!hasUnspecified) {
                    return false; // filter requires specific values, asset has none
                }
                // else: hasUnspecified is true, so "Unspecified" assets match
            }
            else {
                // Asset has values — check if ANY overlap with filter
                const hasMatch = assetValues.some(v => selectedValues.has(v));
                if (!hasMatch && !hasUnspecified) {
                    return false;
                }
                // Edge case: if only __unspecified__ is selected and asset HAS values, no match
                if (!hasMatch && hasUnspecified && assetValues.length > 0) {
                    return false;
                }
            }
        }
        return true; // passed all dimension filters
    }
    /** Build a short dimension summary string for an asset's tooltip. */
    getDimensionSummary(dimensions) {
        if (!this.dimensionManager || !dimensions) {
            return '';
        }
        const parts = [];
        for (const dim of this.dimensionManager.getDimensions()) {
            const values = dimensions[dim.id];
            if (values && values.length > 0) {
                const labels = values
                    .map(vid => dim.values.find(v => v.id === vid)?.label || vid)
                    .join(', ');
                parts.push(`${dim.name}: ${labels}`);
            }
        }
        return parts.join(' | ');
    }
}
exports.AssetsTreeProvider = AssetsTreeProvider;
//# sourceMappingURL=AssetsTreeProvider.js.map