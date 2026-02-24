import * as vscode from 'vscode';

/** Persisted data shape for a database connection entry. */
export interface DbConnectionConfig {
    /** User-friendly name, e.g. "Dev DB", "Test DB", "Production Schema" */
    name: string;
    /** Connection path — file path, connection string (no credentials), or URL.
     *  Examples:
     *    "sqlite:///data/dev.db"
     *    "./schema/prod_schema.sql"
     *    "localhost:5432/myapp"
     *    "server=myhost;database=mydb"
     */
    connectionPath: string;
}

export class DbConnectionManager {
    private readonly _onDidChange = new vscode.EventEmitter<DbConnectionConfig[]>();
    public readonly onDidChange: vscode.Event<DbConnectionConfig[]> = this._onDidChange.event;
    private _configListener: vscode.Disposable;

    constructor() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.dbConnections')) {
                this._onDidChange.fire(this.getConnections());
            }
        });
    }

    public getConnections(): DbConnectionConfig[] {
        return vscode.workspace.getConfiguration('acacia-erd')
            .get<DbConnectionConfig[]>('dbConnections', []);
    }

    public async addConnection(name: string, connectionPath: string): Promise<void> {
        const connections = this.getConnections();
        if (connections.some(c => c.name === name)) {
            vscode.window.showWarningMessage(`DB connection "${name}" already exists.`);
            return;
        }
        connections.push({ name, connectionPath });
        await this.saveConnections(connections);
    }

    public async removeConnection(name: string): Promise<void> {
        const connections = this.getConnections().filter(c => c.name !== name);
        await this.saveConnections(connections);
    }

    public async renameConnection(oldName: string, newName: string): Promise<void> {
        const connections = this.getConnections();
        const conn = connections.find(c => c.name === oldName);
        if (conn) {
            conn.name = newName;
            await this.saveConnections(connections);
        }
    }

    public async editConnectionPath(name: string, newPath: string): Promise<void> {
        const connections = this.getConnections();
        const conn = connections.find(c => c.name === name);
        if (conn) {
            conn.connectionPath = newPath;
            await this.saveConnections(connections);
        }
    }

    private async saveConnections(connections: DbConnectionConfig[]): Promise<void> {
        await vscode.workspace.getConfiguration('acacia-erd')
            .update('dbConnections', connections, vscode.ConfigurationTarget.Workspace);
        this._onDidChange.fire(connections);
    }

    public dispose(): void {
        this._configListener.dispose();
        this._onDidChange.dispose();
    }
}
