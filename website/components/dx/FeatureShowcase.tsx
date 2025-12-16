"use client";

import React, { useState } from "react";
import { CodeWindow } from "./CodeWindow";
import { Cpu, Search, Layers, Zap, Globe } from "lucide-react";

const FEATURES = [
    {
        id: "semantic-query",
        label: "Semantic Query",
        icon: <Search size={16} />,
        title: "Find by Meaning, Not Selector",
        description: "Stop relying on brittle CSS classes. Queries are embedded into a vector space, allowing you to find elements that 'mean' the same thing, even if the text changes slightly.",
        code: `import { db } from "ui-ground-sdk";

// Find a "Submit" button, even if it says "Send" or "Confirm"
const result = await db.query({
    semantic: {
        query: "Submit Form",
        minScore: 0.85,  // customizable threshold
        enabled: true
    },
    where: [
        { role: "button" },
        { state: { enabled: true, visible: true } }
    ]
});

console.log(\`Found \${result.matches.length} candidates.\`);`
    },
    {
        id: "multilingual",
        label: "Multilingual",
        icon: <Globe size={16} />,
        title: "Cross-Language Matching",
        description: "Your agents can think in English but interact with German, Spanish, or Japanese UIs. Our semantic vectors align concepts across languages automatically.",
        code: `// The UI button says: "In den Warenkorb" (German)
// But your agent queries in English:
const btn = await db.query({
    semantic: "Add to Cart",
    where: [{ role: "button" }]
});

// It matches! The semantic distance is small.
await btn.click();
console.log("Clicked German 'Add to Cart' button");`
    },
    {
        id: "complex-filter",
        label: "Complex Filtering",
        icon: <Layers size={16} />,
        title: "Precision Filtering Logic",
        description: "Combine semantic search with strict attribute, role, and state filtering. Ensure you only interact with elements that are actually visible and enabled.",
        code: `// Find an input near the "Email" label
const emailInput = await db.query({
    where: [
        { role: "textbox" },
        { 
            near: { 
                text: "Email Address", 
                radius: 50 // pixels
            } 
        }
    ],
    limit: 1
});

if (emailInput.matches[0]) {
    await emailInput.matches[0].type("user@example.com");
}`
    },
    {
        id: "icon-fusion",
        label: "Icon Fusion",
        icon: <Zap size={16} />,
        title: "Visionless Icon Understanding",
        description: "The SDK automatically fingerprints SVG paths and matches them against known icon libraries. A plain svg becomes a semantic button 'text'.",
        code: `import { init, fusedIcons } from "ui-ground-sdk";
import * as LucideIcons from "lucide-react";

// Initialize with a known icon set
init({
    iconLibrary: LucideIcons,
    synonymProfile: "app-specific"
});

// Now you can query icons by their semantic name
const settingsBtn = await db.query({
    where: [{ name: { match: "exact", value: "Settings" } }]
});`
    },
    {
        id: "wasm-engine",
        label: "WASM Engine",
        icon: <Cpu size={16} />,
        title: "High-Performance WASM Backend",
        description: "For heavy DOMs (10k+ nodes), switch to the Rust/WASM engine. It runs in the same thread but delivers order-of-magnitude faster querying.",
        code: `import initWasm, { WasmUiDb } from "./pkg/ui_ground_wasm.js";
import { init } from "ui-ground-sdk";

// Initialize WASM module
await initWasm();

// Configure SDK to use WASM engine
init({
    engine: "wasm",
    wasmModule: WasmUiDb
});

// Queries now run in Rust!
const start = performance.now();
await db.query({ role: "gridcell" }); 
console.log(\`Query took \${performance.now() - start}ms\`);`
    }
];

export function FeatureShowcase() {
    const [activeFeature, setActiveFeature] = useState(FEATURES[0]);

    return (
        <section className="container mx-auto px-6 py-24 border-b border-zinc-100">
            <div className="mb-12 text-center md:text-left">
                <h2 className="text-3xl font-bold font-mono bg-zinc-900 text-white inline-block px-4 py-1 mb-4 transform -rotate-1">
                    API Capabilities
                </h2>
                <p className="text-zinc-500 max-w-2xl text-lg">
                    A type-safe, semantic query engine for the modern web.
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-3 flex flex-col gap-2">
                    {FEATURES.map((feature) => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveFeature(feature)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-mono transition-all text-left ${activeFeature.id === feature.id
                                ? "bg-zinc-900 text-white shadow-lg"
                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                                }`}
                        >
                            {feature.icon}
                            {feature.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 grid md:grid-cols-2 gap-8 items-start">
                    <div className="pt-4">
                        <h3 className="text-2xl font-bold text-zinc-900 mb-4 font-mono">
                            {activeFeature.title}
                        </h3>
                        <p className="text-zinc-600 leading-relaxed mb-6">
                            {activeFeature.description}
                        </p>
                        <div className="flex gap-2 mb-8">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 font-mono">
                                Type-Safe
                            </span>
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 font-mono">
                                Zero-Runtime
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-xl blur opacity-50" />
                        <CodeWindow
                            code={activeFeature.code}
                            title={`${activeFeature.id}.ts`}
                            className="relative"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
