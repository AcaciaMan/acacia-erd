"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class EntityManager {
    static instance;
    entities = [];
    entity = undefined;
    entitiesJsonPath;
    _watcher;
    _configListener;
    _reloadTimeout;
    _onDidChangeEntities = new vscode.EventEmitter();
    onDidChangeEntities = this._onDidChangeEntities.event;
    _onDidChangeEntitiesPath = new vscode.EventEmitter();
    onDidChangeEntitiesPath = this._onDidChangeEntitiesPath.event;
    constructor() {
        const configuredPath = vscode.workspace.getConfiguration('acacia-erd')
            .get('entitiesJsonPath', 'resources/entities.json');
        this.entitiesJsonPath = this.resolveEntitiesPath(configuredPath);
        this.loadEntities();
        this.setupFileWatcher();
        this.setupConfigListener();
    }
    setupFileWatcher() {
        // Dispose existing watcher if any
        this._watcher?.dispose();
        // Create a watcher for the specific entities file
        const filePattern = new vscode.RelativePattern(path.dirname(this.entitiesJsonPath), path.basename(this.entitiesJsonPath));
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
    setupConfigListener() {
        this._configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('acacia-erd.entitiesJsonPath')) {
                const newConfiguredPath = vscode.workspace.getConfiguration('acacia-erd')
                    .get('entitiesJsonPath', 'resources/entities.json');
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
    debouncedReload() {
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
        this._reloadTimeout = setTimeout(() => {
            this.loadEntities();
            this.notifyChange();
            this._reloadTimeout = undefined;
        }, 300);
    }
    dispose() {
        this._watcher?.dispose();
        this._configListener?.dispose();
        this._onDidChangeEntities.dispose();
        this._onDidChangeEntitiesPath.dispose();
        if (this._reloadTimeout) {
            clearTimeout(this._reloadTimeout);
        }
    }
    resolveEntitiesPath(configuredPath) {
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
    toWorkspaceRelativePath(absolutePath) {
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
    getEntitiesJsonPath() {
        return this.entitiesJsonPath;
    }
    // Setter for entitiesJsonPath
    setEntitiesJsonPath(newPath) {
        // Store workspace-relative path in settings when possible
        const settingsPath = this.toWorkspaceRelativePath(newPath);
        vscode.workspace.getConfiguration().update('acacia-erd.entitiesJsonPath', settingsPath, false).then(() => {
            this.entitiesJsonPath = this.resolveEntitiesPath(settingsPath);
            this.loadEntities();
            this.setupFileWatcher(); // Re-create watcher for new path
            this._onDidChangeEntitiesPath.fire(this.entitiesJsonPath);
            this.notifyChange();
        });
    }
    // Getter for entity
    getEntity() {
        return this.entity;
    }
    // Setter for entity
    setEntity(entity) {
        this.entity = entity;
    }
    getEntityByName(entityName) {
        const entity = this.entities.find((entity) => entity.name === entityName);
        if (entity) {
            return entity;
        }
        else {
            throw new Error(`Entity with name ${entityName} not found`);
        }
    }
    static getInstance() {
        if (!EntityManager.instance) {
            EntityManager.instance = new EntityManager();
        }
        return EntityManager.instance;
    }
    // Load entities from the JSON file
    loadEntities() {
        try {
            const data = fs.readFileSync(this.entitiesJsonPath, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                this.entities = parsed;
            }
            else {
                this.entities = [];
                vscode.window.showErrorMessage('Error loading entities: expected an array');
            }
        }
        catch (error) {
            console.error('Error loading entities:', error);
            if (error instanceof Error) {
                // check if the error is an empty file error
                if (error.message.includes('Unexpected end of JSON input')) {
                    this.entities = []; // Initialize with an empty array if the file is empty
                }
                else {
                    this.entities = []; // Initialize with an empty array if the file is not found or invalid
                    vscode.window.showErrorMessage('Error loading entities: ' + error.message);
                }
            }
            else {
                vscode.window.showErrorMessage('Error loading entities: Unknown error');
            }
        }
    }
    // Save entities to the JSON file
    saveEntities() {
        try {
            fs.writeFileSync(this.entitiesJsonPath, JSON.stringify(this.entities, null, 2));
        }
        catch (error) {
            console.error('Error saving entities:', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error saving entities: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('Error saving entities: Unknown error');
            }
        }
    }
    // Get all entities
    getEntities() {
        return this.entities;
    }
    // Add a new entity
    addEntity(entity) {
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
        const newEntity = {
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
    updateEntity(updatedEntity, oldEntity) {
        if (oldEntity.name !== updatedEntity.name) {
            // rename the entity in the list
            const index = this.entities.findIndex(entity => entity.name === oldEntity.name);
            if (index !== -1) {
                this.entities[index].name = updatedEntity.name;
            }
            else {
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
        }
        else {
            this.addEntity(updatedEntity); // If the entity is not found, add it
        }
    }
    // Delete an entity
    deleteEntity(entityName) {
        this.entities = this.entities.filter(entity => entity.name !== entityName);
        this.saveEntities();
        this.notifyChange();
    }
    // Notify all dependent components about changes
    notifyChange() {
        this._onDidChangeEntities.fire(this.entities);
    }
}
exports.EntityManager = EntityManager;
//# sourceMappingURL=EntityManager.js.map