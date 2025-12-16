"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, AppWindow, Database, MousePointer2, AlertCircle, CheckCircle, Search } from "lucide-react";

export function AgentWorkflow() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % 5);
        }, 3500); // 3.5s per step
        return () => clearInterval(timer);
    }, []);

    const steps = [
        {
            title: "Task Input",
            desc: "User gives a high-level goal.",
            agent: "User: 'Buy the red shoes'",
            sdk: null,
            status: "waiting"
        },
        {
            title: "Ambiguous Query",
            desc: "Agent queries for 'shoes'.",
            agent: "db.query({ semantic: 'shoes' })",
            sdk: "Found 3 elements (Too many)",
            status: "warning"
        },
        {
            title: "Refining...",
            desc: "Agent realizes ambiguity.",
            agent: "Thinking: 'I need to be specific...'",
            sdk: null,
            status: "thinking"
        },
        {
            title: "Refined Query",
            desc: "Agent adds color context.",
            agent: "db.query({ semantic: 'red shoes' })",
            sdk: "Found 1 element (ID: 42)",
            status: "success"
        },
        {
            title: "Action",
            desc: "Agent interacts with the element.",
            agent: "element.click()",
            sdk: "Click dispatched to #42",
            status: "action"
        }
    ];

    const currentStep = steps[step];

    return (
        <section className="py-24 bg-zinc-900 text-white overflow-hidden relative">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold font-mono mb-4">The Agentic Loop</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto font-mono text-sm">
                        UI-Ground enables agents to think, query, and refine their interactions just like a database.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 items-center">

                    {/* Left: The Agent */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Bot size={32} className="text-white" />
                        </div>
                        <div className="font-mono text-sm font-bold text-blue-400">AI Agent</div>

                        {/* Agent Bubble */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl text-xs font-mono w-48 text-center min-h-[80px] flex items-center justify-center relative"
                            >
                                {/* Connector Line */}
                                <div className="absolute top-1/2 -right-12 w-12 h-0.5 bg-zinc-700 hidden md:block" />

                                {currentStep.agent}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Center: The Process / Status */}
                    <div className="flex flex-col items-center justify-center h-full pt-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep.status}
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 20 }}
                                className="w-20 h-20 rounded-full bg-zinc-800 border-4 border-zinc-900 flex items-center justify-center z-20"
                            >
                                {currentStep.status === "waiting" && <AppWindow size={32} className="text-zinc-500" />}
                                {currentStep.status === "warning" && <AlertCircle size={32} className="text-yellow-500" />}
                                {currentStep.status === "thinking" && <Search size={32} className="text-blue-400 animate-pulse" />}
                                {currentStep.status === "success" && <CheckCircle size={32} className="text-green-500" />}
                                {currentStep.status === "action" && <MousePointer2 size={32} className="text-purple-500" />}
                            </motion.div>
                        </AnimatePresence>

                        <div className="mt-8 text-center">
                            <h3 className="text-lg font-bold font-mono text-white">{currentStep.title}</h3>
                            <p className="text-xs text-zinc-500 font-mono mt-2">{currentStep.desc}</p>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex gap-2 mt-8">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-white" : "bg-zinc-800"}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: The SDK / DOM */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/20">
                            <Database size={32} className="text-white" />
                        </div>
                        <div className="font-mono text-sm font-bold text-green-400">UI-Ground SDK</div>

                        {/* SDK Bubble */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                className={`bg-zinc-800 border p-4 rounded-xl text-xs font-mono w-48 text-center min-h-[80px] flex items-center justify-center relative ${currentStep.sdk ? "border-zinc-700" : "border-zinc-800 opacity-50"
                                    }`}
                            >
                                {/* Connector Line */}
                                <div className="absolute top-1/2 -left-12 w-12 h-0.5 bg-zinc-700 hidden md:block" />

                                {currentStep.sdk || <span className="text-zinc-600 italic">Idle</span>}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </section>
    );
}
