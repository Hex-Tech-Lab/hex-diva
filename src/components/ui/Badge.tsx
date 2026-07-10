import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-gray-200 text-gray-900',
      success: 'bg-green-200 text-green-900',
      warning: 'bg-yellow-200 text-yellow-900',
      error: 'bg-red-200 text-red-900',
    };

    return (
      <span
        ref={ref}
        className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-medium ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
