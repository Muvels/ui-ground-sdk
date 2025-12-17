/**
 * UI-Ground SDK: Dedicated Worker Entry Point
 * Fallback for browsers without SharedWorker support (Safari)
 * Same protocol as SharedWorker but doesn't share across tabs
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
} from "./worker-protocol.js";

// DedicatedWorker global scope - 'self' is the worker global in webworker context
const workerSelf = self as unknown as DedicatedWorkerGlobalScope;

/** Embedding service instance */
let embeddingService: EmbeddingService | null = null;

/** Current loading state */
let isLoading = false;
let loadingProgress = 0;
let isReady = false;
let initPromise: Promise<void> | null = null;

/**
 * Send a message to the main thread
 */
function send(message: WorkerResponse | WorkerBroadcast): void {
    workerSelf.postMessage(message);
}

/**
 * Handle initialization request
 */
async function handleInit(request: InitRequest): Promise<void> {
    // If already ready, respond immediately
    if (isReady && embeddingService) {
        send({
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
            send({
                type: "init_response",
                requestId: request.requestId,
                success: true,
            });
        } catch (error) {
            send({
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
                send({ type: "progress", progress });
            });

            isReady = true;
            isLoading = false;
            send({ type: "ready" });

            send({
                type: "init_response",
                requestId: request.requestId,
                success: true,
            });
        } catch (error) {
            isLoading = false;
            const errorMessage = error instanceof Error ? error.message : String(error);
            send({ type: "error", message: errorMessage });

            send({
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
async function handleEmbed(request: EmbedRequest): Promise<void> {
    if (!embeddingService || !isReady) {
        send({
            type: "embed_response",
            requestId: request.requestId,
            error: "Embedding service not initialized",
        });
        return;
    }

    try {
        const embeddings = await embeddingService.embed(request.texts);
        send({
            type: "embed_response",
            requestId: request.requestId,
            embeddings,
        });
    } catch (error) {
        send({
            type: "embed_response",
            requestId: request.requestId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Handle status request
 */
function handleStatus(request: StatusRequest): void {
    send({
        type: "status_response",
        requestId: request.requestId,
        ready: isReady,
        loading: isLoading,
        progress: loadingProgress,
        connectedClients: 1, // Dedicated worker only has one client
    });
}

/**
 * Handle incoming messages from main thread
 */
workerSelf.onmessage = (event: MessageEvent) => {
    const request = event.data as WorkerRequest;

    switch (request.type) {
        case "init":
            handleInit(request);
            break;
        case "embed":
            handleEmbed(request);
            break;
        case "status":
            handleStatus(request);
            break;
        case "disconnect":
            // Dedicated worker just closes
            workerSelf.close();
            break;
    }
};

console.log("[DedicatedWorker] UI-Ground embedding worker started");
