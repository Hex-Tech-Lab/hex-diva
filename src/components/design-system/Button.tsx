/**
 * Button Component
 * Luxury cosmetics brand button styles
 * Variants: primary, secondary, accent, ghost
 * Sizes: large, medium (default), small
 */

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      children,
      icon,
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = 'button';
    const variantClasses = `btn-${variant}`;
    const sizeClasses = size !== 'medium' ? `btn-${size}` : '';
    const widthClasses = fullWidth ? 'w-full' : '';
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

    const allClasses = [
      baseClasses,
      variantClasses,
      sizeClasses,
      widthClasses,
      disabledClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={allClasses}
        disabled={disabled || loading}
        {...props}
      >
        {icon && <span className="button-icon">{icon}</span>}
        {children}
        {loading && <span className="button-loader">…</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Icon Button Component
 * Circular button for icon-only actions
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  ariaLabel: string;
  size?: 'small' | 'medium' | 'large';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, ariaLabel, size = 'medium', className = '', ...props }, ref) => {
    const sizeMap = {
      small: '36px',
      medium: '44px',
      large: '48px',
    };

    return (
      <button
        ref={ref}
        className={`btn-icon ${className}`}
        aria-label={ariaLabel}
        style={{ width: sizeMap[size], height: sizeMap[size] }}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * Button Group Component
 * Multiple buttons with consistent spacing
 */
interface ButtonGroupProps {
  children: React.ReactNode;
  vertical?: boolean;
  className?: string;
}

export const ButtonGroup = ({ children, vertical = false, className = '' }: ButtonGroupProps) => {
  const direction = vertical ? 'flex-col' : 'flex-row';
  return (
    <div className={`flex gap-lg ${direction} ${className}`}>
      {children}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';
