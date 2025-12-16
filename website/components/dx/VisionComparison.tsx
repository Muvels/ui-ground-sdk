"use client";

import React from "react";
import { Check, X, EyeOff, Zap, Hand, Variable, Lock } from "lucide-react";

export function VisionComparison() {
    return (
        <section className="py-24 bg-zinc-50 border-y border-zinc-100">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold font-mono mb-6">
                        Why not just <span className="line-through decoration-red-500 decoration-4 text-zinc-400">screenshot it?</span>
                    </h2>
                    <p className="tex-lg text-zinc-500 max-w-2xl mx-auto">
                        Vision Models (VLMs) are powerful but slow, expensive, and fragile for automation.
                        UI-Ground brings the reliability of code to the messiness of the web.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Left: The Vision Model Way */}
                    <div className="p-8 rounded-2xl border border-dashed border-red-200 bg-red-50/30">
                        <div className="flex items-center gap-3 mb-6 text-red-900/50">
                            <EyeOff size={24} />
                            <h3 className="font-mono font-bold text-xl">Vision Models</h3>
                        </div>

                        <ul className="space-y-4">
                            <ComparisonPoint
                                icon={<X size={18} />}
                                text="High Latency (2s - 10s)"
                                subtext="Waiting for cloud inference kills interactivity."
                                tone="negative"
                            />
                            <ComparisonPoint
                                icon={<X size={18} />}
                                text="Privacy Nightmare"
                                subtext="Sending screenshots of user data to 3rd parties."
                                tone="negative"
                            />
                            <ComparisonPoint
                                icon={<X size={18} />}
                                text="Hallucinated Coordinates"
                                subtext="VLMs guess x,y positions. Often misses by pixels."
                                tone="negative"
                            />
                            <ComparisonPoint
                                icon={<X size={18} />}
                                text="Passive Observer"
                                subtext="Agent can only look at pixels. No direct access to the application state."
                                tone="negative"
                            />
                        </ul>
                    </div>

                    {/* Right: The UI-Ground Way */}
                    <div className="p-8 rounded-2xl border border-zinc-200 bg-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 bg-gradient-to-bl from-green-50 to-transparent rounded-bl-full opacity-50" />

                        <div className="flex items-center gap-3 mb-6 text-zinc-900 relative z-10">
                            <Zap size={24} className="text-green-500 fill-green-500" />
                            <h3 className="font-mono font-bold text-xl">UI-Ground SDK</h3>
                        </div>

                        <ul className="space-y-4 relative z-10">
                            <ComparisonPoint
                                icon={<Check size={18} />}
                                text="Instant (<15ms)"
                                subtext="Runs locally in WASM. Real-time reactivity."
                                tone="positive"
                            />
                            <ComparisonPoint
                                icon={<Lock size={18} />}
                                text="Zero-Trust Privacy"
                                subtext="No pixels leave the device. GDPR compliant."
                                tone="positive"
                            />
                            <ComparisonPoint
                                icon={<Hand size={18} />}
                                text="Exact DOM Handles"
                                subtext="Returns real Element references, not guesses."
                                tone="positive"
                            />
                            <ComparisonPoint
                                icon={<Variable size={18} />}
                                text="Native Query Tool"
                                subtext="Give your agent direct access to query the UI like a database."
                                tone="positive"
                            />
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ComparisonPoint({ icon, text, subtext, tone }: { icon: React.ReactNode, text: string, subtext: string, tone: "positive" | "negative" }) {
    const colors = tone === "positive"
        ? "text-zinc-900 bg-green-100 icon-green"
        : "text-zinc-500 bg-red-100/50 icon-red"; // Muted for negative

    const iconColor = tone === "positive" ? "text-green-600" : "text-red-400";

    return (
        <li className="flex gap-4 items-start">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${iconColor} bg-opacity-20`}>
                {icon}
            </div>
            <div>
                <div className={`font-bold font-mono text-sm ${tone === "positive" ? "text-zinc-900" : "text-zinc-500"}`}>
                    {text}
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                    {subtext}
                </div>
            </div>
        </li>
    );
}
