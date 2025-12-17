/**
 * UI-Ground SDK: Worker Module Public API
 * Factory functions and exports for worker-based embedding service
 */

export { WorkerEmbeddingClient } from "./worker-client.js";
export type {
    WorkerOptions,
    WorkerMessage,
    WorkerRequest,
    WorkerResponse,
    WorkerBroadcast,
} from "./worker-protocol.js";
export { generateRequestId } from "./worker-protocol.js";

import { WorkerEmbeddingClient } from "./worker-client.js";
import type { WorkerOptions } from "./worker-protocol.js";

/**
 * Create a worker-based embedding service
 * 
 * This is the primary API for using the embedding model in a worker.
 * The worker is shared across all tabs in the same origin (using SharedWorker),
 * so the model is only loaded once regardless of how many tabs are open.
 * 
 * Falls back to a dedicated worker in browsers without SharedWorker support (Safari).
 * 
 * @example
 * ```typescript
 * import { createWorkerEmbedding } from 'ui-ground-sdk';
 * 
 * // Create shared embedding service
 * const embeddingService = await createWorkerEmbedding({
 *   onProgress: (pct) => console.log(`Loading: ${pct}%`),
 * });
 * 
 * // Use with QueryOrchestrator
 * const orchestrator = new QueryOrchestrator(db, embeddingService);
 * 
 * // When done (optional - auto-cleaned on tab close)
 * embeddingService.disconnect();
 * ```
 */
export async function createWorkerEmbedding(options?: WorkerOptions): Promise<WorkerEmbeddingClient> {
    const client = new WorkerEmbeddingClient(options);
    await client.initialize();
    return client;
}

/**
 * Check if SharedWorker is supported in the current browser
 */
export function isSharedWorkerSupported(): boolean {
    return typeof SharedWorker !== "undefined";
}

/**
 * Check if any type of Worker is supported
 */
export function isWorkerSupported(): boolean {
    return typeof Worker !== "undefined";
}
