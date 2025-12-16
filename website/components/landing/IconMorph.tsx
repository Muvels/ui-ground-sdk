"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShoppingCart, User, Search, Settings, Menu } from "lucide-react";

const ICONS = [
    { icon: Bell, label: "Notifications" },
    { icon: ShoppingCart, label: "View Cart" },
    { icon: User, label: "My Profile" },
    { icon: Search, label: "Search" },
];

export function IconMorph() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % ICONS.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const CurrentIcon = ICONS[index].icon;
    const currentLabel = ICONS[index].label;

    return (
        <div className="h-[300px] w-full bg-white border border-zinc-100/50 rounded-xl flex flex-col items-center justify-center p-8 relative overflow-hidden group shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="flex items-center gap-12">
                {/* Raw Icon State */}
                <div className="flex flex-col items-center gap-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">Raw Input</div>
                    <div className="h-24 w-24 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={index}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <CurrentIcon size={40} className="text-white" />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Processing Arrow */}
                <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    <ArrowIcon className="text-purple-500 h-8 w-8" />
                </motion.div>

                {/* Semantic Output */}
                <div className="flex flex-col items-center gap-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">Agent Sees</div>
                    <div className="h-24 min-w-[140px] px-6 bg-purple-500/10 rounded-2xl border border-purple-500/30 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={index}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -10, opacity: 0 }}
                                className="text-lg font-bold text-purple-200 whitespace-nowrap"
                            >
                                "{currentLabel}"
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ArrowIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
    );
}
