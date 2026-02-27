import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/** A single selectable value within a dimension. */
export interface DimensionValue {
    /** Unique ID within the dimension, e.g. "conceptual", "prod", "star" */
    id: string;
    /** Display label, e.g. "Conceptual", "Prod", "Star" */
    label: string;
    /** Sort order for display (ascending) */
    sortOrder: number;
}

/** A dimension definition (the type/category, not the assignment). */
export interface Dimension {
    /** Unique ID, e.g. "level", "environment", "schema" */
    id: string;
    /** Display name, e.g. "Level", "Environment", "Schema" */
    name: string;
    /** If true, user cannot delete this dimension (seed dimensions). User CAN still rename values. */
    builtIn: boolean;
    /** The allowed values for this dimension. */
    values: DimensionValue[];
}

/**
 * Maps dimension IDs to arrays of selected value IDs.
 * Used on asset configs (SourceFolderConfig, DbConnectionConfig, EntitiesListConfig).
 * If a dimension key is missing or its array is empty → the asset is "Unspecified" for that dimension.
 */
export type DimensionAssignments = {
    [dimensionId: string]: string[];
};

const SEED_DIMENSIONS: Dimension[] = [
    {
        id: 'level',
        name: 'Level',
        builtIn: true,
        values: [
            { id: 'conceptual', label: 'Conceptual', sortOrder: 1 },
            { id: 'logical',    label: 'Logical',    sortOrder: 2 },
            { id: 'physical',   label: 'Physical',   sortOrder: 3 },
        ],
    },
    {
        id: 'environment',
        name: 'Environment',
        builtIn: true,
        values: [
            { id: 'prod',     label: 'Prod',     sortOrder: 1 },
            { id: 'pre-prod', label: 'Pre-Prod', sortOrder: 2 },
            { id: 'test',     label: 'Test',     sortOrder: 3 },
            { id: 'dev',      label: 'Dev',      sortOrder: 4 },
        ],
    },
    {
        id: 'schema',
        name: 'Schema',
        builtIn: true,
        values: [
            { id: 'relational', label: 'Relational', sortOrder: 1 },
            { id: 'star',       label: 'Star',       sortOrder: 2 },
            { id: 'snowflake',  label: 'Snowflake',  sortOrder: 3 },
            { id: 'galaxy',     label: 'Galaxy',     sortOrder: 4 },
            { id: 'flat',       label: 'Flat',       sortOrder: 5 },
            { id: 'nosql',      label: 'NoSQL',      sortOrder: 6 },
        ],
    },
];

export class DimensionManager {
    private dimensions: Dimension[] = [];
    private dimensionsFilePath: string;
    private _watcher: vscode.FileSystemWatcher | undefined;
    private _configListener: vscode.Disposable | undefined;
    private _reloadTimeout: NodeJS.Timeout | undefined;
    private readonly _onDidChangeDimensions = new vscode.EventEmitter<Dimension[]>();
    public readonly onDidChangeDimensions: vscode.Event<Dimension[]> = this._onDidChangeDimensions.event;

    constructor() {
        const configuredPath = vscode.workspace.getConfiguration('acacia-erd')
            .get<string>('dimensionsFilePath', 'acacia-erd.dimensions.json')!;
        this.dimensionsFilePath = this.resolveFilePath(configuredPath);
        this.loadDimensions();
        this.setupFileWatcher();
        this.setupConfigListener();
    }

    // ── File watcher ──────────────────────────────────────────────

    private setupFileWatcher(): void {
        this._watcher?.dispose();

        const filePattern = new vscode.RelativePattern(
            path.dirname(this.dimensionsFilePath),
            path.basename(this.dimensionsFilePath)
        );
        this._watcher = vscode.workspace.createFileSystemWatcher(filePattern);

        this._watcher.onDidChange(() => {
            console.log('Dimensions file changed externally, reloading...');
            this.debouncedReload();
        });

        this._watcher.onDidCreate(() => {
            console.log('Dimensions file created, loading...');
            this.debouncedReload();
        });

        this._watcher.onDidDelete(() => {
            console.log('Dimensions file deleted, clearing dimensions...');
            this.dimensions = [];
            this.notifyChange();
        });
    }

