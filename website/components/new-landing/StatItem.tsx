import React from "react";

interface StatItemProps {
    value: string;
    label: string;
    sublabel?: string;
    color?: string; // Optional text color class for the value
}

export function StatItem({ value, label, sublabel, color = "text-zinc-900" }: StatItemProps) {
    return (
        <div className="flex flex-col items-center text-center p-4">
            <div className={`text-4xl md:text-5xl font-bold tracking-tight mb-2 ${color}`}>
                {value}
            </div>
            <div className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">
                {label}
            </div>
            {sublabel && (
                <div className="text-xs text-zinc-500 font-medium">
                    {sublabel}
                </div>
            )}
        </div>
    );
}
