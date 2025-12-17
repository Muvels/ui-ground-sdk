/**
 * UI-Ground SDK: Query Orchestrator
 * High-level query pipeline combining lexical filtering with semantic reranking
 */

import type { IEmbeddingService } from "./embedding-service.js";
import type { UiDatabase } from "./db.js";
import type {
    QueryAST,
    QueryResult,
    MatchResult,
    ElementRole,
    NodeRecord,
} from "./types.js";

/**
 * Extended query with semantic search support
 */
export interface SemanticQueryAST extends QueryAST {
    /** Enable semantic reranking of results */
    semantic?: {
        enabled: boolean;
        /** Query text for embedding (uses name filter if not specified) */
        text?: string;
        /** Similarity threshold (0-1) */
        threshold?: number;
        /** Number of candidates to rerank */
        topK?: number;
    };
}

/**
 * Semantic match with similarity score
 */
export interface SemanticMatch {
    id: number;
    similarity: number;
}

/**
 * Query orchestrator that combines lexical and semantic search
 */
export class QueryOrchestrator {
    private db: UiDatabase;
    private embeddingService: IEmbeddingService | null;
    private wasmDb: any; // WasmUiDb when loaded

    constructor(db: UiDatabase, embeddingService: IEmbeddingService | null = null) {
        this.db = db;
        this.embeddingService = embeddingService;
        this.wasmDb = null;
    }

    /**
     * Set the WASM database for caching and similarity computation
     */
    setWasmDb(wasmDb: any): void {
        this.wasmDb = wasmDb;
    }

    /**
     * Set the embedding service for semantic search
     */
    setEmbeddingService(service: IEmbeddingService): void {
        this.embeddingService = service;
    }

    /**
     * Execute a query with optional semantic search
     */
    async query(q: SemanticQueryAST): Promise<QueryResult> {
        // If semantic not enabled or no embedding service, do lexical only
        if (!q.semantic?.enabled || !this.embeddingService?.isReady()) {
            return this.db.query(q);
        }

        // Semantic search mode: search all visible elements by semantic similarity
        return this.semanticSearch(q);
    }

    /**
     * Perform semantic search (primary search method)
     */
    private async semanticSearch(q: SemanticQueryAST): Promise<QueryResult> {
        if (!this.embeddingService) {
            return this.db.query(q);
        }

        const semantic = q.semantic!;
        const queryText = semantic.text || this.extractQueryText(q);
        const threshold = semantic.threshold ?? 0.3; // Lower default for better recall
        const topK = semantic.topK ?? 10;

        if (!queryText) {
            return this.db.query(q);
        }

        // Get all records (we'll filter by semantic similarity)
        const allRecords = this.db.getRecords();

        // Apply only role/state filters from lexical query (not text matching)
        let candidates = allRecords;
        for (const clause of q.where) {
            if ("role" in clause) {
                candidates = candidates.filter(r => r.role === clause.role);
            }
            if ("state" in clause) {
                // Apply state filters
            }
        }

        if (candidates.length === 0) {
            return {
                matches: [],
                total: 0,
                explain: { candidatesConsidered: 0, filtersApplied: ["semantic"], executionTimeMs: 0 }
            };
        }

        // Compute query embedding (e5 models require "query: " prefix)
        const [queryEmbedding] = await this.embeddingService.embed([`query: ${queryText}`]);

        // Compute embeddings for all candidates and score by similarity
        const results = await this.scoreBySemanticSimilarity(
            queryEmbedding,
            candidates,
            threshold,
            topK
        );

        return {
            matches: results,
            total: results.length,
            explain: {
                candidatesConsidered: candidates.length,
                filtersApplied: [`semantic(text="${queryText.slice(0, 30)}", threshold=${threshold})`],
                executionTimeMs: 0,
            },
        };
    }

