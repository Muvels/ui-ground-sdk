/**
 * UI-Ground SDK: Worker Protocol
 * Message types and protocol for SharedWorker/DedicatedWorker communication
 */

/** Unique request ID for correlating async responses */
export type RequestId = string;

/** Generate a unique request ID */
export function generateRequestId(): RequestId {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Request Messages (Client -> Worker)
// ============================================================================

/** Initialize the embedding model */
export interface InitRequest {
    type: "init";
    requestId: RequestId;
    modelName?: string;
}

/** Compute embeddings for texts */
export interface EmbedRequest {
    type: "embed";
    requestId: RequestId;
    texts: string[];
}

/** Get current status */
export interface StatusRequest {
    type: "status";
    requestId: RequestId;
}

/** Disconnect client (cleanup) */
export interface DisconnectRequest {
    type: "disconnect";
    requestId: RequestId;
}

export type WorkerRequest = InitRequest | EmbedRequest | StatusRequest | DisconnectRequest;

// ============================================================================
// Response Messages (Worker -> Client)
// ============================================================================

/** Initialization complete */
export interface InitResponse {
    type: "init_response";
    requestId: RequestId;
    success: boolean;
    error?: string;
}

/** Embedding computation result */
export interface EmbedResponse {
    type: "embed_response";
    requestId: RequestId;
    embeddings?: Float32Array[];
    error?: string;
}

/** Current status */
export interface StatusResponse {
    type: "status_response";
    requestId: RequestId;
    ready: boolean;
    loading: boolean;
    progress: number;
    connectedClients: number;
}

/** Disconnect acknowledgment */
export interface DisconnectResponse {
    type: "disconnect_response";
    requestId: RequestId;
}

export type WorkerResponse = InitResponse | EmbedResponse | StatusResponse | DisconnectResponse;

// ============================================================================
// Broadcast Messages (Worker -> All Clients)
// ============================================================================

/** Model loading progress update */
export interface ProgressBroadcast {
    type: "progress";
    progress: number;
}

/** Model ready notification */
export interface ReadyBroadcast {
    type: "ready";
}

/** Error notification */
export interface ErrorBroadcast {
    type: "error";
    message: string;
}

export type WorkerBroadcast = ProgressBroadcast | ReadyBroadcast | ErrorBroadcast;

// ============================================================================
// Union Types
// ============================================================================

export type WorkerMessage = WorkerRequest | WorkerResponse | WorkerBroadcast;

// ============================================================================
// Worker Options
// ============================================================================

export interface WorkerOptions {
    /** Custom model name (default: Xenova/multilingual-e5-small) */
    modelName?: string;
    /** Progress callback during model loading */
    onProgress?: (progress: number) => void;
    /** Ready callback when model is loaded */
    onReady?: () => void;
    /** Error callback */
    onError?: (error: string) => void;
    /** Force dedicated worker even if SharedWorker is available */
    forceDedicated?: boolean;
    /** Custom worker URL (for bundler configurations) */
    workerUrl?: string;
}
