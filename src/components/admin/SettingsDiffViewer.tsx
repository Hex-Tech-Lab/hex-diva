'use client';

interface SettingsDiffViewerProps {
  section: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  compact?: boolean;
  changedBy?: string;
  changedAt?: Date;
}

export function SettingsDiffViewer({
  section,
  field,
  oldValue,
  newValue,
  compact = false,
  changedBy,
  changedAt,
}: SettingsDiffViewerProps) {
  // Determine if values are complex objects
  const isComplexValue = (value: unknown): boolean => {
    return value !== null && typeof value === 'object';
  };

  // Format value for display with syntax highlighting
  const formatValue = (value: unknown): { text: string; isJson: boolean } => {
    if (value === null || value === undefined) {
      return { text: 'null', isJson: false };
    }

    if (typeof value === 'object') {
      try {
        return { text: JSON.stringify(value, null, 2), isJson: true };
      } catch {
        return { text: String(value), isJson: false };
      }
    }

    if (typeof value === 'boolean') {
      return { text: value ? 'true' : 'false', isJson: false };
    }

    return { text: String(value), isJson: false };
  };

  // Generate a visual diff for simple values
  const showSimpleDiff = !isComplexValue(oldValue) && !isComplexValue(newValue);
  const oldFormatted = formatValue(oldValue);
  const newFormatted = formatValue(newValue);

  // Check if values are identical (no visual diff needed)
  const isIdentical = oldFormatted.text === newFormatted.text;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {/* Field path header */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm text-white bg-slate-800/50 px-3 py-1 rounded">
          {section}.{field}
        </div>
        {changedBy && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>by {changedBy}</span>
            {changedAt && <span className="text-slate-500">{new Date(changedAt).toLocaleString()}</span>}
          </div>
        )}
      </div>

      {isIdentical ? (
        <div className="text-xs text-slate-500 italic">No changes detected</div>
      ) : (
        <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'md:grid-cols-2 gap-4'}`}>
          {/* Old value */}
          <div>
            <p className="text-xs font-medium text-red-300 mb-2">Before</p>
            <div className={`
              p-3 rounded-lg bg-red-950/20 border border-red-900/30
              text-red-100 text-sm font-mono whitespace-pre-wrap
              ${oldFormatted.isJson ? 'overflow-x-auto' : ''}
              ${compact ? 'max-h-24' : 'max-h-48'} overflow-y-auto
            `}>
              <code>{oldFormatted.text}</code>
            </div>
          </div>

          {/* New value */}
          <div>
            <p className="text-xs font-medium text-green-300 mb-2">After</p>
            <div className={`
              p-3 rounded-lg bg-green-950/20 border border-green-900/30
              text-green-100 text-sm font-mono whitespace-pre-wrap
              ${newFormatted.isJson ? 'overflow-x-auto' : ''}
              ${compact ? 'max-h-24' : 'max-h-48'} overflow-y-auto
            `}>
              <code>{newFormatted.text}</code>
            </div>
          </div>
        </div>
      )}

      {/* Change summary for simple values */}
      {showSimpleDiff && !isIdentical && (
        <div className="mt-3 text-xs">
          <p className="text-slate-400 mb-1">Change Summary:</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-950/30 text-red-300 rounded text-xs border border-red-900/30">
              {oldFormatted.text}
            </span>
            <span className="text-slate-500">→</span>
            <span className="px-2 py-1 bg-green-950/30 text-green-300 rounded text-xs border border-green-900/30">
              {newFormatted.text}
            </span>
          </div>
        </div>
      )}

      {/* Type information */}
      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span className="bg-slate-800/30 px-2 py-1 rounded">
          Old: {typeof oldValue === 'object' ? (Array.isArray(oldValue) ? 'array' : 'object') : typeof oldValue}
        </span>
        <span className="bg-slate-800/30 px-2 py-1 rounded">
          New: {typeof newValue === 'object' ? (Array.isArray(newValue) ? 'array' : 'object') : typeof newValue}
        </span>
      </div>
    </div>
  );
}
