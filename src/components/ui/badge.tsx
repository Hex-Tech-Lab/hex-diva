import React from 'react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  ref?: React.Ref<HTMLDivElement>;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-slate-800 text-slate-100',
  secondary: 'border-transparent bg-slate-700 text-slate-200',
  destructive: 'border-transparent bg-red-900/20 text-red-400',
  outline: 'text-slate-200 border-slate-700',
  success: 'border-transparent bg-green-900/20 text-green-400',
  warning: 'border-transparent bg-amber-900/20 text-amber-400',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge };
