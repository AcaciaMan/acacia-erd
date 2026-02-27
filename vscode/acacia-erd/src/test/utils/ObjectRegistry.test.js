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
const assert = __importStar(require("assert"));
const ObjectRegistry_1 = require("../../utils/ObjectRegistry");
const testHelpers_1 = require("../testHelpers");
suite('ObjectRegistry', () => {
    setup(() => {
        (0, testHelpers_1.resetSingletons)();
    });
    teardown(() => {
        (0, testHelpers_1.resetSingletons)();
    });
    // ── Singleton behavior ──────────────────────────────────────────────
    suite('Singleton behavior', () => {
        test('getInstance() always returns the same instance', () => {
            const a = ObjectRegistry_1.ObjectRegistry.getInstance();
            const b = ObjectRegistry_1.ObjectRegistry.getInstance();
            assert.strictEqual(a, b);
        });
        test('multiple calls return identical reference', () => {
            const instances = Array.from({ length: 5 }, () => ObjectRegistry_1.ObjectRegistry.getInstance());
            for (const inst of instances) {
                assert.strictEqual(inst, instances[0]);
            }
        });
    });
    // ── set() and get() ─────────────────────────────────────────────────
    suite('set() and get()', () => {
        test('store and retrieve a string value', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            reg.set('greeting', 'hello');
            assert.strictEqual(reg.get('greeting'), 'hello');
        });
        test('store and retrieve an object value', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            const obj = { id: 1, name: 'test' };
            reg.set('myObj', obj);
            assert.deepStrictEqual(reg.get('myObj'), obj);
        });
        test('store and retrieve with generic typing', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            const val = { x: 42, y: 'typed' };
            reg.set('typed', val);
            const result = reg.get('typed');
            assert.ok(result);
            assert.strictEqual(result.x, 42);
            assert.strictEqual(result.y, 'typed');
        });
        test('overwrite an existing key returns new value', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            reg.set('key', 'first');
            reg.set('key', 'second');
            assert.strictEqual(reg.get('key'), 'second');
        });
    });
    // ── get() for missing keys ──────────────────────────────────────────
    suite('get() for missing keys', () => {
        test('returns undefined for a key that was never set', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            assert.strictEqual(reg.get('nonexistent'), undefined);
        });
    });
    // ── has() ───────────────────────────────────────────────────────────
    suite('has()', () => {
        test('returns true for an existing key', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            reg.set('present', 123);
            assert.strictEqual(reg.has('present'), true);
        });
        test('returns false for a missing key', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            assert.strictEqual(reg.has('absent'), false);
        });
    });
    // ── delete() ────────────────────────────────────────────────────────
    suite('delete()', () => {
        test('deleting an existing key makes has() return false', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            reg.set('toDelete', 'value');
            assert.strictEqual(reg.has('toDelete'), true);
            reg.delete('toDelete');
            assert.strictEqual(reg.has('toDelete'), false);
            assert.strictEqual(reg.get('toDelete'), undefined);
        });
        test('deleting a non-existent key does not throw', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            assert.doesNotThrow(() => reg.delete('nope'));
        });
    });
    // ── clear() ─────────────────────────────────────────────────────────
    suite('clear()', () => {
        test('after clear(), all previously set keys return undefined', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            reg.set('a', 1);
            reg.set('b', 2);
            reg.set('c', 3);
            reg.clear();
            assert.strictEqual(reg.get('a'), undefined);
            assert.strictEqual(reg.get('b'), undefined);
            assert.strictEqual(reg.get('c'), undefined);
        });
        test('has() returns false for all cleared keys', () => {
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
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
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            reg.set('isolation', 'fromFirst');
            assert.strictEqual(reg.get('isolation'), 'fromFirst');
        });
        test('second test starts with a clean registry', () => {
            // Because resetSingletons() runs in setup(), this is a new instance
            const reg = ObjectRegistry_1.ObjectRegistry.getInstance();
            assert.strictEqual(reg.has('isolation'), false);
            assert.strictEqual(reg.get('isolation'), undefined);
        });
    });
});
//# sourceMappingURL=ObjectRegistry.test.js.map