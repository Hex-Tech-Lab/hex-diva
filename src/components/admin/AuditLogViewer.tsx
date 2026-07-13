'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingsDiffViewer } from './SettingsDiffViewer';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  changedBy: string;
  section: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'deployed';
  deploymentId?: string;
  deploymentStatus?: 'pending' | 'building' | 'ready' | 'failed';
  deploymentUrl?: string;
  commitHash?: string;
  deployedAt?: Date;
}

interface AuditLogViewerProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
}

export default function AuditLogViewer({
  autoRefresh = true,
  refreshInterval = 3000,
  pageSize = 50,
}: AuditLogViewerProps) {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch audit log
  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }

      const data = await response.json();
      const entries = (data.data?.auditLog || []).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
        deployedAt: entry.deployedAt ? new Date(entry.deployedAt) : undefined,
      }));

      setAuditLog(entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit log');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAuditLog();
  }, []);

  // Auto-refresh poll
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAuditLog();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Get unique sections and statuses
  const sections = Array.from(new Set(auditLog.map((entry) => entry.section)));
  const statuses = Array.from(new Set(auditLog.map((entry) => entry.status)));

  // Filter entries
  const filteredLog = auditLog.filter((entry) => {
    if (filterSection && entry.section !== filterSection) return false;
    if (filterStatus && entry.status !== filterStatus) return false;
    return true;
  });

  // Paginate
  const paginatedLog = filteredLog.slice(0, pageSize);

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-amber-950/30 text-amber-300 border-amber-900/30';
      case 'approved':
        return 'bg-blue-950/30 text-blue-300 border-blue-900/30';
      case 'deployed':
        return 'bg-green-950/30 text-green-300 border-green-900/30';
      case 'rejected':
        return 'bg-red-950/30 text-red-300 border-red-900/30';
      default:
        return 'bg-slate-950/30 text-slate-300 border-slate-900/30';
    }
  };

  // Get deployment status color
  const getDeploymentStatusColor = (status?: string): string => {
    switch (status) {
      case 'pending':
        return 'text-amber-300';
      case 'building':
        return 'text-blue-300';
      case 'ready':
        return 'text-green-300';
      case 'failed':
        return 'text-red-300';
      default:
        return 'text-slate-300';
    }
  };

  // Format timestamp
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  // Format value for tooltip
  const formatValueForTooltip = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Audit Log</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAuditLog}
          disabled={loading}
          aria-label="Refresh audit log"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Filter by Section
          </label>
          <select
            value={filterSection || ''}
            onChange={(e) => setFilterSection(e.target.value || null)}
            className="w-full h-9 px-3 py-1 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white"
            aria-label="Filter by section"
          >
            <option value="">All Sections ({sections.length})</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-64">
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Filter by Status
          </label>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="w-full h-9 px-3 py-1 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white"
            aria-label="Filter by status"
          >
            <option value="">All Statuses ({statuses.length})</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <p className="text-xs text-slate-400">
            Showing {paginatedLog.length} of {filteredLog.length} entries
          </p>
        </div>
      </div>

      {/* Empty state */}
      {paginatedLog.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <p className="text-slate-400">No audit log entries found</p>
          {filterSection || filterStatus ? (
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
          ) : (
            <p className="text-slate-500 text-sm mt-1">Settings changes will appear here</p>
          )}
        </Card>
      )}

      {/* Loading state */}
      {loading && auditLog.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="animate-spin">⏳</div>
          </div>
          <p className="text-slate-400">Loading audit log...</p>
        </Card>
      )}

      {/* Log entries table */}
      {paginatedLog.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 border-b border-slate-700/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  Timestamp
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  Admin
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  Setting (section.field)
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  Change
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  Deployment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {paginatedLog.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === entry.id ? null : entry.id)
                  }
                >
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatTime(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-mono text-slate-300">{entry.changedBy}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-mono text-white">
                      {entry.section}.{entry.field}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50 text-slate-300 inline-block truncate max-w-xs">
                      {formatValueForTooltip(entry.oldValue).slice(0, 20)}...
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                        entry.status
                      )}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {entry.deploymentStatus ? (
                      <span className={`font-medium ${getDeploymentStatusColor(
                        entry.deploymentStatus
                      )}`}>
                        {entry.deploymentStatus}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded row details */}
      {paginatedLog.length > 0 && (
        <div className="space-y-3">
          {paginatedLog
            .filter((entry) => expandedId === entry.id)
            .map((entry) => (
              <Card
                key={`expanded-${entry.id}`}
                className="p-6 space-y-4 border border-blue-900/50 bg-blue-950/10"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {entry.section}.{entry.field}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Changed by {entry.changedBy} at {formatTime(entry.timestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded border ${getStatusColor(
                        entry.status
                      )}`}
                    >
                      {entry.status}
                    </span>
                    {entry.deploymentStatus && (
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded border ${
                          entry.deploymentStatus === 'ready'
                            ? 'bg-green-950/30 text-green-300 border-green-900/30'
                            : entry.deploymentStatus === 'failed'
                              ? 'bg-red-950/30 text-red-300 border-red-900/30'
                              : 'bg-amber-950/30 text-amber-300 border-amber-900/30'
                        }`}
                      >
                        {entry.deploymentStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Diff viewer */}
                <div className="pt-4 border-t border-blue-900/30">
                  <SettingsDiffViewer
                    section={entry.section}
                    field={entry.field}
                    oldValue={entry.oldValue}
                    newValue={entry.newValue}
                    changedBy={entry.changedBy}
                    changedAt={entry.timestamp}
                  />
                </div>

                {/* Deployment details */}
                {entry.deploymentId && (
                  <div className="pt-4 border-t border-blue-900/30 space-y-2">
                    <h4 className="text-xs font-medium text-slate-300">Deployment Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Deployment ID</p>
                        <p className="font-mono text-xs text-slate-300 truncate">
                          {entry.deploymentId}
                        </p>
                      </div>
                      {entry.commitHash && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Commit Hash</p>
                          <p className="font-mono text-xs text-slate-300">
                            {entry.commitHash.slice(0, 7)}
                          </p>
                        </div>
                      )}
                      {entry.deploymentUrl && (
                        <div className="col-span-2">
                          <a
                            href={entry.deploymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 text-xs font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Deployment →
                          </a>
                        </div>
                      )}
                      {entry.deployedAt && (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-400 mb-1">Deployed At</p>
                          <p className="text-xs text-slate-300">
                            {formatTime(entry.deployedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(null)}
                    aria-label="Collapse details"
                  >
                    Collapse
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Pagination info */}
      {filteredLog.length > pageSize && (
        <div className="text-center text-xs text-slate-500 pt-2">
          Showing {paginatedLog.length} of {filteredLog.length} entries (pagination limited to {pageSize})
        </div>
      )}
    </div>
  );
}
