import { Dimension, DimensionAssignments } from './DimensionManager';
import { Entity } from './EntityManager';

export interface EntitiesReviewPromptInput {
    listName: string;
    dimensions: Dimension[];
    assignments?: DimensionAssignments;
    entities: Entity[];
}

/**
 * Build a self-contained, paste-ready Markdown prompt for an external AI chat
 * to review the ENTITIES of an ERD (Phase 1 — entities only; columns and
 * relations are intentionally excluded).
 *
 * Output is free-form prose, but every finding must be tagged
 * `[category | severity] Title` where:
 *   - category ∈ naming | structure | completeness | convention | risk
 *   - severity ∈ info | warn | error
 */
export function buildEntitiesReviewPrompt(input: EntitiesReviewPromptInput): string {
    const { listName, dimensions, assignments, entities } = input;

    const dimensionLines = renderDimensionAssignments(dimensions, assignments);

    const sortedEntities = [...entities].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    const tableRows = sortedEntities.map((e, i) => {
        const desc = (e.description ?? '').trim();
        const safeDesc = desc.length > 0
            ? desc.replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|')
            : '_(none)_';
        const safeName = e.name.replace(/\|/g, '\\|');
        return `| ${i + 1} | ${safeName} | ${safeDesc} |`;
    }).join('\n');

    const total = sortedEntities.length;

    return [
        `# ERD Review — Phase 1: Entities only`,
        ``,
        `You are reviewing the **entities** of an entity-relationship diagram named **${listName}**. Columns and relationships are intentionally **out of scope** for this phase — do not invent or ask for them.`,
        ``,
        `## Context`,
        ``,
        `This entities list is positioned as follows (dimensions chosen by the modeller):`,
        ``,
        dimensionLines,
        ``,
        `## Entities`,
        ``,
        `| # | Name | Description |`,
        `|---|------|-------------|`,
        tableRows.length > 0 ? tableRows : `| – | _(none)_ | _(no entities in this list)_ |`,
        ``,
        `(Total: ${total} ${total === 1 ? 'entity' : 'entities'}.)`,
        ``,
        `## Your task`,
        ``,
        `Review the entity set above against its declared dimensions. Focus on these four lenses:`,
        ``,
        `1. **Naming** — Are entity names consistent in case, number (singular/plural), language, and abbreviation style? Are any names ambiguous, misleading, or jargon-heavy for the declared level (e.g. cryptic codes at a Conceptual level)?`,
        `2. **Granularity** — Is each entity at an appropriate grain for the declared level and schema style? Are any entities too coarse (lumping distinct concepts) or too fine (attribute-level things masquerading as entities)?`,
        `3. **Missing or duplicate concepts** — Are there obvious entities a model in this domain/schema style would normally include but that are absent? Are any two entities likely the same concept under different names, or overlapping in scope?`,
        `4. **Coverage** — Given the declared dimensions (level, environment, schema, …), does the set feel complete for that positioning, or does it look like a partial slice?`,
        ``,
        `## Response format`,
        ``,
        `Free-form prose is fine, but **every concrete finding must be tagged** like this:`,
        ``,
        `> \`[category | severity] Finding title\` — explanation and suggested action.`,
        ``,
        `- **category** is one of: \`naming\`, \`structure\`, \`completeness\`, \`convention\`, \`risk\``,
        `- **severity** is one of: \`info\`, \`warn\`, \`error\``,
        ``,
        `Example:`,
        `> \`[naming | warn] Inconsistent pluralization\` — \`Customer\` is singular but \`Orders\` is plural. Pick one convention and apply it across all entities.`,
        ``,
        `Group findings under the four lens headings (Naming / Granularity / Missing or duplicate / Coverage). At the end, give a short overall impression (2–4 sentences). Do not invent columns, relationships, or domain rules that aren't supported by the entity names and descriptions provided.`,
        ``,
    ].join('\n');
}

function renderDimensionAssignments(
    dimensions: Dimension[],
    assignments: DimensionAssignments | undefined
): string {
    if (!assignments) {
        return `_(no dimensions assigned)_`;
    }

    const lines: string[] = [];
    for (const dim of dimensions) {
        const selectedIds = assignments[dim.id];
        if (!selectedIds || selectedIds.length === 0) {
            continue;
        }
        const labels = selectedIds.map(valueId => {
            const v = dim.values.find(dv => dv.id === valueId);
            return v ? v.label : valueId;
        });
        lines.push(`- **${dim.name}**: ${labels.join(', ')}`);
    }

    if (lines.length === 0) {
        return `_(no dimensions assigned)_`;
    }
    return lines.join('\n');
}
