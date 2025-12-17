/**
 * Worker Client Tests
 * Unit tests for WorkerEmbeddingClient with mocked worker
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerEmbeddingClient } from '../worker/worker-client.js';

// Mock Worker and SharedWorker
class MockMessagePort {
    onmessage: ((event: MessageEvent) => void) | null = null;
    private otherPort: MockMessagePort | null = null;

    start() { }

    close() { }

    postMessage(data: unknown) {
        // Simulate async message delivery to other port
        if (this.otherPort?.onmessage) {
            setTimeout(() => {
                this.otherPort!.onmessage!(new MessageEvent('message', { data }));
            }, 0);
        }
    }

    static createPair(): [MockMessagePort, MockMessagePort] {
        const port1 = new MockMessagePort();
        const port2 = new MockMessagePort();
        port1.otherPort = port2;
        port2.otherPort = port1;
        return [port1, port2];
    }
}

// Mock SharedWorker
class MockSharedWorker {
    port: MockMessagePort;

    constructor(_url: string, _options?: unknown) {
        this.port = new MockMessagePort();
    }
}

// Mock dedicated Worker (for when SharedWorker unavailable)
class MockWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(_url: string, _options?: unknown) { }

    postMessage(data: unknown) {
        // Simulate worker processing
        setTimeout(() => {
            if (this.onmessage) {
                // Auto-respond to messages for testing
                const request = data as { type: string; requestId: string };
                if (request.type === 'init') {
                    this.onmessage(new MessageEvent('message', {
                        data: {
                            type: 'init_response',
                            requestId: request.requestId,
                            success: true,
                        }
                    }));
                } else if (request.type === 'embed') {
                    this.onmessage(new MessageEvent('message', {
                        data: {
                            type: 'embed_response',
                            requestId: request.requestId,
                            embeddings: [new Float32Array([0.1, 0.2, 0.3])],
                        }
                    }));
                } else if (request.type === 'status') {
                    this.onmessage(new MessageEvent('message', {
                        data: {
                            type: 'status_response',
                            requestId: request.requestId,
                            ready: true,
                            loading: false,
                            progress: 100,
                            connectedClients: 1,
                        }
                    }));
                }
            }
        }, 10);
    }

    terminate() { }
}

describe('WorkerEmbeddingClient', () => {
    let originalSharedWorker: typeof SharedWorker | undefined;
    let originalWorker: typeof Worker;

    beforeEach(() => {
        // Store originals
        originalSharedWorker = (globalThis as unknown as { SharedWorker?: typeof SharedWorker }).SharedWorker;
        originalWorker = globalThis.Worker;
    });

    afterEach(() => {
        // Restore originals
        if (originalSharedWorker) {
            (globalThis as unknown as { SharedWorker: typeof SharedWorker }).SharedWorker = originalSharedWorker;
        } else {
            delete (globalThis as unknown as { SharedWorker?: typeof SharedWorker }).SharedWorker;
        }
        globalThis.Worker = originalWorker;
    });

    describe('constructor', () => {
        it('should create client with default options', () => {
            const client = new WorkerEmbeddingClient();
            expect(client.isReady()).toBe(false);
            expect(client.isLoading()).toBe(false);
        });

        it('should accept custom options', () => {
            const onProgress = vi.fn();
            const client = new WorkerEmbeddingClient({
                modelName: 'custom-model',
                onProgress,
                forceDedicated: true,
            });
            expect(client).toBeDefined();
        });
    });

    describe('initialize with dedicated worker (fallback)', () => {
        beforeEach(() => {
            // Remove SharedWorker to trigger fallback
            delete (globalThis as unknown as { SharedWorker?: typeof SharedWorker }).SharedWorker;
            // Mock Worker
            globalThis.Worker = MockWorker as unknown as typeof Worker;
        });

        it('should initialize with dedicated worker when SharedWorker unavailable', async () => {
            const client = new WorkerEmbeddingClient();
            await client.initialize();

            expect(client.isReady()).toBe(true);
            expect(client.isSharedWorker()).toBe(false);
        });

        it('should embed text after initialization', async () => {
            const client = new WorkerEmbeddingClient();
            await client.initialize();

            const embeddings = await client.embed(['test text']);
            expect(embeddings).toHaveLength(1);
            expect(embeddings[0]).toBeInstanceOf(Float32Array);
        });

        it('should get status from worker', async () => {
            const client = new WorkerEmbeddingClient();
            await client.initialize();

            const status = await client.getStatus();
            expect(status.ready).toBe(true);
            expect(status.connectedClients).toBe(1);
        });

        it('should throw error when embedding before initialization', async () => {
            const client = new WorkerEmbeddingClient();

            await expect(client.embed(['test'])).rejects.toThrow('not initialized');
        });
    });

    describe('forceDedicated option', () => {
        beforeEach(() => {
            // Add SharedWorker mock
            (globalThis as unknown as { SharedWorker: typeof SharedWorker }).SharedWorker = MockSharedWorker as unknown as typeof SharedWorker;
            globalThis.Worker = MockWorker as unknown as typeof Worker;
        });

        it('should use dedicated worker when forceDedicated is true', async () => {
            const client = new WorkerEmbeddingClient({ forceDedicated: true });
            await client.initialize();

            expect(client.isSharedWorker()).toBe(false);
        });
    });

    describe('getEmbeddingDim', () => {
        it('should return 384 (e5-small dimension)', () => {
            const client = new WorkerEmbeddingClient();
            expect(client.getEmbeddingDim()).toBe(384);
        });
    });

    describe('embedSingle', () => {
        beforeEach(() => {
            delete (globalThis as unknown as { SharedWorker?: typeof SharedWorker }).SharedWorker;
            globalThis.Worker = MockWorker as unknown as typeof Worker;
        });

        it('should embed a single text', async () => {
            const client = new WorkerEmbeddingClient();
            await client.initialize();

            const embedding = await client.embedSingle('test text');
            expect(embedding).toBeInstanceOf(Float32Array);
        });
    });

    describe('disconnect', () => {
        beforeEach(() => {
            delete (globalThis as unknown as { SharedWorker?: typeof SharedWorker }).SharedWorker;
            globalThis.Worker = MockWorker as unknown as typeof Worker;
        });

        it('should disconnect and mark as not ready', async () => {
            const client = new WorkerEmbeddingClient();
            await client.initialize();
            expect(client.isReady()).toBe(true);

            client.disconnect();
            expect(client.isReady()).toBe(false);
        });
    });
});
