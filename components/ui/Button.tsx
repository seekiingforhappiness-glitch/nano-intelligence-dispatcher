import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'relative inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50',
                    {
                        // Variants
                        'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0': variant === 'primary',
                        'bg-white/10 text-white hover:bg-white/20 hover:text-white border border-white/5': variant === 'secondary',
                        'bg-transparent text-slate-400 hover:text-white hover:bg-white/5': variant === 'ghost',
                        'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20': variant === 'danger',
                        'bg-transparent border border-white/20 text-slate-200 hover:bg-white/5': variant === 'outline',

                        // Sizes
                        'h-8 px-3 text-xs': size === 'sm',
                        'h-10 px-4 py-2 text-sm': size === 'md',
                        'h-12 px-6 text-base': size === 'lg',
                        'h-10 w-10 p-0': size === 'icon',
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';
