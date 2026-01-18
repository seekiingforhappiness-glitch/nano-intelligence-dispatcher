import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'tech';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                {
                    'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80': variant === 'default',
                    'border-transparent bg-emerald-500/15 text-emerald-400 border-emerald-500/20': variant === 'success',
                    'border-transparent bg-yellow-500/15 text-yellow-400 border-yellow-500/20': variant === 'warning',
                    'border-transparent bg-red-500/15 text-red-400 border-red-500/20': variant === 'danger',
                    'text-slate-300 border-slate-700': variant === 'outline',
                    'border-primary/30 bg-primary/10 text-primary animate-pulse-slow shadow-[0_0_10px_rgba(59,130,246,0.2)]': variant === 'tech',
                },
                className
            )}
            {...props}
        />
    );
}
