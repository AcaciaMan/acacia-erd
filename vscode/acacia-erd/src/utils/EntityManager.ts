import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ObjectRegistry } from './ObjectRegistry';
import { InteractiveERDPanel } from '../manage_erd/InteractiveERDPanel';
import { EntityTreePanel } from '../manage_erd/EntityTreePanel';



export class EntityManager {
    private static instance: EntityManager;
    private entities: any[] = [];
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
                vscode.window.showErrorMessage('Error loading entities: ' + error.message);
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
        this.entities.push(entity);
        this.saveEntities();
        this.notifyChange();
    }

    // Update an existing entity
    public updateEntity(updatedEntity: any) {
        const index = this.entities.findIndex(entity => entity.name === updatedEntity.name);
        if (index !== -1) {
            this.entities[index] = updatedEntity;
            this.saveEntities();
            this.notifyChange();
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
