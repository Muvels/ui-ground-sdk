"use client";

import React from "react";
import { Copy } from "lucide-react";

interface CodeWindowProps {
    title?: string;
    code: string;
    language?: string;
    className?: string;
    withLineNumbers?: boolean;
}

export function CodeWindow({ title = "terminal", code, className, withLineNumbers = true }: CodeWindowProps) {
    const lines = code.trim().split("\n");

    return (
        <div className={`rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-800 shadow-2xl font-mono text-xs md:text-sm ${className}`}>
            {/* Window Controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                </div>
                <div className="text-zinc-500 text-[10px] font-medium tracking-wide uppercase">
                    {title}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy size={12} className="text-zinc-500" />
                </div>
            </div>

            {/* Code Area */}
            <div className="p-4 overflow-x-auto">
                <pre className="font-mono leading-relaxed text-[#d4d4d4]">
                    {lines.map((line, i) => (
                        <div key={i} className="flex">
                            {withLineNumbers && (
                                <span className="select-none text-zinc-600 w-8 flex-shrink-0 text-right mr-4">
                                    {i + 1}
                                </span>
                            )}
                            <span
                                className="whitespace-pre"
                                dangerouslySetInnerHTML={{ __html: highlightSyntax(line) }}
                            />
                        </div>
                    ))}
                </pre>
            </div>
        </div>
    );
}

// Simple pseudo-highlighter for the effect (in production used Prism or Shiki)
function highlightSyntax(code: string): string {
    return code
        .replace(/(import|export|from|const|await|async|function|return|if|else)/g, '<span class="text-[#569cd6]">$1</span>')
        .replace(/('.*?')/g, '<span class="text-[#ce9178]">$1</span>')
        .replace(/(".*?")/g, '<span class="text-[#ce9178]">$1</span>')
        .replace(/(\/\/.*)/g, '<span class="text-[#6a9955]">$1</span>')
        .replace(/([0-9]+)/g, '<span class="text-[#b5cea8]">$1</span>')
        .replace(/(console|log|db|query|find|click|type)/g, '<span class="text-[#dcdcaa]">$1</span>');
}
