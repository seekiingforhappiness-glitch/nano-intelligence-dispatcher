'use client';

import { Activity, ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    subValue?: string; // e.g., "7.00票"
    unit?: string;
    trend?: number; // percent change
    trendLabel?: string; // e.g., "环比"
    icon?: React.ReactNode;
    chartColor?: string;
    info?: string;
}

export function StatCard({
    title,
    value,
    subValue,
    unit,
    trend,
    trendLabel = '环比',
    icon,
    chartColor = '#3b82f6'
}: StatCardProps) {
    const isPositive = trend && trend > 0;
    const isNegative = trend && trend < 0;

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-primary-500/30 transition-all group">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
                    {title}
                    {icon && <span className="text-slate-500">{icon}</span>}
                </h3>
                {/* Placeholder for info tooltip or mini chart */}
                {icon && <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Activity className="w-4 h-4 text-slate-600" />
                </div>}
            </div>

            <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
            </div>

            {subValue && (
                <p className="text-xs text-slate-500 mt-1 font-mono">{subValue}</p>
            )}

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                <div className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded
          ${isPositive ? 'text-green-400 bg-green-400/10' :
                        isNegative ? 'text-red-400 bg-red-400/10' :
                            'text-slate-400 bg-slate-400/10'}
        `}>
                    {isPositive && <ArrowUp className="w-3 h-3 mr-0.5" />}
                    {isNegative && <ArrowDown className="w-3 h-3 mr-0.5" />}
                    {!trend && <Minus className="w-3 h-3 mr-0.5" />}
                    {Math.abs(trend || 0).toFixed(2)}%
                </div>
                <span className="text-xs text-slate-600">{trendLabel}</span>
            </div>
        </div>
    );
}
