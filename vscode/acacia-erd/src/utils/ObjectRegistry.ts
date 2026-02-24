export class ObjectRegistry {
    private static instance: ObjectRegistry;
    private registry: Map<string, unknown>;

    private constructor() {
        this.registry = new Map<string, unknown>();
    }

    // Get the singleton instance
    public static getInstance(): ObjectRegistry {
        if (!ObjectRegistry.instance) {
            ObjectRegistry.instance = new ObjectRegistry();
        }
        return ObjectRegistry.instance;
    }

    // Add an object to the registry
    public set(key: string, value: unknown): void {
        this.registry.set(key, value);
    }

    // Retrieve an object from the registry
    public get<T>(key: string): T | undefined {
        return this.registry.get(key) as T;
    }

    // Remove an object from the registry
    public delete(key: string): void {
        this.registry.delete(key);
    }

    // Check if an object exists in the registry
    public has(key: string): boolean {
        return this.registry.has(key);
    }

    // Clear all objects from the registry
    public clear(): void {
        this.registry.clear();
    }
}