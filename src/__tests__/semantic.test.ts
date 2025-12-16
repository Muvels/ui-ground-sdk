/**
 * Semantic Search Tests
 * Tests for embedding generation, similarity calculation, and query orchestration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryOrchestrator } from '../orchestrator.js';
import { UiDatabase } from '../db.js';
import { NodeRecord, ElementRole, SemanticQueryAST } from '../types.js';

// Mock EmbeddingService class
vi.mock('../embedding-service.js', () => {
    return {
        EmbeddingService: class {
            initialize = vi.fn().mockResolvedValue(undefined);
            isReady = vi.fn().mockReturnValue(true);
            embed = vi.fn().mockImplementation(async (text: string) => {
                // Vector size 384
                const vector = new Float32Array(384).fill(0);
                if (text.includes('cart')) {
                    vector[0] = 0.9;
                } else if (text.includes('checkout')) {
                    vector[0] = 0.8;
                } else {
                    vector[0] = 0.1;
                }
                return vector;
            });
        }
    };
});

// Import after mock
import { EmbeddingService } from '../embedding-service.js';

describe('Semantic Search (QueryOrchestrator)', () => {
    let db: UiDatabase;
    let embeddingService: EmbeddingService;
    let orchestrator: QueryOrchestrator;

    const sampleRecords: NodeRecord[] = [
        {
            id: 1,
            frameId: 0,
            role: ElementRole.Button,
            name: 'View Cart',
            stateBits: 0,
            attrs: {},
            context: [],
            rect: { x: 0, y: 0, width: 0, height: 0 },
            fingerprint: 'btn-cart',
            tagName: 'button'
        },
        {
            id: 2,
            frameId: 0,
            role: ElementRole.Button,
            name: 'Checkout',
            stateBits: 0,
            attrs: {},
            context: [],
            rect: { x: 0, y: 0, width: 0, height: 0 },
            fingerprint: 'btn-checkout',
            tagName: 'button'
        },
        {
            id: 3,
            frameId: 0,
            role: ElementRole.Button,
            name: 'Profile Settings',
            stateBits: 0,
            attrs: {},
            context: [],
            rect: { x: 0, y: 0, width: 0, height: 0 },
            fingerprint: 'btn-profile',
            tagName: 'button'
        }
    ];

    beforeEach(async () => {
        db = new UiDatabase();
        db.ingest(sampleRecords);

        embeddingService = new EmbeddingService();
        await embeddingService.initialize();

        orchestrator = new QueryOrchestrator(db, embeddingService);
    });

    it('should initialize correctly', () => {
        expect(orchestrator).toBeDefined();
    });

    it('should return semantic matches', async () => {
        const query: SemanticQueryAST = {
            where: [{ role: ElementRole.Button }],
            semantic: {
                enabled: true,
                query: 'shopping',
                minScore: 0.5
            }
        };

        const result = await orchestrator.query(query);

        // Should return cart related items
        expect(result.matches.length).toBeGreaterThan(0);
        // Checkout should be high
        const checkout = result.matches.find(m => m.name === 'Checkout');
        expect(checkout).toBeDefined();
    });

    it('should combine lexical and semantic search', async () => {
        const query: SemanticQueryAST = {
            where: [{ role: ElementRole.Button }],
            semantic: {
                enabled: true,
                query: 'Cart',
                minScore: 0.0
            }
        };

        const result = await orchestrator.query(query);
        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.matches[0].name).toContain('Cart');
    });

    it('should handle empty queries gracefully', async () => {
        const query: SemanticQueryAST = {
            where: [],
            semantic: { enabled: false, query: '' }
        };
        const result = await orchestrator.query(query);
        expect(result.matches.length).toBeGreaterThan(0);
    });
});
