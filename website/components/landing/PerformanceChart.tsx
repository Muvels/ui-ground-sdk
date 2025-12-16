"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function PerformanceChart() {
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaying(false);
            setTimeout(() => setPlaying(true), 100);
        }, 4000);
        setPlaying(true);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full flex flex-col justify-end p-8 gap-6">
            {/* JS Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono font-medium text-zinc-600">
                    <span>JS Engine</span>
                    <span>~500 ops/s</span>
                </div>
                <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: playing ? "15%" : "0%" }}
                        transition={{ duration: 1.5 }}
                        className="h-full bg-zinc-500 rounded-full"
                    />
                </div>
            </div>

            {/* WASM Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono font-bold text-blue-600">
                    <span>WASM Engine</span>
                    <span>12,000 ops/s</span>
                </div>
                <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden relative">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: playing ? "92%" : "0%" }}
                        transition={{ duration: 1.2 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    />
                    {/* Sparkle effect */}
                    <motion.div
                        animate={{ x: playing ? ["0%", "400%"] : "0%", opacity: [0, 1, 0] }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="absolute top-0 bottom-0 w-20 bg-white/30 blur-md -skew-x-12"
                    />
                </div>
            </div>
        </div>
    );
}
