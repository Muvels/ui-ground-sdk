"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

export function InstallationBar() {
    const [copied, setCopied] = useState(false);
    const command = "npm install ui-ground-sdk";

    const copyToClipboard = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            onClick={copyToClipboard}
            className="group relative cursor-pointer flex items-center gap-4 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg py-3 px-4 max-w-md shadow-sm transition-all"
        >
            <Terminal size={16} className="text-zinc-400" />
            <code className="font-mono text-sm text-zinc-800 flex-grow">
                {command}
            </code>
            <div className="text-zinc-400 group-hover:text-zinc-900 transition-colors">
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </div>
        </div>
    );
}