    private setupConfigListener(): void {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.dimensionsFilePath')) {
                const newConfiguredPath = vscode.workspace.getConfiguration('acacia-erd')
                    .get<string>('dimensionsFilePath', 'acacia-erd.dimensions.json')!;
                const newResolvedPath = this.resolveFilePath(newConfiguredPath);
                if (newResolvedPath !== this.dimensionsFilePath) {
                    this.dimensionsFilePath = newResolvedPath;
                    this.loadDimensions();
                    this.setupFileWatcher();
                    this.notifyChange();
                }
            }
        });
    }

    private debouncedReload(): void {
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
        this._reloadTimeout = setTimeout(() => {
            this.loadDimensions();
            this.notifyChange();
            this._reloadTimeout = undefined;
        }, 300);
    }

    // ── Path resolution ───────────────────────────────────────────

    private resolveFilePath(configuredPath: string): string {
        if (path.isAbsolute(configuredPath)) {
            return configuredPath;
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceFolder) {
            return path.resolve(workspaceFolder, configuredPath);
        }
        return path.resolve(configuredPath);
    }

    // ── File I/O ──────────────────────────────────────────────────

    private loadDimensions(): void {
        try {
            if (!fs.existsSync(this.dimensionsFilePath)) {
                // File doesn't exist yet — use seed data in memory
                this.dimensions = JSON.parse(JSON.stringify(SEED_DIMENSIONS));
                return;
            }
            const data = fs.readFileSync(this.dimensionsFilePath, 'utf8');
            const parsed: unknown = JSON.parse(data);
            if (Array.isArray(parsed)) {
                this.dimensions = parsed as Dimension[];
            } else {
                this.dimensions = [];
                vscode.window.showErrorMessage('Error loading dimensions: expected an array');
            }
        } catch (error) {
            console.error('Error loading dimensions:', error);
            if (error instanceof Error) {
                if (error.message.includes('Unexpected end of JSON input')) {
                    this.dimensions = [];
                } else {
                    this.dimensions = [];
                    vscode.window.showErrorMessage('Error loading dimensions: ' + error.message);
                }
            } else {
                vscode.window.showErrorMessage('Error loading dimensions: Unknown error');
            }
        }
    }

    private saveDimensions(): void {
        try {
            const dir = path.dirname(this.dimensionsFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dimensionsFilePath, JSON.stringify(this.dimensions, null, 2));
        } catch (error) {
            console.error('Error saving dimensions:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error saving dimensions: ' + error.message);
            } else {
                vscode.window.showErrorMessage('Error saving dimensions: Unknown error');
            }
        }
    }

    // ── ID generation ─────────────────────────────────────────────

    private generateId(name: string): string {
        let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!base) {
            base = 'dimension';
        }
        let candidate = base;
        let counter = 2;
        while (this.dimensions.some(d => d.id === candidate)) {
            candidate = `${base}-${counter}`;
            counter++;
        }
        return candidate;
    }

    private generateValueId(existingValues: DimensionValue[], label: string): string {
        let base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!base) {
            base = 'value';
        }
        let candidate = base;
        let counter = 2;
        while (existingValues.some(v => v.id === candidate)) {
            candidate = `${base}-${counter}`;
            counter++;
        }
        return candidate;
    }

    // ── Event ─────────────────────────────────────────────────────

    private notifyChange(): void {
        this._onDidChangeDimensions.fire(this.dimensions);
    }

    // ── Public API — Read ─────────────────────────────────────────

    public getDimensions(): Dimension[] {
        return this.dimensions;
    }

    public getDimension(id: string): Dimension | undefined {
        return this.dimensions.find(d => d.id === id);
    }

    // ── Public API — Dimension CRUD ───────────────────────────────

    public addDimension(name: string): Dimension {
        const id = this.generateId(name);
        const dimension: Dimension = {
            id,
            name,
            builtIn: false,
            values: [],
        };
        this.dimensions.push(dimension);
        this.saveDimensions();
        this.notifyChange();
        return dimension;
    }

    public removeDimension(id: string): void {
        const dimension = this.dimensions.find(d => d.id === id);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${id}" not found.`);
            return;
        }
        if (dimension.builtIn) {
            vscode.window.showWarningMessage(`Cannot delete built-in dimension "${dimension.name}".`);
            return;
        }
        this.dimensions = this.dimensions.filter(d => d.id !== id);
        this.saveDimensions();
        this.notifyChange();
    }

    public renameDimension(id: string, newName: string): void {
        const dimension = this.dimensions.find(d => d.id === id);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${id}" not found.`);
            return;
        }
        dimension.name = newName;
        this.saveDimensions();
        this.notifyChange();
    }

    // ── Public API — Dimension Value CRUD ─────────────────────────

    public addValue(dimensionId: string, label: string): DimensionValue {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            throw new Error(`Dimension "${dimensionId}" not found.`);
        }
        const id = this.generateValueId(dimension.values, label);
        const maxSortOrder = dimension.values.length > 0
            ? Math.max(...dimension.values.map(v => v.sortOrder))
            : 0;
        const value: DimensionValue = {
            id,
            label,
            sortOrder: maxSortOrder + 1,
        };
        dimension.values.push(value);
        this.saveDimensions();
        this.notifyChange();
        return value;
    }

    public removeValue(dimensionId: string, valueId: string): void {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${dimensionId}" not found.`);
            return;
        }
        dimension.values = dimension.values.filter(v => v.id !== valueId);
        this.saveDimensions();
        this.notifyChange();
    }

    public renameValue(dimensionId: string, valueId: string, newLabel: string): void {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${dimensionId}" not found.`);
            return;
        }
        const value = dimension.values.find(v => v.id === valueId);
        if (!value) {
            vscode.window.showWarningMessage(`Value "${valueId}" not found in dimension "${dimension.name}".`);
            return;
        }
        value.label = newLabel;
        this.saveDimensions();
        this.notifyChange();
    }

    public reorderValue(dimensionId: string, valueId: string, newSortOrder: number): void {
        const dimension = this.dimensions.find(d => d.id === dimensionId);
        if (!dimension) {
            vscode.window.showWarningMessage(`Dimension "${dimensionId}" not found.`);
            return;
        }
        const value = dimension.values.find(v => v.id === valueId);
        if (!value) {
            vscode.window.showWarningMessage(`Value "${valueId}" not found in dimension "${dimension.name}".`);
            return;
        }
        value.sortOrder = newSortOrder;
        this.saveDimensions();
        this.notifyChange();
    }

    // ── File management ───────────────────────────────────────────

    public ensureFileExists(): void {
        if (!fs.existsSync(this.dimensionsFilePath)) {
            this.dimensions = JSON.parse(JSON.stringify(SEED_DIMENSIONS));
            this.saveDimensions();
        }
    }

    public getDimensionsFilePath(): string {
        return this.dimensionsFilePath;
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    public dispose(): void {
        this._watcher?.dispose();
        this._configListener?.dispose();
        this._onDidChangeDimensions.dispose();
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
    }
}
