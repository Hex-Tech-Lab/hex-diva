import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  ref?: React.Ref<HTMLSelectElement>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps & { value?: string; onValueChange?: (value: string) => void; children?: React.ReactNode }>(
  ({ className = '', onValueChange, value, children, ...props }, ref) => (
    <select
      ref={ref}
      value={value || ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

const SelectTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm placeholder-slate-500 ${className}`}
      {...props}
    />
  )
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className = '', ...props }, ref) => (
    <span ref={ref} className={`text-slate-200 ${className}`} {...props} />
  )
);
SelectValue.displayName = 'SelectValue';

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`relative z-50 max-h-96 w-full overflow-auto rounded-md border border-slate-700 bg-slate-900 p-1 shadow-md ${className}`}
      {...props}
    />
  )
);
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string }>(
  ({ className = '', value, ...props }, ref) => (
    <div
      ref={ref}
      data-value={value}
      className={`relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-slate-200 outline-none hover:bg-slate-800 focus:bg-slate-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
      {...props}
    />
  )
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
