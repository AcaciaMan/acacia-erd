import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ObjectRegistry } from './ObjectRegistry';
import { InteractiveERDPanel } from '../manage_erd/InteractiveERDPanel';
import { EntityTreePanel } from '../manage_erd/EntityTreePanel';

export type Entity = {
    id: string;
    name: string;
    description?: string;
    columns?: string[];
    linkedEntities?: string[];
};


export class EntityManager {
    private static instance: EntityManager;
    private entities: any[] = [];
    private entity: Entity | undefined = undefined;
    private entitiesJsonPath: string;

    private constructor() {
        this.entitiesJsonPath = vscode.workspace.getConfiguration('acacia-erd').get<string>('entitiesJsonPath', 'resources/entities.json')!;
        this.loadEntities();
    }

    // Getter for entitiesJsonPath
    public getEntitiesJsonPath(): string {
        return this.entitiesJsonPath;
    }

    // Setter for entitiesJsonPath
    public setEntitiesJsonPath(newPath: string): void {
                    // update workspace setting with the path to the entities list
                    vscode.workspace.getConfiguration().update('acacia-erd.entitiesJsonPath', newPath, false).then(() => {
        this.entitiesJsonPath = newPath;
        this.loadEntities(); // Reload entities from the new path
        this.notifyChange(); // Notify components about the change
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
            this.entities = JSON.parse(data);
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
    public getEntities(): any[] {
        return this.entities;
    }

    // Add a new entity
    public addEntity(entity: any) {
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
    public updateEntity(updatedEntity: any, oldEntity: any) {
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
        const entityTreePanel = ObjectRegistry.getInstance().get<EntityTreePanel>('EntityTreePanel');
        if (entityTreePanel && entityTreePanel._webviewView) {
            entityTreePanel._loadEntities(entityTreePanel._webviewView.webview);
        }

        const interactiveERDPanel = ObjectRegistry.getInstance().get<InteractiveERDPanel>('InteractiveERDPanel');
        if (interactiveERDPanel) {
            interactiveERDPanel._panel.webview.postMessage({
                command: 'updateEntities',
                entities: this.entities
            });
        }
    }
}
