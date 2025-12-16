import React from "react";
import { CodeWindow } from "./CodeWindow";

interface ApiFeatureProps {
    method: string;
    description: string;
    code: string;
    className?: string;
}

export function ApiFeature({ method, description, code, className }: ApiFeatureProps) {
    return (
        <div className={`grid md:grid-cols-2 gap-8 items-center border-t border-zinc-100 py-16 ${className}`}>
            <div>
                <div className="font-mono text-blue-600 font-bold text-lg mb-4">
                    {method}
                </div>
                <p className="text-zinc-600 text-lg leading-relaxed mb-6 font-mono text-sm md:text-base">
                    {description}
                </p>
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded text-xs font-mono">Async</span>
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded text-xs font-mono">Typed</span>
                </div>
            </div>
            <div>
                <CodeWindow code={code} title="example.ts" withLineNumbers={false} />
            </div>
        </div>
    );
}
