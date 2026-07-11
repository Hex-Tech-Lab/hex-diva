import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  ref?: React.Ref<HTMLDivElement>;
}

const variantClasses = {
  default: 'border-slate-700 bg-slate-900/40 text-slate-200',
  destructive: 'border-red-700/50 bg-red-900/20 text-red-400',
  success: 'border-green-700/50 bg-green-900/20 text-green-400',
  warning: 'border-amber-700/50 bg-amber-900/20 text-amber-400',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h5
      ref={ref}
      className={`mb-1 font-medium leading-tight ${className}`}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
