/**
 * UI-Ground SDK
 * Local UI Database + Query Engine for browser-based UI navigation
 *
 * @packageDocumentation
 */

export * from "./types.js";
export { DOMCollector, collectSnapshot } from "./collector.js";
export { ElementHandleMap } from "./handles.js";
export { UiDatabase } from "./db.js";
export { EmbeddingService, EMBEDDING_DIMS, type IEmbeddingService } from "./embedding-service.js";
export { QueryOrchestrator, type SemanticQueryAST } from "./orchestrator.js";
export { IconMatcher } from "./icon-matcher.js";

// Worker-based embedding (SharedWorker for cross-tab model sharing)
export {
    createWorkerEmbedding,
    WorkerEmbeddingClient,
    isSharedWorkerSupported,
    isWorkerSupported,
    type WorkerOptions,
} from "./worker/index.js";

import { collectSnapshot } from "./collector.js";
import { UiDatabase } from "./db.js";
import { ElementHandleMap } from "./handles.js";
import { NodeRecord, QueryAST, QueryResult, UiDbConfig, EngineType, WasmDbInstance } from "./types.js";

/**
 * Main UI-Ground SDK class
 * Provides a unified interface for collecting, querying, and resolving UI elements
 */
export class UiGround {
    private db: UiDatabase;
    private handles: ElementHandleMap;
    private config: UiDbConfig;
    private elements: Element[] = [];
    private _engineType: EngineType = "js";
    private _wasmAvailable = false;
    private wasmDb: WasmDbInstance | null = null;

    constructor(config: UiDbConfig = {}) {
        this.config = config;
        this.db = new UiDatabase();
        this.handles = new ElementHandleMap();
        this._initEngine();
    }

    /**
     * Initialize engine based on config preference
     */
    private _initEngine(): void {
        const preference = this.config.engine ?? "auto";

        // Check if WASM module is provided in config
        if (this.config.wasmModule) {
            try {
                this.wasmDb = new this.config.wasmModule();
                this._wasmAvailable = true;
                console.log("[UiGround] WASM module loaded successfully");
            } catch (err) {
                console.warn("[UiGround] Failed to initialize WASM module:", err);
                this._wasmAvailable = false;
            }
        }

        if (preference === "js") {
            this._engineType = "js";
        } else if (preference === "wasm") {
            if (!this._wasmAvailable) {
                console.warn("[UiGround] WASM requested but not available, falling back to JS");
                this._engineType = "js";
            } else {
                this._engineType = "wasm";
            }
        } else {
            // auto: use WASM if available
            this._engineType = this._wasmAvailable ? "wasm" : "js";
        }

        console.log(`[UiGround] Engine: ${this._engineType.toUpperCase()}`);
    }

    /**
     * Get the current engine type being used
     */
    getEngineType(): EngineType {
        return this._engineType;
    }

    /**
     * Check if WASM engine is available
     */
    isWasmAvailable(): boolean {
        return this._wasmAvailable;
    }

    /**
     * Get the WASM database instance (for QueryOrchestrator)
     */
    getWasmDb(): WasmDbInstance | null {
        return this.wasmDb;
    }

    /**
     * Initialize the SDK with configuration
     */
    init(config?: UiDbConfig): void {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * Collect a fresh snapshot of the current DOM state
     * Call this after page load or after significant UI changes
     */
    snapshot(): NodeRecord[] {
        const { records, elements } = collectSnapshot(this.config);

        // Reset and re-register handles
        this.handles.clear();
        this.elements = elements;

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const element = elements[i];
            // Update record ID to match handle ID
            record.id = this.handles.register(element, record);
        }

        // Ingest into database
        this.db.ingest(records);

        return records;
    }

    /**
     * Execute a query against the current snapshot
     */
    query(q: QueryAST): QueryResult {
        return this.db.query(q);
    }

    /**
     * Parse and execute a query from JSON string
     */
    queryFromJson(jsonString: string): QueryResult {
        const q = JSON.parse(jsonString) as QueryAST;
        return this.query(q);
    }

    /**
     * Resolve an element ID to a DOM Element
     * Returns null if element is no longer available
     */
    resolveHandle(id: number): Element | null {
        return this.handles.getElement(id);
    }

    /**
     * Get the element at a specific index from the last snapshot
     */
    getElementAt(index: number): Element | undefined {
        return this.elements[index];
    }

    /**
     * Get all records from the current snapshot
     */
    getRecords(): NodeRecord[] {
        return this.db.getRecords();
    }

    /**
     * Get a specific record by ID
     */
    getRecord(id: number): NodeRecord | undefined {
        return this.db.getRecord(id);
    }

    /**
     * Get the number of elements in the current snapshot
     */
    get size(): number {
        return this.handles.size;
    }

    /**
     * Clear all data
     */
    reset(): void {
        this.db.reset();
        this.handles.clear();
        this.elements = [];
    }
}

// Default singleton instance
let defaultInstance: UiGround | null = null;

/**
 * Get the default UiGround instance
 */
export function getUiGround(): UiGround {
    if (!defaultInstance) {
        defaultInstance = new UiGround();
    }
    return defaultInstance;
}

/**
 * Initialize the default instance with configuration
 */
export function init(config?: UiDbConfig): void {
    getUiGround().init(config);
}

/**
 * Collect a fresh snapshot using the default instance
 */
export function snapshot(): NodeRecord[] {
    return getUiGround().snapshot();
}

/**
 * Execute a query using the default instance
 */
export function query(q: QueryAST): QueryResult {
    return getUiGround().query(q);
}

/**
 * Resolve a handle using the default instance
 */
export function resolveHandle(id: number): Element | null {
    return getUiGround().resolveHandle(id);
}
