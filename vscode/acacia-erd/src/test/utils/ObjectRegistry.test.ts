import * as assert from 'assert';
import { ObjectRegistry } from '../../utils/ObjectRegistry';
import { resetSingletons } from '../testHelpers';

suite('ObjectRegistry', () => {

    setup(() => {
        resetSingletons();
    });

    teardown(() => {
        resetSingletons();
    });

    // ── Singleton behavior ──────────────────────────────────────────────

    suite('Singleton behavior', () => {
        test('getInstance() always returns the same instance', () => {
            const a = ObjectRegistry.getInstance();
            const b = ObjectRegistry.getInstance();
            assert.strictEqual(a, b);
        });

        test('multiple calls return identical reference', () => {
            const instances = Array.from({ length: 5 }, () => ObjectRegistry.getInstance());
            for (const inst of instances) {
                assert.strictEqual(inst, instances[0]);
            }
        });
    });

    // ── set() and get() ─────────────────────────────────────────────────

    suite('set() and get()', () => {
        test('store and retrieve a string value', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('greeting', 'hello');
            assert.strictEqual(reg.get<string>('greeting'), 'hello');
        });

        test('store and retrieve an object value', () => {
            const reg = ObjectRegistry.getInstance();
            const obj = { id: 1, name: 'test' };
            reg.set('myObj', obj);
            assert.deepStrictEqual(reg.get('myObj'), obj);
        });

        test('store and retrieve with generic typing', () => {
            interface MyType { x: number; y: string; }
            const reg = ObjectRegistry.getInstance();
            const val: MyType = { x: 42, y: 'typed' };
            reg.set('typed', val);
            const result = reg.get<MyType>('typed');
            assert.ok(result);
            assert.strictEqual(result.x, 42);
            assert.strictEqual(result.y, 'typed');
        });

        test('overwrite an existing key returns new value', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('key', 'first');
            reg.set('key', 'second');
            assert.strictEqual(reg.get<string>('key'), 'second');
        });
    });

    // ── get() for missing keys ──────────────────────────────────────────

    suite('get() for missing keys', () => {
        test('returns undefined for a key that was never set', () => {
            const reg = ObjectRegistry.getInstance();
            assert.strictEqual(reg.get('nonexistent'), undefined);
        });
    });

    // ── has() ───────────────────────────────────────────────────────────

    suite('has()', () => {
        test('returns true for an existing key', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('present', 123);
            assert.strictEqual(reg.has('present'), true);
        });

        test('returns false for a missing key', () => {
            const reg = ObjectRegistry.getInstance();
            assert.strictEqual(reg.has('absent'), false);
        });
    });

    // ── delete() ────────────────────────────────────────────────────────

    suite('delete()', () => {
        test('deleting an existing key makes has() return false', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('toDelete', 'value');
            assert.strictEqual(reg.has('toDelete'), true);
            reg.delete('toDelete');
            assert.strictEqual(reg.has('toDelete'), false);
            assert.strictEqual(reg.get('toDelete'), undefined);
        });

        test('deleting a non-existent key does not throw', () => {
            const reg = ObjectRegistry.getInstance();
            assert.doesNotThrow(() => reg.delete('nope'));
        });
    });

    // ── clear() ─────────────────────────────────────────────────────────

    suite('clear()', () => {
        test('after clear(), all previously set keys return undefined', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('a', 1);
            reg.set('b', 2);
            reg.set('c', 3);
            reg.clear();
            assert.strictEqual(reg.get('a'), undefined);
            assert.strictEqual(reg.get('b'), undefined);
            assert.strictEqual(reg.get('c'), undefined);
        });

        test('has() returns false for all cleared keys', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('x', 'val');
            reg.set('y', 'val');
            reg.clear();
            assert.strictEqual(reg.has('x'), false);
            assert.strictEqual(reg.has('y'), false);
        });
    });

    // ── Isolation between tests ─────────────────────────────────────────

    suite('Isolation between tests', () => {
        test('first test sets a value', () => {
            const reg = ObjectRegistry.getInstance();
            reg.set('isolation', 'fromFirst');
            assert.strictEqual(reg.get<string>('isolation'), 'fromFirst');
        });

        test('second test starts with a clean registry', () => {
            // Because resetSingletons() runs in setup(), this is a new instance
            const reg = ObjectRegistry.getInstance();
            assert.strictEqual(reg.has('isolation'), false);
            assert.strictEqual(reg.get('isolation'), undefined);
        });
    });
});
