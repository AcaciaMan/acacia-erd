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
exports.HtmlExporter = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class HtmlExporter {
    /**
     * Export ERD to standalone interactive HTML file
     */
    static async exportToHtml(extensionPath, erdData) {
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
                const result = await vscode.window.showInformationMessage(`ERD exported successfully to ${path.basename(saveUri.fsPath)}`, openAction, revealAction);
                if (result === openAction) {
                    // Open in default browser
                    vscode.env.openExternal(saveUri);
                }
                else if (result === revealAction) {
                    // Reveal in file explorer
                    vscode.commands.executeCommand('revealFileInOS', saveUri);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to export HTML: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Extract entities from SVG content
     */
    static extractEntitiesFromSvg(svgContent) {
        const entities = [];
        // Parse SVG to find entities with data-entity attributes
        const entityMatches = svgContent.matchAll(/<g[^>]*class="entity"[^>]*data-entity="([^"]*)"[^>]*>/g);
        for (const match of entityMatches) {
            try {
                const entityDataStr = match[1].replace(/&quot;/g, '"');
                const entityData = JSON.parse(entityDataStr);
                entities.push(entityData);
            }
            catch (e) {
                console.error('Failed to parse entity data:', e);
            }
        }
        return entities;
    }
    /**
     * Sanitize filename for safe file system usage
     */
    static sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9_-]/gi, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
    }
    /**
     * Generate a simple ERD title from entities
     */
    static generateTitle(entities) {
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
    static createExportData(svgContent, title) {
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
exports.HtmlExporter = HtmlExporter;
//# sourceMappingURL=HtmlExporter.js.map