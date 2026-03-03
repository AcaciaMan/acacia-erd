import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityManager } from '../utils/EntityManager';
import { SourceFolderManager, SourceFolderConfig } from '../utils/SourceFolderManager';
import { DbConnectionManager, DbConnectionConfig } from '../utils/DbConnectionManager';
import { EntitiesListManager, EntitiesListConfig } from '../utils/EntitiesListManager';
import { DimensionAssignments, DimensionManager } from '../utils/DimensionManager';
import { DiagramManager, DiagramConfig } from '../utils/DiagramManager';

export class AssetCategoryItem extends vscode.TreeItem {
    constructor(
        label: string,
        public readonly categoryId: string,
        iconId: string,
        description?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = `assetCategory-${categoryId}`;
        this.iconPath = new vscode.ThemeIcon(iconId);
        if (description) {
            this.description = description;
        }
    }
}

export class SourceFolderItem extends vscode.TreeItem {
    constructor(
        public readonly folder: SourceFolderConfig,
        public readonly absolutePath: string
    ) {
        super(folder.name, vscode.TreeItemCollapsibleState.None);
        this.description = folder.path;
        this.tooltip = `${folder.name}\n${absolutePath}`;
        this.contextValue = 'sourceFolder';

        // Show folder icon, dim if path doesn't exist
        const exists = fs.existsSync(absolutePath);
        this.iconPath = new vscode.ThemeIcon(
            'folder',
            exists ? undefined : new vscode.ThemeColor('disabledForeground')
        );

        // Click to reveal in explorer
        this.command = {
            command: 'revealInExplorer',
            title: 'Reveal in Explorer',
            arguments: [vscode.Uri.file(absolutePath)]
        };
    }
}

export class DbConnectionItem extends vscode.TreeItem {
    constructor(
        public readonly connection: DbConnectionConfig
    ) {
        super(connection.name, vscode.TreeItemCollapsibleState.None);
        this.description = connection.connectionPath;
        this.tooltip = `${connection.name}\n${connection.connectionPath}`;
        this.contextValue = 'dbConnection';
        this.iconPath = new vscode.ThemeIcon('database');
    }
}

export class EntitiesListItem extends vscode.TreeItem {
    constructor(
        public readonly list: EntitiesListConfig,
        public readonly absolutePath: string,
        public readonly isActive: boolean = false
    ) {
        super(list.name, list.diagramsPath
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None);
        this.description = isActive ? `${list.jsonPath} ✦ active` : list.jsonPath;
        this.tooltip = `${list.name}\n${absolutePath}${isActive ? '\n(currently active)' : ''}`;
        this.contextValue = 'entitiesList';

        const exists = fs.existsSync(absolutePath);
        this.iconPath = new vscode.ThemeIcon(
            isActive ? 'check' : 'file-code',
            exists ? undefined : new vscode.ThemeColor('disabledForeground')
        );

        // Click to load this entities list into EntityManager
        this.command = {
            command: 'acacia-erd.selectEntitiesList',
            title: 'Select Entities List',
            arguments: [this]
        };
    }
}

export class DiagramItem extends vscode.TreeItem {
    constructor(
        public readonly diagram: DiagramConfig,
        public readonly parentListName: string
    ) {
        super(diagram.name, vscode.TreeItemCollapsibleState.None);
        this.description = `${diagram.entityIds.length} entities`;
        this.tooltip = `${diagram.name}\n${diagram.entityIds.length} entities`;
        this.contextValue = 'erdDiagram';
        this.iconPath = new vscode.ThemeIcon('type-hierarchy-sub');

        // Double-click opens the diagram in the ERD editor
        this.command = {
            command: 'acacia-erd.openDiagram',
            title: 'Open Diagram',
            arguments: [this]
        };
    }
}

export type AssetTreeItem = AssetCategoryItem | SourceFolderItem | DbConnectionItem | EntitiesListItem | DiagramItem;

