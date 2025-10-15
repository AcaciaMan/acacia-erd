import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface EntityData {
    id: string;
    name: string;
    description?: string;
    columns?: string[];
    linkedEntities?: string[];
    x?: number;
    y?: number;
    rectWidth?: number;
    rectHeight?: number;
}

export interface ERDExportData {
    title: string;
    entities: EntityData[];
    svgContent: string;
    metadata?: {
        created: string;
        version: string;
        [key: string]: any;
    };
}

export class HtmlExporter {
    
    /**
     * Export ERD to standalone interactive HTML file
     */
    public static async exportToHtml(
        extensionPath: string,
        erdData: ERDExportData
    ): Promise<void> {
        try {
            // Read the HTML template
            const templatePath = path.join(extensionPath, 'resources', 'standalone_erd_template.html');
            let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

            // Prepare ERD data for embedding
            const erdDataJson = JSON.stringify({
                title: erdData.title || 'Entity Relationship Diagram',
                entities: erdData.entities || [],
                metadata: erdData.metadata || {
                    created: new Date().toISOString(),
                    version: '1.0',
                    generator: 'Acacia ERD'
                }
            }, null, 2);

            // Extract SVG content (remove the outer svg tag to get just the content)
            let svgContent = erdData.svgContent;
            
            // If SVG has xmlns and other attributes on the root <svg> tag, extract just the content
            const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
            if (svgMatch) {
                svgContent = svgMatch[1];
            }

            // Replace placeholders in template
            const filename = this.sanitizeFilename(erdData.title || 'erd-diagram');
            
            htmlTemplate = htmlTemplate.replace(/{{ERD_TITLE}}/g, erdData.title || 'Entity Relationship Diagram');
            htmlTemplate = htmlTemplate.replace(/{{ERD_CONTENT}}/g, svgContent);
            htmlTemplate = htmlTemplate.replace(/{{ERD_DATA}}/g, erdDataJson);
            htmlTemplate = htmlTemplate.replace(/{{ERD_FILENAME}}/g, filename);

            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                filters: {
                    'HTML Files': ['html'],
                    'All Files': ['*']
                },
                defaultUri: vscode.Uri.file(`${filename}.html`),
                saveLabel: 'Export Interactive HTML'
            });

            if (saveUri) {
                // Write the HTML file
                fs.writeFileSync(saveUri.fsPath, htmlTemplate, 'utf8');
                
                // Show success message with option to open
                const openAction = 'Open in Browser';
                const revealAction = 'Show in Folder';
                const result = await vscode.window.showInformationMessage(
                    `ERD exported successfully to ${path.basename(saveUri.fsPath)}`,
                    openAction,
                    revealAction
                );

                if (result === openAction) {
                    // Open in default browser
                    vscode.env.openExternal(saveUri);
                } else if (result === revealAction) {
                    // Reveal in file explorer
                    vscode.commands.executeCommand('revealFileInOS', saveUri);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to export HTML: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Extract entities from SVG content
     */
    public static extractEntitiesFromSvg(svgContent: string): EntityData[] {
        const entities: EntityData[] = [];
        
        // Parse SVG to find entities with data-entity attributes
        const entityMatches = svgContent.matchAll(/<g[^>]*class="entity"[^>]*data-entity="([^"]*)"[^>]*>/g);
        
        for (const match of entityMatches) {
            try {
                const entityDataStr = match[1].replace(/&quot;/g, '"');
                const entityData = JSON.parse(entityDataStr);
                entities.push(entityData);
            } catch (e) {
                console.error('Failed to parse entity data:', e);
            }
        }
        
        return entities;
    }

    /**
     * Sanitize filename for safe file system usage
     */
    private static sanitizeFilename(filename: string): string {
        return filename
            .replace(/[^a-z0-9_-]/gi, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
    }

    /**
     * Generate a simple ERD title from entities
     */
    public static generateTitle(entities: EntityData[]): string {
        if (entities.length === 0) {
            return 'Empty ERD';
        }
        
        if (entities.length === 1) {
            return `${entities[0].name} Entity Diagram`;
        }
        
        if (entities.length <= 3) {
            const names = entities.map(e => e.name).join(', ');
            return `${names} ERD`;
        }
        
        return `ERD with ${entities.length} Entities`;
    }

    /**
     * Create export data from current SVG content
     */
    public static createExportData(svgContent: string, title?: string): ERDExportData {
        const entities = this.extractEntitiesFromSvg(svgContent);
        const generatedTitle = title || this.generateTitle(entities);
        
        return {
            title: generatedTitle,
            entities: entities,
            svgContent: svgContent,
            metadata: {
                created: new Date().toISOString(),
                version: '1.0',
                entityCount: entities.length,
                generator: 'Acacia ERD VS Code Extension'
            }
        };
    }
}
