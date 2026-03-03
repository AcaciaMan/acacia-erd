import { Entity } from './EntityManager';
import { DiagramConfig } from './DiagramManager';

/** Result of comparing a diagram against an entities list. */
export interface EntitySyncResult {
    /** Entity IDs in the diagram that don't exist in the entities list. */
    missingEntityIds: string[];
    /** Entity IDs in the entities list that exist but are NOT in the diagram (informational). */
    availableButNotIncluded: string[];
    /** Whether there are any mismatches (missing entities). */
    hasMismatches: boolean;
    /** Human-readable summary message. Empty string if no mismatches. */
    summaryMessage: string;
}

/**
 * Check whether a diagram's entity references are still valid
 * against the current entities list.
 *
 * @param diagram - The diagram to check
 * @param entities - The current entities from the entities list
 * @returns Sync result with details about mismatches
 */
export function checkEntitySync(diagram: DiagramConfig, entities: Entity[]): EntitySyncResult {
    // Build lookup sets for both id and name
    const entityIdsSet = new Set<string>(entities.map(e => e.id));
    const entityNamesSet = new Set<string>(entities.map(e => e.name));

    // Find missing: diagram references that match neither id nor name
    const missingEntityIds: string[] = [];
    for (const ref of diagram.entityIds) {
        if (!entityIdsSet.has(ref) && !entityNamesSet.has(ref)) {
            missingEntityIds.push(ref);
        }
    }

    // Find entities available in the list but not referenced by the diagram
    const diagramRefs = new Set<string>(diagram.entityIds);
    const availableButNotIncluded: string[] = [];
    for (const entity of entities) {
        if (!diagramRefs.has(entity.id) && !diagramRefs.has(entity.name)) {
            availableButNotIncluded.push(entity.id);
        }
    }

    const hasMismatches = missingEntityIds.length > 0;

    // Build summary message
    let summaryMessage = '';
    if (hasMismatches) {
        const count = missingEntityIds.length;
        const noun = count === 1 ? 'entity' : 'entities';
        summaryMessage = `${count} ${noun} in this diagram no longer exist in the entities list`;

        // Append missing IDs (limit to first 5)
        const displayIds = missingEntityIds.slice(0, 5);
        summaryMessage += ` (${displayIds.join(', ')})`;
        if (missingEntityIds.length > 5) {
            summaryMessage += ` and ${missingEntityIds.length - 5} more`;
        }
    }

    return {
        missingEntityIds,
        availableButNotIncluded,
        hasMismatches,
        summaryMessage,
    };
}

/**
 * Build a user-friendly warning message for entity sync mismatches.
 * Returns undefined if there are no mismatches.
 */
export function buildSyncWarningMessage(syncResult: EntitySyncResult): string | undefined {
    if (!syncResult.hasMismatches) {
        return undefined;
    }
    return syncResult.summaryMessage;
}

/**
 * Return a new DiagramConfig with missing entity references removed.
 * Also removes positions for those entities.
 * Does NOT mutate the input diagram.
 *
 * @param diagram - The diagram to repair
 * @param syncResult - The result from checkEntitySync()
 * @returns A new DiagramConfig with stale references removed
 */
export function repairDiagram(diagram: DiagramConfig, syncResult: EntitySyncResult): DiagramConfig {
    const missingSet = new Set(syncResult.missingEntityIds);
    const repairedEntityIds = diagram.entityIds.filter(id => !missingSet.has(id));
    const repairedPositions = { ...diagram.positions };
    for (const missingId of syncResult.missingEntityIds) {
        delete repairedPositions[missingId];
    }
    return {
        ...diagram,
        entityIds: repairedEntityIds,
        positions: repairedPositions,
    };
}
