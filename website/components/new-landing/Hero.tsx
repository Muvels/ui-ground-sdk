"use client";

import React from "react";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
    return (
        <section className="pt-32 pb-16 md:pt-48 md:pb-32 px-6">
            <div className="container mx-auto max-w-5xl text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100 mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    WASM Engine Ready
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6 font-display">
                    The Unified Interface <br className="hidden md:block" />
                    For <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">AI Agents</span>
                </h1>

                <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                    Better reliability, better speed, no screenshots. <br className="hidden md:block" />
                    Bridge the gap between raw DOM and LLM reasoning.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button className="h-12 px-8 rounded-full text-lg bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-200/50 transition-all hover:scale-105">
                        Get SDK <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="h-12 px-8 rounded-full text-lg border-zinc-200 hover:bg-zinc-50 text-zinc-700">
                        Read Docs <Terminal className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </section>
    );
}
