import React from "react";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
    title: string;
    subtitle: string;
    description: string;
    icon?: React.ReactNode;
    badge?: string;
    trend?: string; // e.g. "+15%" to match the image style if needed, or just extra info
    trendColor?: string;
    className?: string;
}

export function FeatureCard({ title, subtitle, description, icon, badge, trend, trendColor = "text-green-500", className }: FeatureCardProps) {
    return (
        <div className={`flex flex-col p-6 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-lg transition-all duration-300 ${className}`}>
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    {icon && (
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-lg text-zinc-900 leading-tight flex items-center gap-2">
                            {title}
                            {badge && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-zinc-100 text-zinc-500 font-medium border-zinc-200">{badge}</Badge>}
                        </h3>
                        <p className="text-sm text-zinc-500 font-medium">{subtitle}</p>
                    </div>
                </div>
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed mb-6 flex-grow">
                {description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-50 mt-auto">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Status</span>
                    <span className="text-sm font-bold text-zinc-900">Active</span>
                </div>
                {trend && (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Perf</span>
                        <span className={`text-sm font-bold ${trendColor}`}>{trend}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
