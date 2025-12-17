"use client";

import { useState, useEffect, useCallback } from "react";
import {
    UiGround,
    createWorkerEmbedding,
    QueryOrchestrator,
    type IEmbeddingService,
} from "ui-ground-sdk";
// @ts-ignore
import initWasm, { WasmUiDb } from "@/lib/wasm-pkg/ui_ground_wasm.js";
import * as LucideIcons from "lucide-react"

export function useUiGround() {
    const [sdk, setSdk] = useState<UiGround | null>(null);
    const [embeddingService, setEmbeddingService] = useState<IEmbeddingService | null>(null);
    const [orchestrator, setOrchestrator] = useState<QueryOrchestrator | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isEmbeddingReady, setIsEmbeddingReady] = useState(false);
    const [embeddingProgress, setEmbeddingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Initialize WASM and SDK
    useEffect(() => {
        const init = async () => {
            try {
                // Initialize WASM
                await initWasm("/ui_ground_wasm_bg.wasm");

                // Initialize SDK
                const instance = new UiGround({
                    engine: "wasm",
                    wasmModule: WasmUiDb,
                    iconLibrary: LucideIcons,
                });

                setSdk(instance);
                setIsReady(true);
                console.log("[UiGround] Initialized with WASM engine");
            } catch (err) {
                console.error("[UiGround] Failed to initialize:", err);
                setError(err instanceof Error ? err.message : String(err));
            }
        };

        if (!sdk) {
            init();
        }
    }, [sdk]);

    // Initialize embedding service via SharedWorker (lazy, once SDK is ready)
    const initEmbedding = useCallback(async () => {
        if (embeddingService || !sdk) return embeddingService;

        try {
            console.log("[UiGround] Initializing embedding service (shared worker)...");
            const service = await createWorkerEmbedding({
                workerUrl: '/workers/shared-worker.js',
                onProgress: (pct: number) => setEmbeddingProgress(pct),
            });

            setEmbeddingService(service);
            setIsEmbeddingReady(true);

            // Create orchestrator
            const orch = new QueryOrchestrator(sdk["db"], service);
            const wasmDb = sdk.getWasmDb();
            if (wasmDb) {
                orch.setWasmDb(wasmDb);
            }
            setOrchestrator(orch);

            console.log("[UiGround] Embedding service ready (shared worker)");
            return service;
        } catch (err) {
            console.error("[UiGround] Failed to initialize embedding:", err);
            setError(err instanceof Error ? err.message : String(err));
            return null;
        }
    }, [sdk, embeddingService]);

    return {
        sdk,
        embeddingService,
        orchestrator,
        isReady,
        isEmbeddingReady,
        embeddingProgress,
        initEmbedding,
        error
    };
}
