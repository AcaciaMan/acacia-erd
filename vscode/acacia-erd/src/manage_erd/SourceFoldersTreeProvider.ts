import * as vscode from 'vscode';
import * as fs from 'fs';
import { SourceFolderManager, SourceFolderConfig } from '../utils/SourceFolderManager';

export class SourceFolderTreeItem extends vscode.TreeItem {
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

export class SourceFoldersTreeProvider implements vscode.TreeDataProvider<SourceFolderTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SourceFolderTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly manager: SourceFolderManager) {
        // Refresh tree when source folders change
        this.manager.onDidChange(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    getTreeItem(element: SourceFolderTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SourceFolderTreeItem): SourceFolderTreeItem[] {
        if (element) {
            return []; // Flat list, no children
        }
        return this.manager.getFolders().map(folder => {
            const absPath = this.manager.resolveAbsolutePath(folder);
            return new SourceFolderTreeItem(folder, absPath);
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
