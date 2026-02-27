import * as vscode from 'vscode';
import * as path from 'path';

/** Persisted data shape for an entities list entry. */
export interface EntitiesListConfig {
    /** User-friendly name, e.g. "Main Schema", "Auth Module" */
    name: string;
    /** Path to the entities JSON file. Relative paths resolve from workspace root. */
    jsonPath: string;
}

export class EntitiesListManager {
    private readonly _onDidChange = new vscode.EventEmitter<EntitiesListConfig[]>();
    public readonly onDidChange: vscode.Event<EntitiesListConfig[]> = this._onDidChange.event;
    private _configListener: vscode.Disposable;

    constructor() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.entitiesLists')) {
                this._onDidChange.fire(this.getLists());
            }
        });
    }

    /** Read all entities lists from settings. */
    public getLists(): EntitiesListConfig[] {
        return vscode.workspace.getConfiguration('acacia-erd')
            .get<EntitiesListConfig[]>('entitiesLists', []);
    }

    /** Add a new entities list. Shows warning if name already exists. */
    public async addList(name: string, jsonPath: string): Promise<void> {
        const lists = this.getLists();
        if (lists.some(l => l.name === name)) {
            vscode.window.showWarningMessage(`Entities list "${name}" already exists.`);
            return;
        }
        const storedPath = this.toWorkspaceRelativePath(jsonPath);
        lists.push({ name, jsonPath: storedPath });
        await this.saveLists(lists);
    }

    /** Remove an entities list by name. */
    public async removeList(name: string): Promise<void> {
        const lists = this.getLists().filter(l => l.name !== name);
        await this.saveLists(lists);
    }

    /** Rename an entities list. */
    public async renameList(oldName: string, newName: string): Promise<void> {
        const lists = this.getLists();
        const list = lists.find(l => l.name === oldName);
        if (list) {
            list.name = newName;
            await this.saveLists(lists);
        }
    }

    /** Edit the JSON path of an existing entities list. */
    public async editListPath(name: string, newPath: string): Promise<void> {
        const lists = this.getLists();
        const list = lists.find(l => l.name === name);
        if (list) {
            list.jsonPath = this.toWorkspaceRelativePath(newPath);
            await this.saveLists(lists);
        }
    }

    /** Resolve a relative jsonPath to an absolute path. */
    public resolveAbsolutePath(list: EntitiesListConfig): string {
        if (path.isAbsolute(list.jsonPath)) {
            return list.jsonPath;
        }
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (wsFolder) {
            return path.resolve(wsFolder, list.jsonPath);
        }
        return path.resolve(list.jsonPath);
    }

    /** Convert absolute path to workspace-relative when possible. */
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

    /** Save lists to config and fire change event. */
    private async saveLists(lists: EntitiesListConfig[]): Promise<void> {
        await vscode.workspace.getConfiguration('acacia-erd')
            .update('entitiesLists', lists, vscode.ConfigurationTarget.Workspace);
        this._onDidChange.fire(lists);
    }

    public dispose(): void {
        this._configListener.dispose();
        this._onDidChange.dispose();
    }
}
