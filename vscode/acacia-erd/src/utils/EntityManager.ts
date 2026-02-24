import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export type Entity = {
    id: string;
    name: string;
    description?: string;
    columns?: string[];
    linkedEntities?: string[];
};


export class EntityManager {
    private static instance: EntityManager;
    private entities: Entity[] = [];
    private entity: Entity | undefined = undefined;
    private entitiesJsonPath: string;
    private _watcher: vscode.FileSystemWatcher | undefined;
    private _configListener: vscode.Disposable | undefined;
    private _reloadTimeout: NodeJS.Timeout | undefined;
    private readonly _onDidChangeEntities = new vscode.EventEmitter<Entity[]>();
    public readonly onDidChangeEntities: vscode.Event<Entity[]> = this._onDidChangeEntities.event;
    private readonly _onDidChangeEntitiesPath = new vscode.EventEmitter<string>();
    public readonly onDidChangeEntitiesPath: vscode.Event<string> = this._onDidChangeEntitiesPath.event;

    private constructor() {
        const configuredPath = vscode.workspace.getConfiguration('acacia-erd')
            .get<string>('entitiesJsonPath', 'resources/entities.json')!;
        this.entitiesJsonPath = this.resolveEntitiesPath(configuredPath);
        this.loadEntities();
        this.setupFileWatcher();
        this.setupConfigListener();
    }

    private setupFileWatcher(): void {
        // Dispose existing watcher if any
        this._watcher?.dispose();

        // Create a watcher for the specific entities file
        const filePattern = new vscode.RelativePattern(
            path.dirname(this.entitiesJsonPath),
            path.basename(this.entitiesJsonPath)
        );
        this._watcher = vscode.workspace.createFileSystemWatcher(filePattern);

        this._watcher.onDidChange(() => {
            console.log('Entities file changed externally, reloading...');
            this.debouncedReload();
        });

        this._watcher.onDidCreate(() => {
            console.log('Entities file created, loading...');
            this.debouncedReload();
        });

        this._watcher.onDidDelete(() => {
            console.log('Entities file deleted, clearing entities...');
            this.entities = [];
            this.notifyChange();
        });
    }

