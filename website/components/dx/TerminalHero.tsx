"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeWindow } from "./CodeWindow";
import { InstallationBar } from "./InstallationBar";
import { useUiGround } from "@/hooks/useUiGround";
import { ElementRole, EmbeddingService, QueryOrchestrator, type SemanticQueryAST } from "ui-ground-sdk";

export function TerminalHero() {
    const { sdk, isReady } = useUiGround();
    const [isRunning, setIsRunning] = useState(false);
    const [log, setLog] = useState<string | null>(null);

    const handleExecute = async () => {
        if (!sdk) return;
        setIsRunning(true);
        setLog("Initializing Semantic Engine...");

        try {
            // 1. Snapshot
            setLog("Scanning DOM...");
            await new Promise(r => setTimeout(r, 100)); // UI yield
            const records = sdk.snapshot();
            console.log("Snapshot records:", records.length);

            // 2. Load Embeddings (Real)
            const embeddingService = new EmbeddingService();
            setLog("Loading Embeddings Model (this may take a sec)...");
            await embeddingService.initialize();

            // 3. Orchestrate Query
            const orchestrator = new QueryOrchestrator(sdk["db"], embeddingService);
            setLog("Querying 'Lets Start'...");

            const ast: SemanticQueryAST = {
                semantic: {
                    enabled: true,
                    text: 'Lets try', // Intent: "Lets Start" -> matches "Get Started"
                    threshold: 0.3 // lenient
                },
                where: [{ role: ElementRole.Button }],
                limit: 1
            };

            const result = await orchestrator.query(ast);

            if (result.matches.length > 0) {
                const match = result.matches[0];
                setLog(`Found: "${match.name}" (Score: ${(match.score * 100).toFixed(0)}%)`);

                // 4. Highlight
                const element = sdk.resolveHandle(match.id);
                if (element && element instanceof HTMLElement) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });

                    // Flash effect
                    const originalTransition = element.style.transition;
                    const originalOutline = element.style.outline;
                    const originalOffset = element.style.outlineOffset;
                    const originalScale = element.style.transform;

                    element.style.transition = "all 0.3s ease";
                    element.style.outline = "4px solid #4ade80"; // green-400
                    element.style.outlineOffset = "4px";
                    element.style.transform = "scale(1.05)";
                    element.style.zIndex = "50";
                    element.style.position = "relative"; // ensure z-index works

                    setTimeout(() => {
                        element.style.outline = originalOutline;
                        element.style.outlineOffset = originalOffset;
                        element.style.transform = originalScale;
                        element.style.zIndex = "";
                        element.style.position = ""; // reset
                        setTimeout(() => {
                            element.style.transition = originalTransition;
                        }, 300);
                    }, 2000);
                }
            } else {
                setLog("No semantic match found.");
            }

        } catch (err) {
            console.error(err);
            setLog("Error: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsRunning(false);
            // Clear log after delay
            setTimeout(() => setLog(null), 3000);
        }
    };

    return (
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 border-b border-zinc-100 bg-zinc-50/30">
            <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">

                {/* Left: Value Prop */}
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-black text-white text-xs font-mono font-medium">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        v1.0.4 Latest
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 mb-6 font-mono leading-tight">
                        Query the DOM <br />
                        <span className="text-zinc-400">like a Database.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-500 mb-8 leading-relaxed font-mono max-w-xl">
                        Stop using fragile CSS selectors.
                        Give your agents a semantic query engine that finds elements by meaning, context, and visual appearance.
                    </p>

                    <div className="mb-10">
                        <InstallationBar />
                    </div>

                    <div className="flex gap-4">
                        <Button className="h-12 px-8 bg-zinc-900 hover:bg-black text-white font-mono rounded-lg">
                            Try it with our website
                        </Button>
                        <Button variant="outline" className="h-12 px-8 border-zinc-200 text-zinc-900 font-mono rounded-lg hover:bg-zinc-100">
                            See Example
                        </Button>
                    </div>
                </div>

                {/* Right: Code Demo */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-violet-100 rounded-2xl blur-2xl opacity-50" />

                    {/* Log Overlay */}
                    {log && (
                        <div className="absolute top-0 left-0 right-0 z-20 -mt-10 flex justify-center">
                            <div className="bg-black/80 backdrop-blur text-white text-xs font-mono px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                &gt; {log}
                            </div>
                        </div>
                    )}

                    <CodeWindow
                        title="agent_controller.ts"
                        className="relative transform rotate-1 hover:rotate-0 transition-transform duration-500"
                        onExecute={handleExecute}
                        isRunning={isRunning}
                        code={`// Before: Fragile, breaks on redesign
const btn = document.querySelector(
  "#main > div:nth-child(2) > button.blue"
);

// After: UI-Ground SDK
import { db } from "ui-ground-sdk";

// 1. Find by meaning (Vector Search)
const btn = await db.query({
  semantic: "Lets try", // Intent-based
  role: ElementRole.Button
});

// 2. Interact reliably
await btn.click();`}
                    />
                </div>

            </div>
        </section>
    );
}
