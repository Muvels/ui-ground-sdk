/**
 * UI-Ground SDK: Embedding Service
 * HuggingFace Transformers.js integration for semantic search embeddings
 */

import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

/** Default model - using multilingual for cross-language semantic search */
const DEFAULT_MODEL = "Xenova/multilingual-e5-small";

/** Embedding dimensions for different models */
export const EMBEDDING_DIMS = {
    "all-MiniLM-L6-v2": 384,
    "multilingual-e5-small": 384,
    "e5-small-v2": 384,
} as const;

/**
 * Common interface for embedding services
 * Implemented by both EmbeddingService and WorkerEmbeddingClient
 */
export interface IEmbeddingService {
    /** Check if the service is ready to embed */
    isReady(): boolean;
    /** Compute embeddings for multiple texts */
    embed(texts: string[]): Promise<Float32Array[]>;
    /** Compute a single embedding */
    embedSingle(text: string): Promise<Float32Array>;
    /** Get embedding dimension */
    getEmbeddingDim(): number;
    /** Get loading progress (0-100) */
    getLoadingProgress(): number;
}

/**
 * Embedding service using HuggingFace Transformers.js
 */
export class EmbeddingService {
    private extractor: FeatureExtractionPipeline | null = null;
    private modelName: string;
    private ready = false;
    private embeddingDim = 384;
    private loadingProgress = 0;

    constructor(modelName: string = DEFAULT_MODEL) {
        this.modelName = modelName;
    }

    /**
     * Initialize the embedding model
     */
    async initialize(onProgress?: (progress: number) => void): Promise<void> {
        if (this.ready) return;

        try {
            console.log("[EmbeddingService] Loading model:", this.modelName);

            // @ts-expect-error - Transformers.js pipeline has complex union types
            this.extractor = await pipeline("feature-extraction", this.modelName, {
                progress_callback: (data: { status: string; progress?: number }) => {
                    if (data.progress !== undefined) {
                        this.loadingProgress = data.progress;
                        onProgress?.(data.progress);
                        console.log(`[EmbeddingService] Loading: ${data.progress.toFixed(0)}%`);
                    }
                },
            });

            console.log("[EmbeddingService] Model loaded successfully");
            this.ready = true;
        } catch (error) {
            console.error("[EmbeddingService] Initialization failed:", error);
            throw error;
        }
    }

    /**
     * Compute embeddings for multiple texts
     */
    async embed(texts: string[]): Promise<Float32Array[]> {
        if (!this.ready || !this.extractor) {
            throw new Error("EmbeddingService not initialized");
        }

        const results: Float32Array[] = [];

        // Process texts individually to get proper embeddings
        for (const text of texts) {
            const output = await this.extractor(text, {
                pooling: "mean",
                normalize: true,
            });

            // Get the embedding data
            const embedding = new Float32Array(output.data as Float32Array);
            results.push(embedding);
        }

        return results;
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
        return this.ready;
    }

    /**
     * Get embedding dimension
     */
    getEmbeddingDim(): number {
        return this.embeddingDim;
    }

    /**
     * Get loading progress (0-100)
     */
    getLoadingProgress(): number {
        return this.loadingProgress;
    }
}