    private setupConfigListener(): void {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.entitiesJsonPath')) {
                const newConfiguredPath = vscode.workspace.getConfiguration('acacia-erd')
                    .get<string>('entitiesJsonPath', 'resources/entities.json')!;
                const newResolvedPath = this.resolveEntitiesPath(newConfiguredPath);
                if (newResolvedPath !== this.entitiesJsonPath) {
                    this.entitiesJsonPath = newResolvedPath;
                    this.loadEntities();
                    this.setupFileWatcher(); // Re-create watcher for new path
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
            this.loadEntities();
            this.notifyChange();
            this._reloadTimeout = undefined;
        }, 300);
    }

    public dispose(): void {
        this._watcher?.dispose();
        this._configListener?.dispose();
        this._onDidChangeEntities.dispose();
        this._onDidChangeEntitiesPath.dispose();
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
    }

    private resolveEntitiesPath(configuredPath: string): string {
        // If the path is already absolute, use it directly
        if (path.isAbsolute(configuredPath)) {
            return configuredPath;
        }
        // Resolve relative to the first workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceFolder) {
            return path.resolve(workspaceFolder, configuredPath);
        }
        // Fallback: resolve relative to CWD (legacy behavior)
        return path.resolve(configuredPath);
    }

    private toWorkspaceRelativePath(absolutePath: string): string {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceFolder && path.isAbsolute(absolutePath)) {
            const relative = path.relative(workspaceFolder, absolutePath);
            // Only use relative if the path is inside the workspace (no ".." prefix)
            if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
                return relative;
            }
        }
        return absolutePath;
    }

    // Getter for entitiesJsonPath
    public getEntitiesJsonPath(): string {
        return this.entitiesJsonPath;
    }

    // Setter for entitiesJsonPath
    public setEntitiesJsonPath(newPath: string): void {
        // Store workspace-relative path in settings when possible
        const settingsPath = this.toWorkspaceRelativePath(newPath);
        vscode.workspace.getConfiguration().update(
            'acacia-erd.entitiesJsonPath', settingsPath, false
        ).then(() => {
            this.entitiesJsonPath = this.resolveEntitiesPath(settingsPath);
            this.loadEntities();
            this.setupFileWatcher(); // Re-create watcher for new path
            this._onDidChangeEntitiesPath.fire(this.entitiesJsonPath);
            this.notifyChange();
        });
    }

    // Getter for entity
    public getEntity(): Entity | undefined {
        return this.entity;
    }

    // Setter for entity
    public setEntity(entity: Entity | undefined): void {
        this.entity = entity;
    }

    public getEntityByName(entityName: string): Entity {
        const entity = this.entities.find((entity: Entity) => entity.name === entityName);
        if (entity) {
            return entity;
        } else {
            throw new Error(`Entity with name ${entityName} not found`);
        }
    }

    public static getInstance(): EntityManager {
        if (!EntityManager.instance) {
            EntityManager.instance = new EntityManager();
        }
        return EntityManager.instance;
    }

    // Load entities from the JSON file
    public loadEntities() {
        try {
            const data = fs.readFileSync(this.entitiesJsonPath, 'utf8');
            const parsed: unknown = JSON.parse(data);
            if (Array.isArray(parsed)) {
                this.entities = parsed as Entity[];
            } else {
                this.entities = [];
                vscode.window.showErrorMessage('Error loading entities: expected an array');
            }
        } catch (error) {
            console.error('Error loading entities:', error);
            if (error instanceof Error) {
                // check if the error is an empty file error
                if (error.message.includes('Unexpected end of JSON input')) {
                    this.entities = []; // Initialize with an empty array if the file is empty
                } else {
                    this.entities = []; // Initialize with an empty array if the file is not found or invalid
                    vscode.window.showErrorMessage('Error loading entities: ' + error.message);
                }
            } else {
                vscode.window.showErrorMessage('Error loading entities: Unknown error');
            }
        }
    }

    // Save entities to the JSON file
    private saveEntities() {
        try {
            fs.writeFileSync(this.entitiesJsonPath, JSON.stringify(this.entities, null, 2));
        } catch (error) {
            console.error('Error saving entities:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error saving entities: ' + error.message);
            } else {
                vscode.window.showErrorMessage('Error saving entities: Unknown error');
            }
        }
    }

    // Get all entities
    public getEntities(): Entity[] {
        return this.entities;
    }

    // Add a new entity
    public addEntity(entity: Entity) {
        // Check if the entity already exists
        const existingEntity = this.entities.find(e => e.name === entity.name);
        if (existingEntity) {
            vscode.window.showErrorMessage(`Entity with name ${entity.name} already exists.`);
            return;
        }
        // Check if the entity name is empty
        if (!entity.name) {
            vscode.window.showErrorMessage('Entity name cannot be empty.');
            return;
        }

        // add only elements that are in the type Entity
        const newEntity: Entity = {
            id: entity.id,
            name: entity.name,
            description: entity.description || '', // Initialize description if not provided
            columns: entity.columns || [], // Initialize columns if not provided
            linkedEntities: entity.linkedEntities || [] // Initialize linked entities if not provided
        };
       
        this.entities.push(newEntity);
        this.saveEntities();
        this.notifyChange();
    }

    // Update an existing entity
    public updateEntity(updatedEntity: Entity, oldEntity: Entity) {
        if (oldEntity.name !== updatedEntity.name) {
            // rename the entity in the list
            const index = this.entities.findIndex(entity => entity.name === oldEntity.name);
            if (index !== -1) {
                this.entities[index].name = updatedEntity.name;
            } else {
                this.addEntity(updatedEntity); // If the old entity is not found, add the new one
                return;
            }
        }

        const index = this.entities.findIndex(entity => entity.name === updatedEntity.name);
        if (index !== -1) {
               // set only elements that are in the type Entity
               this.entities[index].description = updatedEntity.description; // Update description
               this.entities[index].columns = updatedEntity.columns; // Update columns
               this.entities[index].linkedEntities = updatedEntity.linkedEntities; // Update linked entities
               this.saveEntities();
               this.notifyChange();
        } else {
            this.addEntity(updatedEntity); // If the entity is not found, add it
        }
    }

    // Delete an entity
    public deleteEntity(entityName: string) {
        this.entities = this.entities.filter(entity => entity.name !== entityName);
        this.saveEntities();
        this.notifyChange();
    }

    // Notify all dependent components about changes
    public notifyChange() {
        this._onDidChangeEntities.fire(this.entities);
    }
}
