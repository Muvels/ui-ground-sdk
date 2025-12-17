"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Loader2, Play, Terminal } from "lucide-react";
import { useUiGround } from "@/hooks/useUiGround";
import {
    EmbeddingService,
    QueryOrchestrator,
    type SemanticQueryAST,
    type IEmbeddingService,
} from "ui-ground-sdk";

interface FloatingQueryBarProps {
    onClose: () => void;
}

interface QueryResultItem {
    id: number;
    name: string;
    score: number;
    role: string;
}

export function FloatingQueryBar({ onClose }: FloatingQueryBarProps) {
    const { sdk, isReady } = useUiGround();
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [results, setResults] = useState<QueryResultItem[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const orchestratorRef = useRef<QueryOrchestrator | null>(null);
    const embeddingClientRef = useRef<IEmbeddingService | null>(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Cleanup highlight on unmount
    useEffect(() => {
        return () => {
            if (highlightedElement) {
                resetHighlight(highlightedElement);
            }
        };
    }, [highlightedElement]);

    const resetHighlight = (element: HTMLElement) => {
        element.style.outline = "";
        element.style.outlineOffset = "";
        element.style.transform = "";
        element.style.zIndex = "";
        element.style.position = "";
        element.style.transition = "";
    };

    const highlightElement = (element: HTMLElement) => {
        if (highlightedElement) {
            resetHighlight(highlightedElement);
        }

        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.style.transition = "all 0.3s ease";
        element.style.outline = "3px solid #4ade80";
        element.style.outlineOffset = "3px";
        element.style.transform = "scale(1.02)";
        element.style.zIndex = "100";
        element.style.position = "relative";

        setHighlightedElement(element);
    };

    const handleSearch = async () => {
        if (!sdk || !query.trim()) return;

        setIsLoading(true);
        setResults([]);
        setHasSearched(true);

        try {
            if (highlightedElement) {
                resetHighlight(highlightedElement);
                setHighlightedElement(null);
            }

            setLoadingMessage("Scanning DOM...");
            await new Promise((r) => setTimeout(r, 50));
            sdk.snapshot();

            if (!embeddingClientRef.current) {
                setLoadingMessage("Loading embeddings...");
                const embeddingService = new EmbeddingService();
                await embeddingService.initialize((pct: number) =>
                    setLoadingMessage(`Loading model: ${pct.toFixed(0)}%`)
                );
                embeddingClientRef.current = embeddingService;
            }

            if (!orchestratorRef.current) {
                orchestratorRef.current = new QueryOrchestrator(
                    sdk["db"],
                    embeddingClientRef.current
                );
                const wasmDb = sdk.getWasmDb();
                if (wasmDb) {
                    orchestratorRef.current.setWasmDb(wasmDb);
                }
            }

            setLoadingMessage("Querying...");
            const ast: SemanticQueryAST = {
                semantic: {
                    enabled: true,
                    text: query.trim(),
                    threshold: 0.2,
                    topK: 10,
                },
                where: [],
                limit: 10,
            };

            const result = await orchestratorRef.current.query(ast);

            const formattedResults: QueryResultItem[] = result.matches.map((match) => ({
                id: match.id,
                name: match.name || `Element #${match.id}`,
                score: match.score,
                role: match.role || "unknown",
            }));

            setResults(formattedResults);

            if (formattedResults.length > 0) {
                const topElement = sdk.resolveHandle(formattedResults[0].id);
                if (topElement && topElement instanceof HTMLElement) {
                    highlightElement(topElement);
                }
            }
        } catch (err) {
            console.error("[FloatingQueryBar] Search error:", err);
            setResults([]);
        } finally {
            setIsLoading(false);
            setLoadingMessage("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isLoading) {
            handleSearch();
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    const handleResultClick = (item: QueryResultItem) => {
        if (!sdk) return;
        const element = sdk.resolveHandle(item.id);
        if (element && element instanceof HTMLElement) {
            highlightElement(element);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
            />

            {/* Floating Terminal Window */}
            <div className="relative w-full max-w-lg mx-4 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-800 shadow-2xl font-mono text-sm">
                    {/* Window Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-medium tracking-wide uppercase">
                            <Terminal size={10} />
                            ui-ground query
                        </div>
                        <button
                            onClick={onClose}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <span className="text-green-400 select-none">❯</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="find element by intent..."
                                className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 outline-none font-mono"
                                disabled={isLoading || !isReady}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isLoading || !query.trim() || !isReady}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                                    ${isLoading
                                        ? "bg-zinc-700 text-zinc-400 cursor-wait"
                                        : "bg-green-600 text-white hover:bg-green-500 active:scale-95"
                                    }`}
                            >
                                {isLoading ? (
                                    <Loader2 size={10} className="animate-spin" />
                                ) : (
                                    <Play size={10} className="fill-current" />
                                )}
                                {isLoading ? "..." : "Run"}
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading && loadingMessage && (
                        <div className="px-4 py-3 border-b border-zinc-800">
                            <div className="text-zinc-500 text-xs flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin text-green-400" />
                                {loadingMessage}
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {hasSearched && !isLoading && (
                        <div className="max-h-72 overflow-y-auto">
                            {results.length > 0 ? (
                                <ul>
                                    {results.map((item, index) => (
                                        <li
                                            key={item.id}
                                            onClick={() => handleResultClick(item)}
                                            className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-zinc-800/50 last:border-0
                                                ${index === 0
                                                    ? "bg-green-900/20 hover:bg-green-900/30"
                                                    : "hover:bg-zinc-800/50"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {index === 0 && (
                                                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-600 text-white">
                                                            match
                                                        </span>
                                                    )}
                                                    <span className="text-zinc-300 truncate">
                                                        {item.name}
                                                    </span>
                                                    <span className="shrink-0 text-[10px] text-zinc-600 uppercase">
                                                        [{item.role}]
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="w-12 h-1 rounded-full bg-zinc-700 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${index === 0 ? "bg-green-500" : "bg-zinc-500"
                                                                }`}
                                                            style={{ width: `${Math.round(item.score * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-mono ${index === 0 ? "text-green-400" : "text-zinc-500"
                                                        }`}>
                                                        {Math.round(item.score * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="px-4 py-6 text-center text-zinc-600 text-xs">
                                    No matches for "{query}"
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Hint */}
                    {!hasSearched && (
                        <div className="px-4 py-3 text-[10px] text-zinc-600 flex items-center justify-center gap-4">
                            <span>
                                <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700">↵</kbd> run
                            </span>
                            <span>
                                <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700">esc</kbd> close
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
