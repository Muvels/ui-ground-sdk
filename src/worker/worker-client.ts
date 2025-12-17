/**
 * UI-Ground SDK: Worker Embedding Client
 * Client-side proxy that communicates with SharedWorker or DedicatedWorker
 * Provides the same interface as EmbeddingService
 */

import type {
    WorkerOptions,
    WorkerMessage,
    WorkerResponse,
    WorkerBroadcast,
    RequestId,
} from "./worker-protocol.js";
import { generateRequestId } from "./worker-protocol.js";

/** Pending request with resolve/reject callbacks */
interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
}

/**
 * Worker-based embedding client
 * Implements the same interface as EmbeddingService but proxies to a worker
 */
export class WorkerEmbeddingClient {
    private worker: SharedWorker | Worker | null = null;
    private port: MessagePort | null = null;
    private pendingRequests = new Map<RequestId, PendingRequest>();
    private options: WorkerOptions;
    private _ready = false;
    private _loading = false;
    private _progress = 0;
    private isShared = false;

    constructor(options: WorkerOptions = {}) {
        this.options = options;
    }

    /**
     * Initialize the worker and embedding model
     */
    async initialize(): Promise<void> {
        if (this._ready) return;

        // Determine worker type and URL
        const useSharedWorker = !this.options.forceDedicated && typeof SharedWorker !== "undefined";
        this.isShared = useSharedWorker;

        // Get worker URLs - these need to be bundled/built appropriately
        const sharedWorkerUrl = this.options.workerUrl || new URL("./shared-worker.js", import.meta.url).href;
        const dedicatedWorkerUrl = this.options.workerUrl || new URL("./dedicated-worker.js", import.meta.url).href;

        try {
            if (useSharedWorker) {
                this.worker = new SharedWorker(sharedWorkerUrl, {
                    type: "module",
                    name: "ui-ground-embedding",
                });
                this.port = (this.worker as SharedWorker).port;
                this.port.start();
            } else {
                this.worker = new Worker(dedicatedWorkerUrl, {
                    type: "module",
                    name: "ui-ground-embedding",
                });
                // For dedicated workers, we use the worker directly as message channel
                this.port = null;
            }

            this.setupMessageHandler();

            // Send init request
            const requestId = generateRequestId();
            this._loading = true;

            const initPromise = new Promise<void>((resolve, reject) => {
                this.pendingRequests.set(requestId, {
                    resolve: () => resolve(),
                    reject,
                });
            });

            this.send({
                type: "init",
                requestId,
                modelName: this.options.modelName,
            });

            await initPromise;
            this._ready = true;
            this._loading = false;
        } catch (error) {
            this._loading = false;
            throw error;
        }
    }

    /**
     * Setup message handler for worker responses
     */
    private setupMessageHandler(): void {
        const handler = (event: MessageEvent) => {
            const message = event.data as WorkerMessage;
            this.handleMessage(message);
        };

        if (this.port) {
            this.port.onmessage = handler;
        } else if (this.worker && !this.isShared) {
            // For dedicated workers, attach handler directly to worker
            (this.worker as Worker).onmessage = handler;
        }
    }

    /**
     * Handle incoming messages from worker
     */
    private handleMessage(message: WorkerMessage): void {
        // Handle broadcasts (no requestId)
        if (this.isBroadcast(message)) {
            this.handleBroadcast(message);
            return;
        }

        // Handle responses (have requestId)
        const response = message as WorkerResponse;
        const pending = this.pendingRequests.get(response.requestId);
        if (!pending) return;

        this.pendingRequests.delete(response.requestId);

        switch (response.type) {
            case "init_response":
                if (response.success) {
                    pending.resolve(undefined);
                } else {
                    pending.reject(new Error(response.error || "Init failed"));
                }
                break;

            case "embed_response":
                if (response.embeddings) {
                    pending.resolve(response.embeddings);
                } else {
                    pending.reject(new Error(response.error || "Embed failed"));
                }
                break;

            case "status_response":
                pending.resolve(response);
                break;

            case "disconnect_response":
                pending.resolve(undefined);
                break;
        }
    }

    /**
     * Check if message is a broadcast
     */
    private isBroadcast(message: WorkerMessage): message is WorkerBroadcast {
        return message.type === "progress" || message.type === "ready" || message.type === "error";
    }

    /**
     * Handle broadcast messages
     */
    private handleBroadcast(message: WorkerBroadcast): void {
        switch (message.type) {
            case "progress":
                this._progress = message.progress;
                this.options.onProgress?.(message.progress);
                break;

            case "ready":
                this._ready = true;
                this._loading = false;
                this.options.onReady?.();
                break;

            case "error":
                this.options.onError?.(message.message);
                break;
        }
    }

    /**
     * Send a message to the worker
     */
    private send(message: WorkerMessage): void {
        if (this.port) {
            this.port.postMessage(message);
        } else if (this.worker && !this.isShared) {
            // For dedicated workers, post directly to worker
            (this.worker as Worker).postMessage(message);
        }
    }

    /**
     * Compute embeddings for multiple texts
     */
    async embed(texts: string[]): Promise<Float32Array[]> {
        if (!this._ready) {
            throw new Error("WorkerEmbeddingClient not initialized");
        }

        const requestId = generateRequestId();

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, {
                resolve: (value) => resolve(value as Float32Array[]),
                reject,
            });

            this.send({
                type: "embed",
                requestId,
                texts,
            });
        });
    }

    /**
     * Compute a single embedding
     */
    async embedSingle(text: string): Promise<Float32Array> {
        const [embedding] = await this.embed([text]);
        return embedding;
    }

    /**
     * Check if the service is ready
     */
    isReady(): boolean {
        return this._ready;
    }

    /**
     * Check if currently loading
     */
    isLoading(): boolean {
        return this._loading;
    }

    /**
     * Get loading progress (0-100)
     */
    getLoadingProgress(): number {
        return this._progress;
    }

    /**
     * Get embedding dimension (same as EmbeddingService)
     */
    getEmbeddingDim(): number {
        return 384; // multilingual-e5-small
    }

    /**
     * Check if using SharedWorker
     */
    isSharedWorker(): boolean {
        return this.isShared;
    }

    /**
     * Disconnect from the worker
     */
    disconnect(): void {
        const requestId = generateRequestId();
        this.send({ type: "disconnect", requestId });

        if (this.port) {
            this.port.close();
        }

        this.worker = null;
        this.port = null;
        this._ready = false;
    }

    /**
     * Get current status from worker
     */
    async getStatus(): Promise<{
        ready: boolean;
        loading: boolean;
        progress: number;
        connectedClients: number;
    }> {
        const requestId = generateRequestId();

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, {
                resolve: (value) => resolve(value as {
                    ready: boolean;
                    loading: boolean;
                    progress: number;
                    connectedClients: number;
                }),
                reject,
            });

            this.send({ type: "status", requestId });
        });
    }
}
