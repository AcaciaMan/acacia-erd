import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityManager } from '../utils/EntityManager';
import { SourceFolderManager, SourceFolderConfig } from '../utils/SourceFolderManager';
import { DbConnectionManager, DbConnectionConfig } from '../utils/DbConnectionManager';
import { EntitiesListManager, EntitiesListConfig } from '../utils/EntitiesListManager';

export class AssetCategoryItem extends vscode.TreeItem {
    constructor(
        label: string,
        public readonly categoryId: string,
        iconId: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = `assetCategory-${categoryId}`;
        this.iconPath = new vscode.ThemeIcon(iconId);
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
        super(list.name, vscode.TreeItemCollapsibleState.None);
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

export type AssetTreeItem = AssetCategoryItem | SourceFolderItem | DbConnectionItem | EntitiesListItem;

export class AssetsTreeProvider implements vscode.TreeDataProvider<AssetTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AssetTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private readonly sourceFolderManager: SourceFolderManager,
        private readonly dbConnectionManager: DbConnectionManager,
        private readonly entitiesListManager: EntitiesListManager
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
    }

    getTreeItem(element: AssetTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AssetTreeItem): AssetTreeItem[] {
        if (!element) {
            // Root: return category headers
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
                    return this.entitiesListManager.getLists().map(list => {
                        const absPath = this.entitiesListManager.resolveAbsolutePath(list);
                        const isActive = this.normalizePath(absPath) === this.normalizePath(activePath);
                        return new EntitiesListItem(list, absPath, isActive);
                    });
                }

                case 'sourceFolders': {
                    return this.sourceFolderManager.getFolders().map(folder => {
                        const absPath = this.sourceFolderManager.resolveAbsolutePath(folder);
                        return new SourceFolderItem(folder, absPath);
                    });
                }

                case 'dbConnections': {
                    return this.dbConnectionManager.getConnections().map(
                        conn => new DbConnectionItem(conn)
                    );
                }
            }
        }

        return [];
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

    private normalizePath(p: string): string {
        const normalized = path.normalize(p);
        // On Windows, paths are case-insensitive
        return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    }
}
