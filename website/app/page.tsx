"use client";

import React from "react";
import { Database, Layout, ShieldCheck, Cpu } from "lucide-react";
import { TerminalHero } from "@/components/dx/TerminalHero";
import { ApiFeature } from "@/components/dx/ApiFeature";

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

                {/* API Showcase */}
                <section className="container mx-auto px-6 py-24">
                    <div className="mb-16">
                        <h2 className="text-2xl font-bold font-mono mb-4">API Capabilities</h2>
                        <p className="text-zinc-500 max-w-2xl">
                            Designed for modern TypeScript environments. Run it in Node, Deno, or directly in the browser.
                        </p>
                    </div>

                    <ApiFeature
                        method="db.query(vector)"
                        description="Perform semantic searches against the DOM. The engine converts your query into a vector embedding and finds the closest semantic match in the current accessibility tree."
                        code={`// Find a button that looks like 'Buy'
const result = await db.query({
  semantic: "Buy Now",
  role: "button",
  threshold: 0.85
});

console.log(result.handle); // Native DOM Reference`}
                    />

                    <ApiFeature
                        method="db.fuseIcons()"
                        description="Automatically detect and label SVG icons using our built-in shape matcher. No need for vision models to understand 'Settings' gear icons or 'Menu' burgers."
                        code={`// Before fusion: <button><svg>...</svg></button>
await db.fuseIcons();

// After fusion: <button aria-label="Settings">...</button>
// Now queryable:
const settings = await db.query("Settings");`}
                    />

                    <ApiFeature
                        method="collector.snapshot()"
                        description="Capture a clean, noise-free snapshot of the current page state. Removes divs, spans, and layout wrappers to leave only the interactive semantic structure."
                        code={`const snapshot = await collector.snapshot();

// Returns a clean tree
/*
{
  id: "node_1",
  role: "article",
  children: [ ... ]
}
*/`}
                    />
                </section>

                {/* Privacy Architecture */}
                <section className="bg-zinc-50 py-24 border-y border-zinc-100">
                    <div className="container mx-auto px-6 text-center">
                        <ShieldCheck className="w-12 h-12 text-zinc-900 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold font-mono mb-4">Zero-Vision Privacy</h2>
                        <p className="text-zinc-500 max-w-2xl mx-auto mb-12">
                            GDPR Compliant by default. No screenshots are ever taken. No pixels leave the device.
                            We parse the DOM locally and only expose semantic metadata.
                        </p>

                        <div className="flex justify-center gap-2">
                            <div className="px-4 py-2 bg-white border border-zinc-200 rounded text-xs font-mono text-zinc-500">
                                DOM (Local)
                            </div>
                            <div className="text-zinc-300">→</div>
                            <div className="px-4 py-2 bg-black text-white border border-zinc-900 rounded text-xs font-mono">
                                UI-Ground Engine
                            </div>
                            <div className="text-zinc-300">→</div>
                            <div className="px-4 py-2 bg-white border border-zinc-200 rounded text-xs font-mono text-zinc-500">
                                Semantic JSON
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-white py-12 border-t border-zinc-100">
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