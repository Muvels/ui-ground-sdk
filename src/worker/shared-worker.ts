/**
 * UI-Ground SDK: SharedWorker Entry Point
 * Manages a shared embedding model across multiple browser tabs
 */

/// <reference lib="webworker" />

import { EmbeddingService } from "../embedding-service.js";
import type {
    WorkerRequest,
    WorkerResponse,
    WorkerBroadcast,
    InitRequest,
    EmbedRequest,
    StatusRequest,
    DisconnectRequest,
} from "./worker-protocol.js";

// SharedWorker global scope - 'self' is the worker global in webworker context
const workerSelf = self as unknown as SharedWorkerGlobalScope;

/** Connected client ports */
const clients: Set<MessagePort> = new Set();

/** Shared embedding service instance */
let embeddingService: EmbeddingService | null = null;

/** Current loading state */
let isLoading = false;
let loadingProgress = 0;
let isReady = false;
let initPromise: Promise<void> | null = null;

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: WorkerBroadcast): void {
    for (const port of clients) {
        port.postMessage(message);
    }
}

/**
 * Send a response to a specific client
 */
function respond(port: MessagePort, message: WorkerResponse): void {
    port.postMessage(message);
}

/**
 * Handle initialization request
 */
async function handleInit(port: MessagePort, request: InitRequest): Promise<void> {
    // If already ready, respond immediately
    if (isReady && embeddingService) {
        respond(port, {
            type: "init_response",
            requestId: request.requestId,
            success: true,
        });
        return;
    }

    // If already loading, wait for it
    if (initPromise) {
        try {
            await initPromise;
            respond(port, {
                type: "init_response",
                requestId: request.requestId,
                success: true,
            });
        } catch (error) {
            respond(port, {
                type: "init_response",
                requestId: request.requestId,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return;
    }

    // Start loading
    isLoading = true;
    loadingProgress = 0;

    initPromise = (async () => {
        try {
            embeddingService = new EmbeddingService(request.modelName);

            await embeddingService.initialize((progress) => {
                loadingProgress = progress;
                broadcast({ type: "progress", progress });
            });

            isReady = true;
            isLoading = false;
            broadcast({ type: "ready" });

            respond(port, {
                type: "init_response",
                requestId: request.requestId,
                success: true,
            });
        } catch (error) {
            isLoading = false;
            const errorMessage = error instanceof Error ? error.message : String(error);
            broadcast({ type: "error", message: errorMessage });

            respond(port, {
                type: "init_response",
                requestId: request.requestId,
                success: false,
                error: errorMessage,
            });

            throw error;
        }
    })();

    await initPromise;
}

/**
 * Handle embedding request
 */
async function handleEmbed(port: MessagePort, request: EmbedRequest): Promise<void> {
    if (!embeddingService || !isReady) {
        respond(port, {
            type: "embed_response",
            requestId: request.requestId,
            error: "Embedding service not initialized",
        });
        return;
    }

    try {
        const embeddings = await embeddingService.embed(request.texts);
        respond(port, {
            type: "embed_response",
            requestId: request.requestId,
            embeddings,
        });
    } catch (error) {
        respond(port, {
            type: "embed_response",
            requestId: request.requestId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Handle status request
 */
function handleStatus(port: MessagePort, request: StatusRequest): void {
    respond(port, {
        type: "status_response",
        requestId: request.requestId,
        ready: isReady,
        loading: isLoading,
        progress: loadingProgress,
        connectedClients: clients.size,
    });
}

/**
 * Handle disconnect request
 */
function handleDisconnect(port: MessagePort, request: DisconnectRequest): void {
    clients.delete(port);
    respond(port, {
        type: "disconnect_response",
        requestId: request.requestId,
    });
    port.close();
}

/**
 * Handle incoming messages from clients
 */
function handleMessage(port: MessagePort, event: MessageEvent): void {
    const request = event.data as WorkerRequest;

    switch (request.type) {
        case "init":
            handleInit(port, request);
            break;
        case "embed":
            handleEmbed(port, request);
            break;
        case "status":
            handleStatus(port, request);
            break;
        case "disconnect":
            handleDisconnect(port, request);
            break;
    }
}

/**
 * Handle new client connections
 */
workerSelf.onconnect = (event: MessageEvent) => {
    const port = event.ports[0];
    clients.add(port);

    port.onmessage = (msgEvent) => handleMessage(port, msgEvent);
    port.start();

    console.log(`[SharedWorker] Client connected (${clients.size} total)`);
};

console.log("[SharedWorker] UI-Ground embedding worker started");

