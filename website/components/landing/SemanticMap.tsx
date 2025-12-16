"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

const WORDS = [
    { text: "Checkout", x: 20, y: 30, meaningful: true },
    { text: "Buy Now", x: 35, y: 45, meaningful: true },
    { text: "Purchase", x: 25, y: 60, meaningful: true },
    { text: "Cancel", x: 80, y: 20, meaningful: false },
    { text: "Login", x: 75, y: 70, meaningful: false },
    { text: "Menu", x: 50, y: 15, meaningful: false },
    { text: "Home", x: 10, y: 80, meaningful: false },
];

export function SemanticMap() {
    const [active, setActive] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setActive((prev) => !prev);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-[400px] bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center font-mono shadow-sm">
            <div className="absolute inset-0 bg-grid-black/[0.04] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />

            {/* Central Query Node */}
            <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                className="z-20 flex flex-col items-center"
            >
                <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center border border-primary text-primary font-bold shadow-[0_0_30px_rgba(168,85,247,0.4)] relative">
                    <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-20" />
                    Query
                </div>
                <div className="mt-2 text-sm text-primary font-mono bg-black/50 px-2 py-1 rounded">"Buy"</div>
            </motion.div>

            {/* Floating Nodes */}
            {WORDS.map((word, i) => (
                <WordNode
                    key={i}
                    data={word}
                    active={active}
                />
            ))}

            <div className="absolute bottom-4 left-4 text-xs text-muted-foreground font-mono">
                Vector Space Visualization
            </div>
        </div>
    );
}

function WordNode({ data, active }: { data: typeof WORDS[0], active: boolean }) {
    // Coordinates are roughly percentage based 0-100
    // Central node is approx 50, 50

    const isMatch = data.meaningful;
    const distance = Math.sqrt(Math.pow(data.x - 50, 2) + Math.pow(data.y - 50, 2));

    return (
        <motion.div
            className="absolute"
            initial={{ x: `${data.x}%`, y: `${data.y}%`, opacity: 0.5 }}
            animate={{
                opacity: active ? (isMatch ? 1 : 0.2) : 0.5,
                scale: active && isMatch ? 1.1 : 1,
                x: active && isMatch ? `${(data.x + 50) / 2}%` : `${data.x}%`, // Move closer if match
                y: active && isMatch ? `${(data.y + 50) / 2}%` : `${data.y}%`,
            }}
            transition={{ duration: 1.5 }}
            style={{ left: 0, top: 0 }} // Positioning base
        >
            <div className="relative flex flex-col items-center">
                {/* Connection Line (Pseudo) */}
                {active && isMatch && (
                    <svg className="absolute w-[200px] h-[200px] pointer-events-none -z-10 overflow-visible"
                        style={{
                            // Complex calc to line up svg center with node center? 
                            // Simplified: just a visual cue
                            opacity: 0.5
                        }}>
                        {/* Line drawing would be complex here without fixed coords, skipping for motion drift */}
                    </svg>
                )}

                <div className={cn(
                    "h-3 w-3 rounded-full mb-2 transition-colors duration-500",
                    active && isMatch ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/20"
                )} />
                <span className={cn(
                    "text-xs font-mono transition-colors duration-500",
                    active && isMatch ? "text-green-400" : "text-muted-foreground"
                )}>
                    {data.text}
                </span>
                {active && isMatch && (
                    <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-green-500/80 absolute -bottom-4"
                    >
                        {(0.9 - (distance / 200)).toFixed(2)}
                    </motion.span>
                )}
            </div>
        </motion.div>
    );
}