export class AssetsTreeProvider implements vscode.TreeDataProvider<AssetTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AssetTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    /** Active dimension filters. Key = dimensionId, Value = set of selected valueIds.
     *  Special value '__unspecified__' matches assets with no values for that dimension. */
    private _filters: Map<string, Set<string>> = new Map();

    /** Cache of DiagramManager instances, keyed by absolute diagramsPath. */
    private _diagramManagers: Map<string, DiagramManager> = new Map();

    constructor(
        private readonly sourceFolderManager: SourceFolderManager,
        private readonly dbConnectionManager: DbConnectionManager,
        private readonly entitiesListManager: EntitiesListManager,
        private readonly dimensionManager?: DimensionManager
    ) {
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
        const entityManager = EntityManager.getInstance();
        entityManager.onDidChangeEntitiesPath(() => {
            this._onDidChangeTreeData.fire();
        });

        // Refresh tree when dimension definitions change (badges/tooltips need updating)
        if (this.dimensionManager) {
            this.dimensionManager.onDidChangeDimensions(() => {
                this._onDidChangeTreeData.fire();
            });
        }
    }

    getTreeItem(element: AssetTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AssetTreeItem): AssetTreeItem[] {
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
                            const badges = this.getDimensionBadges(list.dimensions);
                            if (badges) {
                                item.description = `${item.description}  ${badges}`;
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
                            const badges = this.getDimensionBadges(folder.dimensions);
                            if (badges) {
                                item.description = `${item.description}  ${badges}`;
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
                            const badges = this.getDimensionBadges(conn.dimensions);
                            if (badges) {
                                item.description = `${item.description}  ${badges}`;
                            }
                            return item;
                        });
                }
            }
        }

        if (element instanceof EntitiesListItem) {
            const list = element.list;
            if (!list.diagramsPath) { return []; }
            const absPath = this.resolveDiagramsPath(list.diagramsPath);
            const diagramManager = this.getDiagramManager(absPath);
            return diagramManager.getDiagrams().map(
                diagram => new DiagramItem(diagram, list.name)
            );
        }

        return [];
    }

    /** Set the filter for a specific dimension. Pass empty set to remove that dimension's filter. */
    setDimensionFilter(dimensionId: string, valueIds: Set<string>): void {
        if (valueIds.size === 0) {
            this._filters.delete(dimensionId);
        } else {
            this._filters.set(dimensionId, valueIds);
        }
        this._onDidChangeTreeData.fire();
    }

    /** Clear all dimension filters. */
    clearAllFilters(): void {
        this._filters.clear();
        this._onDidChangeTreeData.fire();
    }

    /** Get current filter state (read-only). */
    getFilters(): ReadonlyMap<string, ReadonlySet<string>> {
        return this._filters;
    }

    /** Check if any filters are active. */
    hasActiveFilters(): boolean {
        return this._filters.size > 0;
    }

    /** Get count of active filter dimensions. */
    getActiveFilterCount(): number {
        return this._filters.size;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private getActiveAbsolutePath(): string {
        const entityManager = EntityManager.getInstance();
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

    /** Get or create a DiagramManager for a given diagrams file path. */
    private getDiagramManager(absoluteDiagramsPath: string): DiagramManager {
        let manager = this._diagramManagers.get(absoluteDiagramsPath);
        if (!manager) {
            manager = new DiagramManager(absoluteDiagramsPath);
            manager.onDidChange(() => {
                this._onDidChangeTreeData.fire();
            });
            this._diagramManagers.set(absoluteDiagramsPath, manager);
        }
        return manager;
    }

    /** Get a DiagramManager for a specific entities list (by list name). Returns undefined if the list has no diagramsPath. */
    public getDiagramManagerForList(listName: string): DiagramManager | undefined {
        const list = this.entitiesListManager.getLists().find(l => l.name === listName);
        if (!list?.diagramsPath) { return undefined; }
        const absPath = this.resolveDiagramsPath(list.diagramsPath);
        return this._diagramManagers.get(absPath);
    }

    private resolveDiagramsPath(diagramsPath: string): string {
        if (path.isAbsolute(diagramsPath)) {
            return diagramsPath;
        }
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder) {
            return path.resolve(wsFolder, diagramsPath);
        }
        return path.resolve(diagramsPath);
    }

    private normalizePath(p: string): string {
        const normalized = path.normalize(p);
        // On Windows, paths are case-insensitive
        return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    }

    private matchesFilter(dimensions: DimensionAssignments | undefined): boolean {
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
            } else {
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

    /** Build compact dimension badge text for tree item description.
     *  Returns something like "[Physical] [Dev]" or empty string. */
    private getDimensionBadges(dimensions: DimensionAssignments | undefined): string {
        if (!this.dimensionManager || !dimensions) { return ''; }

        const badges: string[] = [];
        for (const dim of this.dimensionManager.getDimensions()) {
            const values = dimensions[dim.id];
            if (values && values.length > 0) {
                const labels = values
                    .map(vid => dim.values.find(v => v.id === vid)?.label || vid)
                    .join(', ');
                badges.push(`[${labels}]`);
            }
        }
        return badges.join(' ');
    }

    /** Build a short dimension summary string for an asset's tooltip. */
    private getDimensionSummary(dimensions: DimensionAssignments | undefined): string {
        if (!this.dimensionManager || !dimensions) { return ''; }

        const parts: string[] = [];
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
