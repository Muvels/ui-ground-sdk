"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { TerminalHero } from "@/components/dx/TerminalHero";
import { FeatureShowcase } from "@/components/dx/FeatureShowcase";
import { VisionComparison } from "@/components/dx/VisionComparison";
import { AgentWorkflow } from "@/components/dx/AgentWorkflow";

export default function DxLandingPage() {
    return (
        <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-zinc-100">
                <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-tight">
                        <div className="w-4 h-4 bg-zinc-900" />
                        UI-Ground SDK
                    </div>
                    <div className="hidden md:flex gap-6 text-xs font-mono text-zinc-500">
                        <a href="#" className="hover:text-black">Documentation</a>
                        <a href="#" className="hover:text-black">API Reference</a>
                        <a href="#" className="hover:text-black">GitHub</a>
                    </div>
                </div>
            </nav>

            <main>
                <TerminalHero />

                {/* Tech Specs Grid */}
                <section className="border-b border-zinc-100 bg-white">
                    <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-100 border-x border-zinc-100">
                        {/* Spec 1 */}
                        <div className="p-6 text-center">
                            <div className="text-zinc-500 text-xs font-mono uppercase tracking-wider mb-2">Latency</div>
                            <div className="font-mono font-bold text-xl">{"<15ms"}</div>
                        </div>
                        {/* Spec 2 */}
                        <div className="p-6 text-center">
                            <div className="text-zinc-500 text-xs font-mono uppercase tracking-wider mb-2">Engine</div>
                            <div className="font-mono font-bold text-xl">WASM/Rust</div>
                        </div>
                        {/* Spec 3 */}
                        <div className="p-6 text-center">
                            <div className="text-zinc-500 text-xs font-mono uppercase tracking-wider mb-2">Bundle</div>
                            <div className="font-mono font-bold text-xl">{"<50kb"}</div>
                        </div>
                        {/* Spec 4 */}
                        <div className="p-6 text-center">
                            <div className="text-zinc-500 text-xs font-mono uppercase tracking-wider mb-2">Type Safety</div>
                            <div className="font-mono font-bold text-xl text-blue-600">100%</div>
                        </div>
                    </div>
                </section>

                {/* Agentic Workflow Animation */}
                <AgentWorkflow />

                {/* API Showcase (Tabbed) */}
                <FeatureShowcase />

                {/* Vision Comparison */}
                <VisionComparison />

                {/* Privacy Architecture */}
                <section className="bg-white py-24">
                    <div className="container mx-auto px-6 text-center">
                        <ShieldCheck className="w-12 h-12 text-zinc-900 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold font-mono mb-4">Zero-Vision Privacy</h2>
                        <p className="text-zinc-500 max-w-2xl mx-auto mb-12">
                            GDPR Compliant by default. No screenshots are ever taken. No pixels leave the device.
                            We parse the DOM locally and only expose semantic metadata.
                        </p>

                        <div className="flex justify-center gap-2">
                            <div className="px-4 py-2 bg-zinc-50 border border-zinc-100 rounded text-xs font-mono text-zinc-500">
                                DOM (Local)
                            </div>
                            <div className="text-zinc-300">→</div>
                            <div className="px-4 py-2 bg-black text-white border border-zinc-900 rounded text-xs font-mono">
                                UI-Ground Engine
                            </div>
                            <div className="text-zinc-300">→</div>
                            <div className="px-4 py-2 bg-zinc-50 border border-zinc-100 rounded text-xs font-mono text-zinc-500">
                                Semantic JSON
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-zinc-50 py-12 border-t border-zinc-100">
                    <div className="container mx-auto px-6 flex justify-between items-center text-xs font-mono text-zinc-400">
                        <div>
                            MIT Licensed
                        </div>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-black">NPM</a>
                            <a href="#" className="hover:text-black">GitHub</a>
                            <a href="#" className="hover:text-black">Discord</a>
                        </div>
                    </div>
                </footer>

            </main>
        </div>
    );
}