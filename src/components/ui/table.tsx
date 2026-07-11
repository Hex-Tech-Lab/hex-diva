import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  ref?: React.Ref<HTMLTableElement>;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <thead
      ref={ref}
      className={`border-b border-slate-700 bg-slate-900/20 ${className}`}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <tbody ref={ref} className={`${className}`} {...props} />
  )
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <tfoot
      ref={ref}
      className={`border-t border-slate-700 bg-slate-900/20 font-medium ${className}`}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b border-slate-700 transition-colors hover:bg-slate-800/50 data-[state=selected]:bg-slate-800 ${className}`}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-medium text-slate-300 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => (
    <td
      ref={ref}
      className={`px-4 py-3 align-middle text-slate-200 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
};
