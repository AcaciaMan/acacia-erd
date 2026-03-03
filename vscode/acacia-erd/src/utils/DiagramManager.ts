import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/** Position of a single entity on the diagram canvas. */
export interface EntityPosition {
    x: number;
    y: number;
}

/** A single persisted ERD diagram. */
export interface DiagramConfig {
    /** Unique identifier (generated via crypto.randomUUID()). */
    id: string;
    /** User-provided display name. */
    name: string;
    /** IDs of entities included in this diagram. */
    entityIds: string[];
    /** Canvas positions keyed by entity ID. */
    positions: Record<string, EntityPosition>;
}

/** Root structure of the diagrams JSON file (one file per entities list). */
export interface DiagramsFile {
    /** All diagrams for this entities list. */
    diagrams: DiagramConfig[];
}

export class DiagramManager {
    private diagrams: DiagramConfig[] = [];
    private filePath: string;
    private _watcher: vscode.FileSystemWatcher | undefined;
    private _reloadTimeout: NodeJS.Timeout | undefined;

    private readonly _onDidChange = new vscode.EventEmitter<DiagramConfig[]>();
    /** Fires after any mutation (add, update, rename, delete, duplicate, external reload). */
    public readonly onDidChange: vscode.Event<DiagramConfig[]> = this._onDidChange.event;

    constructor(filePath: string) {
        this.filePath = filePath;
        this.loadDiagrams();
        this.setupFileWatcher();
    }

    // ── File watcher ──────────────────────────────────────────────

    private setupFileWatcher(): void {
        this._watcher?.dispose();

        const filePattern = new vscode.RelativePattern(
            path.dirname(this.filePath),
            path.basename(this.filePath)
        );
        this._watcher = vscode.workspace.createFileSystemWatcher(filePattern);

        this._watcher.onDidChange(() => {
            this.debouncedReload();
        });

        this._watcher.onDidCreate(() => {
            this.debouncedReload();
        });

        this._watcher.onDidDelete(() => {
            this.diagrams = [];
            this._onDidChange.fire(this.diagrams);
        });
    }

    private debouncedReload(): void {
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
        this._reloadTimeout = setTimeout(() => {
            this.loadDiagrams();
            this._onDidChange.fire(this.diagrams);
            this._reloadTimeout = undefined;
        }, 300);
    }

    // ── File I/O ──────────────────────────────────────────────────

    /** Reads and parses the diagrams JSON file. Handles missing file and parse errors gracefully. */
    private loadDiagrams(): void {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.diagrams = [];
                return;
            }
            const data = fs.readFileSync(this.filePath, 'utf8');
            const parsed: unknown = JSON.parse(data);
            if (parsed && typeof parsed === 'object' && 'diagrams' in parsed && Array.isArray((parsed as DiagramsFile).diagrams)) {
                this.diagrams = (parsed as DiagramsFile).diagrams;
            } else {
                this.diagrams = [];
                vscode.window.showErrorMessage('Error loading diagrams: expected { diagrams: [...] }');
            }
        } catch (error) {
            console.error('Error loading diagrams:', error);
            this.diagrams = [];
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error loading diagrams: ' + error.message);
            } else {
                vscode.window.showErrorMessage('Error loading diagrams: Unknown error');
            }
        }
    }

    /** Writes the current diagrams array to disk as a DiagramsFile. */
    private saveDiagrams(): void {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data: DiagramsFile = { diagrams: this.diagrams };
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving diagrams:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error saving diagrams: ' + error.message);
            } else {
                vscode.window.showErrorMessage('Error saving diagrams: Unknown error');
            }
        }
    }

    // ── Public API — Read ─────────────────────────────────────────

    /** Returns all diagrams. */
    public getDiagrams(): DiagramConfig[] {
        return this.diagrams;
    }

    /** Find a diagram by ID. */
    public getDiagram(id: string): DiagramConfig | undefined {
        return this.diagrams.find(d => d.id === id);
    }

    // ── Public API — CRUD ─────────────────────────────────────────

    /** Creates a new diagram with a generated UUID, saves, fires event, and returns the new diagram. */
    public addDiagram(name: string, entityIds?: string[], positions?: Record<string, EntityPosition>): DiagramConfig {
        const diagram: DiagramConfig = {
            id: crypto.randomUUID(),
            name,
            entityIds: entityIds ?? [],
            positions: positions ?? {},
        };
        this.diagrams.push(diagram);
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
        return diagram;
    }

    /** Merges partial updates (entityIds, positions) into an existing diagram, saves, and fires event. */
    public updateDiagram(id: string, updates: Partial<Pick<DiagramConfig, 'entityIds' | 'positions'>>): void {
        const diagram = this.diagrams.find(d => d.id === id);
        if (!diagram) {
            return;
        }
        if (updates.entityIds !== undefined) {
            diagram.entityIds = updates.entityIds;
        }
        if (updates.positions !== undefined) {
            diagram.positions = updates.positions;
        }
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
    }

    /** Renames a diagram, saves, and fires event. */
    public renameDiagram(id: string, newName: string): void {
        const diagram = this.diagrams.find(d => d.id === id);
        if (!diagram) {
            return;
        }
        diagram.name = newName;
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
    }

    /** Removes a diagram by ID, saves, and fires event. */
    public deleteDiagram(id: string): void {
        this.diagrams = this.diagrams.filter(d => d.id !== id);
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
    }

    /** Deep-copies a diagram with a new UUID and name, saves, fires event, and returns the copy. */
    public duplicateDiagram(id: string, newName?: string): DiagramConfig | undefined {
        const original = this.diagrams.find(d => d.id === id);
        if (!original) {
            return undefined;
        }
        const copy: DiagramConfig = {
            id: crypto.randomUUID(),
            name: newName ?? `${original.name} (copy)`,
            entityIds: [...original.entityIds],
            positions: JSON.parse(JSON.stringify(original.positions)),
        };
        this.diagrams.push(copy);
        this.saveDiagrams();
        this._onDidChange.fire(this.diagrams);
        return copy;
    }

    // ── Path management ───────────────────────────────────────────

    /** Returns the current diagrams file path. */
    public getFilePath(): string {
        return this.filePath;
    }

    /** Changes the diagrams file path, disposes the old watcher, sets up a new one, and reloads. */
    public setFilePath(newPath: string): void {
        this.filePath = newPath;
        this._watcher?.dispose();
        this.loadDiagrams();
        this.setupFileWatcher();
        this._onDidChange.fire(this.diagrams);
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    /** Disposes the file watcher, event emitter, and clears any pending timeouts. */
    public dispose(): void {
        this._watcher?.dispose();
        this._onDidChange.dispose();
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
    }
}
