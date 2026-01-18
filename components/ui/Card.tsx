import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'glass-hover' | 'outline';
    glow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'glass', glow = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-2xl transition-all duration-300',
                    {
                        'bg-dark-900 border border-dark-700': variant === 'default',
                        'glass-panel border-t border-white/10': variant === 'glass',
                        'glass-card hover:-translate-y-1': variant === 'glass-hover',
                        'bg-transparent border border-white/10': variant === 'outline',
                        'shadow-[0_0_20px_rgba(59,130,246,0.15)] border-primary/30': glow,
                    },
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex flex-col space-y-1.5 p-6', className)}
            {...props}
        />
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn('font-semibold leading-none tracking-tight text-white flex items-center gap-2', className)}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
    )
);
CardContent.displayName = 'CardContent';