    /**
     * Score candidates by semantic similarity
     */
    private async scoreBySemanticSimilarity(
        queryEmbedding: Float32Array,
        candidates: Array<{ id: number; name: string; context: string[]; role: string; fingerprint: string; rect: { x: number; y: number; width: number; height: number } }>,
        threshold: number,
        topK: number
    ): Promise<MatchResult[]> {
        if (!this.embeddingService) return [];

        const results: Array<MatchResult & { semanticScore: number }> = [];

        // Process in batches
        const batchSize = 8;
        for (let i = 0; i < candidates.length; i += batchSize) {
            const batch = candidates.slice(i, i + batchSize);

            // Compute text for each record (e5 models use "passage: " prefix for documents)
            const texts = batch.map((r) => {
                const parts = [r.name, ...r.context];
                return `passage: ${parts.join(" ").slice(0, 256)}`;
            });

            // Compute embeddings
            const embeddings = await this.embeddingService.embed(texts);

            // Score each
            for (let j = 0; j < batch.length; j++) {
                const record = batch[j];
                const embedding = embeddings[j];
                const similarity = this.cosineSimilarity(queryEmbedding, embedding);

                if (similarity >= threshold) {
                    results.push({
                        id: record.id,
                        role: record.role as ElementRole,
                        name: record.name,
                        context: record.context,
                        score: similarity,
                        semanticScore: similarity,
                        states: { visible: true, enabled: true }, // Approximation
                        actionability: { click: true, type: false, check: false, select: false, scroll: false },
                        rect: record.rect,
                        record: record as unknown as NodeRecord // Include the original record
                    });
                }
            }
        }

        // Sort by score and take top-k
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }

    /**
     * Extract query text from query AST (uses name filter value)
     */
    private extractQueryText(q: QueryAST): string {
        for (const clause of q.where) {
            if ("name" in clause) {
                return clause.name.value;
            }
            if ("in_context" in clause) {
                return clause.in_context.value;
            }
        }
        return "";
    }

    /**
     * Ensure all candidates have embeddings cached
     */
    private async ensureEmbeddings(matches: MatchResult[]): Promise<void> {
        if (!this.embeddingService) return;

        // Get records with fingerprints
        const records = this.db.getRecords();
        const matchIds = new Set(matches.map((m) => m.id));
        const candidates = records.filter((r) => matchIds.has(r.id));

        // Find which fingerprints are missing
        const fingerprints = candidates.map((r) => r.fingerprint);
        let missing: string[];

        if (this.wasmDb) {
            missing = this.wasmDb.get_missing_embeddings(fingerprints);
        } else {
            // Without WASM, we need to compute all
            missing = fingerprints;
        }

        if (missing.length === 0) return;

        // Get records for missing fingerprints
        const missingRecords = candidates.filter((r) => missing.includes(r.fingerprint));

        // Compute text for each record
        const texts = missingRecords.map((r) => {
            const parts = [r.name, ...r.context];
            return parts.join(" ").slice(0, 512); // Truncate for embedding model
        });

        // Compute embeddings
        const embeddings = await this.embeddingService.embed(texts);

        // Cache embeddings
        for (let i = 0; i < missingRecords.length; i++) {
            const fingerprint = missingRecords[i].fingerprint;
            const embedding = embeddings[i];

            if (this.wasmDb) {
                this.wasmDb.cache_embedding(fingerprint, Array.from(embedding));
            }
        }
    }


    /**
     * Compute cosine similarity (JS fallback)
     */
    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        if (a.length !== b.length) return 0;

        let dot = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
        }
        return dot; // Assumes normalized vectors
    }

    /**
     * Pre-compute embeddings for all records in the database
     */
    async computeAllEmbeddings(): Promise<number> {
        if (!this.embeddingService?.isReady()) {
            throw new Error("EmbeddingService not ready");
        }

        const records = this.db.getRecords();
        await this.ensureEmbeddings(
            records.map((r) => ({
                id: r.id,
                score: 0,
                role: r.role,
                name: r.name,
                states: { visible: true, enabled: true },
                context: r.context,
                actionability: { click: false, type: false, check: false, select: false, scroll: false },
                rect: r.rect,
                record: r,
            }))
        );

        return this.wasmDb?.cache_size() ?? records.length;
    }
}
