'use client';

import { AlertTriangle, X } from 'lucide-react';

interface AlertBannerProps {
    alerts: string[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
    if (!alerts.length) return null;

    return (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1 bg-orange-500/20 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 space-y-1">
                {alerts.map((alert, index) => (
                    <p key={index} className="text-sm text-orange-200/80 leading-relaxed">
                        <span className="font-medium text-orange-400 mr-2">警告</span>
                        {alert}
                    </p>
                ))}
            </div>
        </div>
    );
}
