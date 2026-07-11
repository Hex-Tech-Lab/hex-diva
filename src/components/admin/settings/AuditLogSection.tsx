'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  changedBy: string;
  section: string;
  field: string;
  oldValue: any;
  newValue: any;
  status: 'pending' | 'approved' | 'rejected';
}

interface AuditLogSectionProps {
  auditLog: AuditLogEntry[];
}

export default function AuditLogSection({ auditLog }: AuditLogSectionProps) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Get unique sections and statuses for filters
  const sections = Array.from(new Set(auditLog.map((entry) => entry.section)));
  const statuses = Array.from(new Set(auditLog.map((entry) => entry.status)));

  // Filter entries
  const filteredLog = auditLog.filter((entry) => {
    if (filterSection && entry.section !== filterSection) return false;
    if (filterStatus && entry.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-950/30 text-amber-300 border-amber-900/30';
      case 'approved':
        return 'bg-green-950/30 text-green-300 border-green-900/30';
      case 'rejected':
        return 'bg-red-950/30 text-red-300 border-red-900/30';
      default:
        return 'bg-slate-950/30 text-slate-300 border-slate-900/30';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Section
          </label>
          <select
            value={filterSection || ''}
            onChange={(e) => setFilterSection(e.target.value || null)}
            className="hx-field flex h-10 px-3 py-2 text-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Status
          </label>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="hx-field flex h-10 px-3 py-2 text-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <p className="text-sm text-slate-400">
            Showing {filteredLog.length} of {auditLog.length} entries
          </p>
        </div>
      </div>

      {/* Log entries */}
      {filteredLog.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400">No audit log entries found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLog.map((entry) => (
            <Card
              key={entry.id}
              className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
              onClick={() =>
                setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
              }
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-medium text-white">
                      {entry.section}.{entry.field}
                    </p>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                        entry.status
                      )}`}
                    >
                      {entry.status}
                    </span>
                    <span className="px-2 py-1 text-xs bg-slate-800/50 text-slate-400 rounded border border-slate-700/50">
                      {entry.section}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    Changed by:{' '}
                    <span className="text-slate-300 font-mono">{entry.changedBy}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedEntry === entry.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </div>

              {/* Expanded content */}
              {expandedEntry === entry.id && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-2">
                        Old Value
                      </p>
                      <pre className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 text-slate-300 text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                        {formatValue(entry.oldValue)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-2">
                        New Value
                      </p>
                      <pre className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-900/50 text-cyan-300 text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                        {formatValue(entry.newValue)}
                      </pre>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Entry ID: {entry.id}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty state with hint */}
      {auditLog.length === 0 && (
        <Card className="p-8 text-center space-y-3">
          <p className="text-slate-400">No audit log entries yet</p>
          <p className="text-slate-500 text-sm">
            Proposed changes will appear here once they are drafted
          </p>
        </Card>
      )}
    </div>
  );
}
