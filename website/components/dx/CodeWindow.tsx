"use client";

import React from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Terminal } from "lucide-react";

interface CodeWindowProps {
    title?: string;
    code: string;
    language?: string;
    className?: string;
    withLineNumbers?: boolean;
}

export function CodeWindow({ title = "terminal", code, language = "typescript", className, withLineNumbers = true }: CodeWindowProps) {
    return (
        <div className={`rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-800 shadow-2xl font-mono text-xs md:text-sm ${className}`}>
            {/* Window Controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-medium tracking-wide uppercase">
                    <Terminal size={10} />
                    {title}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy size={12} className="text-zinc-500" />
                </div>
            </div>

            {/* Code Area */}
            <div className="bg-[#1e1e1e]">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        background: 'transparent',
                        fontSize: '13px',
                        lineHeight: '1.6',
                    }}
                    showLineNumbers={withLineNumbers}
                    lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
