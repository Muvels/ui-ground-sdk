"use client";

import React from "react";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeWindow } from "./CodeWindow";
import { InstallationBar } from "./InstallationBar";

export function TerminalHero() {
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
                            Get Started
                        </Button>
                        <Button variant="outline" className="h-12 px-8 border-zinc-200 text-zinc-900 font-mono rounded-lg hover:bg-zinc-100">
                            View Sources
                        </Button>
                    </div>
                </div>

                {/* Right: Code Demo */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-violet-100 rounded-2xl blur-2xl opacity-50" />
                    <CodeWindow
                        title="agent_controller.ts"
                        className="relative transform rotate-1 hover:rotate-0 transition-transform duration-500"
                        code={`// Before: Fragile, breaks on redesign
const btn = document.querySelector(
  "#main > div:nth-child(2) > button.blue"
);

// After: UI-Ground SDK
import { db } from "ui-ground-sdk";

// 1. Find by meaning (Vector Search)
const btn = await db.query({
  semantic: "Checkout",
  role: "button"
});

// 2. Interact reliably
await btn.click();`}
                    />
                </div>

            </div>
        </section>
    );
}
