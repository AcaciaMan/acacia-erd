import * as vscode from 'vscode';
import * as path from 'path';
import { DimensionAssignments } from './DimensionManager';

/** Persisted data shape for a source folder entry. */
export interface SourceFolderConfig {
    /** User-friendly name, e.g. "App Source", "Migrations" */
    name: string;
    /** Path to the folder. Relative paths resolve from workspace root. */
    path: string;
    /** Optional dimension assignments. Keys are dimension IDs, values are arrays of selected value IDs. */
    dimensions?: DimensionAssignments;
}

export class SourceFolderManager {
    private readonly _onDidChange = new vscode.EventEmitter<SourceFolderConfig[]>();
    public readonly onDidChange: vscode.Event<SourceFolderConfig[]> = this._onDidChange.event;
    private _configListener: vscode.Disposable;

    constructor() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.sourceFolders')) {
                this._onDidChange.fire(this.getFolders());
            }
        });
    }

    public getFolders(): SourceFolderConfig[] {
        return vscode.workspace.getConfiguration('acacia-erd')
            .get<SourceFolderConfig[]>('sourceFolders', []);
    }

    public async addFolder(name: string, folderPath: string): Promise<void> {
        const folders = this.getFolders();
        if (folders.some(f => f.name === name)) {
            vscode.window.showWarningMessage(`Source folder "${name}" already exists.`);
            return;
        }
        const storedPath = this.toWorkspaceRelativePath(folderPath);
        folders.push({ name, path: storedPath });
        await this.saveFolders(folders);
    }

    public async removeFolder(name: string): Promise<void> {
        const folders = this.getFolders().filter(f => f.name !== name);
        await this.saveFolders(folders);
    }

    public async renameFolder(oldName: string, newName: string): Promise<void> {
        const folders = this.getFolders();
        const folder = folders.find(f => f.name === oldName);
        if (folder) {
            folder.name = newName;
            await this.saveFolders(folders);
        }
    }

    public resolveAbsolutePath(folder: SourceFolderConfig): string {
        if (path.isAbsolute(folder.path)) {
            return folder.path;
        }
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder) {
            return path.resolve(wsFolder, folder.path);
        }
        return path.resolve(folder.path);
    }

    private toWorkspaceRelativePath(absolutePath: string): string {
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder && path.isAbsolute(absolutePath)) {
            const relative = path.relative(wsFolder, absolutePath);
            if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
                return relative;
            }
        }
        return absolutePath;
    }

    private async saveFolders(folders: SourceFolderConfig[]): Promise<void> {
        await vscode.workspace.getConfiguration('acacia-erd')
            .update('sourceFolders', folders, vscode.ConfigurationTarget.Workspace);
        this._onDidChange.fire(folders);
    }

    public dispose(): void {
        this._configListener.dispose();
        this._onDidChange.dispose();
    }
}
