"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectRegistry = void 0;
class ObjectRegistry {
    static instance;
    registry;
    constructor() {
        this.registry = new Map();
    }
    // Get the singleton instance
    static getInstance() {
        if (!ObjectRegistry.instance) {
            ObjectRegistry.instance = new ObjectRegistry();
        }
        return ObjectRegistry.instance;
    }
    // Add an object to the registry
    set(key, value) {
        this.registry.set(key, value);
    }
    // Retrieve an object from the registry
    get(key) {
        return this.registry.get(key);
    }
    // Remove an object from the registry
    delete(key) {
        this.registry.delete(key);
    }
    // Check if an object exists in the registry
    has(key) {
        return this.registry.has(key);
    }
    // Clear all objects from the registry
    clear() {
        this.registry.clear();
    }
}
exports.ObjectRegistry = ObjectRegistry;
//# sourceMappingURL=ObjectRegistry.js.map