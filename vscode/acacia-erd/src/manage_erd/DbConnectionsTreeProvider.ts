import * as vscode from 'vscode';
import { DbConnectionManager, DbConnectionConfig } from '../utils/DbConnectionManager';

export class DbConnectionTreeItem extends vscode.TreeItem {
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

export class DbConnectionsTreeProvider implements vscode.TreeDataProvider<DbConnectionTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DbConnectionTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly manager: DbConnectionManager) {
        this.manager.onDidChange(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    getTreeItem(element: DbConnectionTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DbConnectionTreeItem): DbConnectionTreeItem[] {
        if (element) {
            return []; // Flat list, no children
        }
        return this.manager.getConnections().map(conn => new DbConnectionTreeItem(conn));
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
