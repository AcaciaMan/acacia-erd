import * as assert from 'assert';
import { Entity } from '../../utils/EntityManager';
import { DiagramConfig } from '../../utils/DiagramManager';
import { checkEntitySync, buildSyncWarningMessage, EntitySyncResult } from '../../utils/EntitySyncChecker';

/** Create a minimal Entity for testing. */
function makeEntity(id: string, name: string): Entity {
    return { id, name, description: '', columns: [], linkedEntities: [] };
}

/** Create a minimal DiagramConfig for testing. */
function makeDiagram(entityIds: string[]): DiagramConfig {
    return { id: 'diag-1', name: 'Test Diagram', entityIds, positions: {} };
}

suite('EntitySyncChecker', () => {

    suite('checkEntitySync', () => {

        test('returns no mismatches when all diagram entities exist by id', () => {
            const entities = [
                makeEntity('e1', 'User'),
                makeEntity('e2', 'Order'),
                makeEntity('e3', 'Product'),
            ];
            const diagram = makeDiagram(['e1', 'e2', 'e3']);

            const result = checkEntitySync(diagram, entities);

            assert.deepStrictEqual(result.missingEntityIds, []);
            assert.strictEqual(result.hasMismatches, false);
            assert.strictEqual(result.summaryMessage, '');
        });

        test('returns no mismatches when all diagram entities exist by name', () => {
            const entities = [
                makeEntity('e1', 'User'),
                makeEntity('e2', 'Order'),
                makeEntity('e3', 'Product'),
            ];
            const diagram = makeDiagram(['User', 'Order', 'Product']);

            const result = checkEntitySync(diagram, entities);

            assert.deepStrictEqual(result.missingEntityIds, []);
            assert.strictEqual(result.hasMismatches, false);
            assert.strictEqual(result.summaryMessage, '');
        });

        test('detects missing entities', () => {
            const entities = [
                makeEntity('e1', 'User'),
                makeEntity('e2', 'Order'),
                makeEntity('e3', 'Product'),
            ];
            const diagram = makeDiagram(['e1', 'e2', 'e3', 'e4', 'e5']);

            const result = checkEntitySync(diagram, entities);

            assert.deepStrictEqual(result.missingEntityIds, ['e4', 'e5']);
            assert.strictEqual(result.hasMismatches, true);
        });

        test('summary message for 1 missing entity', () => {
            const entities = [makeEntity('e1', 'User')];
            const diagram = makeDiagram(['e1', 'Ghost']);

            const result = checkEntitySync(diagram, entities);

            assert.strictEqual(result.missingEntityIds.length, 1);
            assert.ok(result.summaryMessage.includes('1 entity'));
            assert.ok(result.summaryMessage.includes('Ghost'));
        });

        test('summary message for multiple missing entities', () => {
            const entities = [makeEntity('e1', 'User')];
            const diagram = makeDiagram(['e1', 'Ghost1', 'Ghost2', 'Ghost3']);

            const result = checkEntitySync(diagram, entities);

            assert.strictEqual(result.missingEntityIds.length, 3);
            assert.ok(result.summaryMessage.includes('3 entities'));
            assert.ok(result.summaryMessage.includes('Ghost1'));
            assert.ok(result.summaryMessage.includes('Ghost2'));
            assert.ok(result.summaryMessage.includes('Ghost3'));
        });

        test('summary message truncates when more than 5 missing', () => {
            const entities: Entity[] = [];
            const missingIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
            const diagram = makeDiagram(missingIds);

            const result = checkEntitySync(diagram, entities);

            assert.strictEqual(result.missingEntityIds.length, 8);
            // First 5 should appear
            assert.ok(result.summaryMessage.includes('m1'));
            assert.ok(result.summaryMessage.includes('m5'));
            // 6th and beyond should NOT appear individually
            assert.ok(!result.summaryMessage.includes('m6'));
            // Should indicate there are more
            assert.ok(result.summaryMessage.includes('3 more'));
        });

        test('handles empty diagram (no entityIds)', () => {
            const entities = [
                makeEntity('e1', 'User'),
                makeEntity('e2', 'Order'),
            ];
            const diagram = makeDiagram([]);

            const result = checkEntitySync(diagram, entities);

            assert.deepStrictEqual(result.missingEntityIds, []);
            assert.strictEqual(result.hasMismatches, false);
            assert.strictEqual(result.summaryMessage, '');
            assert.deepStrictEqual(result.availableButNotIncluded, ['e1', 'e2']);
        });

        test('handles empty entities list', () => {
            const entities: Entity[] = [];
            const diagram = makeDiagram(['e1', 'e2']);

            const result = checkEntitySync(diagram, entities);

            assert.deepStrictEqual(result.missingEntityIds, ['e1', 'e2']);
            assert.strictEqual(result.hasMismatches, true);
            assert.deepStrictEqual(result.availableButNotIncluded, []);
        });

        test('calculates availableButNotIncluded correctly', () => {
            const entities = [
                makeEntity('e1', 'User'),
                makeEntity('e2', 'Order'),
                makeEntity('e3', 'Product'),
                makeEntity('e4', 'Category'),
                makeEntity('e5', 'Review'),
            ];
            const diagram = makeDiagram(['e1', 'e3']);

            const result = checkEntitySync(diagram, entities);

            assert.strictEqual(result.hasMismatches, false);
            assert.deepStrictEqual(result.availableButNotIncluded, ['e2', 'e4', 'e5']);
        });

        test('mixed match — some by id, some by name, some missing', () => {
            const entities = [
                makeEntity('e1', 'User'),
                makeEntity('e2', 'Order'),
            ];
            const diagram = makeDiagram(['e1', 'Order', 'NonExistent']);

            const result = checkEntitySync(diagram, entities);

            assert.deepStrictEqual(result.missingEntityIds, ['NonExistent']);
            assert.strictEqual(result.hasMismatches, true);
            assert.deepStrictEqual(result.availableButNotIncluded, []);
        });
    });

    suite('buildSyncWarningMessage', () => {

        test('returns undefined when no mismatches', () => {
            const syncResult: EntitySyncResult = {
                missingEntityIds: [],
                availableButNotIncluded: [],
                hasMismatches: false,
                summaryMessage: '',
            };

            const message = buildSyncWarningMessage(syncResult);

            assert.strictEqual(message, undefined);
        });

        test('returns the summary message when mismatches exist', () => {
            const syncResult: EntitySyncResult = {
                missingEntityIds: ['e4'],
                availableButNotIncluded: [],
                hasMismatches: true,
                summaryMessage: '1 entity in this diagram no longer exist in the entities list (e4)',
            };

            const message = buildSyncWarningMessage(syncResult);

            assert.strictEqual(message, syncResult.summaryMessage);
        });
    });
});
