"use client";

import { useState, useEffect, useCallback } from "react";
import { UiGround, type UiDbConfig, type SemanticQueryAST } from "ui-ground-sdk";
// @ts-ignore
import initWasm, { WasmUiDb } from "@/lib/wasm-pkg/ui_ground_wasm.js";
import * as LucideIcons from "lucide-react"

export function useUiGround() {
    const [sdk, setSdk] = useState<UiGround | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // Initialize WASM
                // We pass the path to the .wasm file in public folder
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

    return { sdk, isReady, error };
}
