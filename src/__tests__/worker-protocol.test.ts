/**
 * Worker Protocol Tests
 * Unit tests for message types and request ID generation
 */
import { describe, it, expect } from 'vitest';
import {
    generateRequestId,
    type InitRequest,
    type EmbedRequest,
    type StatusRequest,
    type DisconnectRequest,
    type InitResponse,
    type EmbedResponse,
    type ProgressBroadcast,
    type ReadyBroadcast,
} from '../worker/worker-protocol.js';

describe('Worker Protocol', () => {
    describe('generateRequestId', () => {
        it('should generate unique request IDs', () => {
            const id1 = generateRequestId();
            const id2 = generateRequestId();
            const id3 = generateRequestId();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('should generate string IDs', () => {
            const id = generateRequestId();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        it('should include timestamp component', () => {
            const before = Date.now();
            const id = generateRequestId();
            const after = Date.now();

            // ID format is "timestamp-randomstring"
            const timestampPart = parseInt(id.split('-')[0], 10);
            expect(timestampPart).toBeGreaterThanOrEqual(before);
            expect(timestampPart).toBeLessThanOrEqual(after);
        });
    });

    describe('Message Types', () => {
        it('should create valid InitRequest', () => {
            const request: InitRequest = {
                type: 'init',
                requestId: generateRequestId(),
                modelName: 'test-model',
            };

            expect(request.type).toBe('init');
            expect(request.requestId).toBeDefined();
            expect(request.modelName).toBe('test-model');
        });

        it('should create valid EmbedRequest', () => {
            const request: EmbedRequest = {
                type: 'embed',
                requestId: generateRequestId(),
                texts: ['hello', 'world'],
            };

            expect(request.type).toBe('embed');
            expect(request.texts).toHaveLength(2);
        });

        it('should create valid StatusRequest', () => {
            const request: StatusRequest = {
                type: 'status',
                requestId: generateRequestId(),
            };

            expect(request.type).toBe('status');
        });

        it('should create valid DisconnectRequest', () => {
            const request: DisconnectRequest = {
                type: 'disconnect',
                requestId: generateRequestId(),
            };

            expect(request.type).toBe('disconnect');
        });
    });

    describe('Response Types', () => {
        it('should create valid InitResponse (success)', () => {
            const response: InitResponse = {
                type: 'init_response',
                requestId: 'test-123',
                success: true,
            };

            expect(response.type).toBe('init_response');
            expect(response.success).toBe(true);
            expect(response.error).toBeUndefined();
        });

        it('should create valid InitResponse (failure)', () => {
            const response: InitResponse = {
                type: 'init_response',
                requestId: 'test-123',
                success: false,
                error: 'Model failed to load',
            };

            expect(response.success).toBe(false);
            expect(response.error).toBe('Model failed to load');
        });

        it('should create valid EmbedResponse', () => {
            const response: EmbedResponse = {
                type: 'embed_response',
                requestId: 'test-123',
                embeddings: [new Float32Array([0.1, 0.2, 0.3])],
            };

            expect(response.type).toBe('embed_response');
            expect(response.embeddings).toHaveLength(1);
            expect(response.embeddings![0]).toBeInstanceOf(Float32Array);
        });
    });

    describe('Broadcast Types', () => {
        it('should create valid ProgressBroadcast', () => {
            const broadcast: ProgressBroadcast = {
                type: 'progress',
                progress: 50,
            };

            expect(broadcast.type).toBe('progress');
            expect(broadcast.progress).toBe(50);
        });

        it('should create valid ReadyBroadcast', () => {
            const broadcast: ReadyBroadcast = {
                type: 'ready',
            };

            expect(broadcast.type).toBe('ready');
        });
    });
});
