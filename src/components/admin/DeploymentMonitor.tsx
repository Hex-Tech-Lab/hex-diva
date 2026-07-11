'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeploymentEntry {
  id: string;
  timestamp: Date;
  changedBy: string;
  section: string;
  field: string;
  status: string;
  deploymentId?: string;
  deploymentStatus?: 'pending' | 'building' | 'ready' | 'failed';
  deploymentUrl?: string;
  commitHash?: string;
  deployedAt?: Date;
}

interface DeploymentMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function DeploymentMonitor({
  autoRefresh = true,
  refreshInterval = 2000,
}: DeploymentMonitorProps) {
  const [deployments, setDeployments] = useState<DeploymentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch deployment status
  const fetchDeploymentStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deployment status');
      }

      const data = await response.json();
      const auditLog = data.data?.auditLog || [];

      // Filter deployments (entries with deploymentId)
      const deploymentEntries = auditLog
        .filter((entry: any) => entry.deploymentId)
        .map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          deployedAt: entry.deployedAt ? new Date(entry.deployedAt) : undefined,
        }));

      setDeployments(deploymentEntries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deployment status');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDeploymentStatus();
  }, []);

  // Auto-refresh poll
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDeploymentStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Get status color
  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-amber-950/30 text-amber-300 border-amber-900/30';
      case 'building':
        return 'bg-blue-950/30 text-blue-300 border-blue-900/30';
      case 'ready':
        return 'bg-green-950/30 text-green-300 border-green-900/30';
      case 'failed':
        return 'bg-red-950/30 text-red-300 border-red-900/30';
      default:
        return 'bg-slate-950/30 text-slate-300 border-slate-900/30';
    }
  };

  // Get status icon
  const getStatusIcon = (status?: string): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'building':
        return '🔨';
      case 'ready':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '•';
    }
  };

  // Calculate time elapsed since deployment
  const getTimeElapsed = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  const activeDeployments = deployments.filter((d) =>
    d.deploymentStatus === 'pending' || d.deploymentStatus === 'building'
  );
  const completedDeployments = deployments.filter((d) =>
    d.deploymentStatus === 'ready' || d.deploymentStatus === 'failed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Deployment Monitor</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDeploymentStatus}
          disabled={loading}
          aria-label="Refresh deployment status"
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

      {/* Active deployments */}
      {activeDeployments.length > 0 && (
        <Card className="p-6 space-y-4 border border-blue-900/50 bg-blue-950/10">
          <h3 className="text-base font-semibold text-blue-300 flex items-center gap-2">
            <span className="animate-spin">⚡</span>
            Active Deployments
          </h3>

          <div className="space-y-3">
            {activeDeployments.map((deployment) => (
              <div
                key={deployment.id}
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 space-y-2 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() =>
                  setExpandedId(expandedId === deployment.id ? null : deployment.id)
                }
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`text-lg ${
                      deployment.deploymentStatus === 'building' ? 'animate-spin' : ''
                    }`}>
                      {getStatusIcon(deployment.deploymentStatus)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {deployment.section}.{deployment.field}
                      </p>
                      <p className="text-xs text-slate-400">
                        by {deployment.changedBy} • {getTimeElapsed(deployment.timestamp)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded border ${getStatusColor(
                      deployment.deploymentStatus
                    )}`}
                  >
                    {deployment.deploymentStatus || 'pending'}
                  </span>
                </div>

                {/* Expanded details */}
                {expandedId === deployment.id && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                    {deployment.deploymentId && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Deployment ID</p>
                        <p className="font-mono text-xs text-slate-300">{deployment.deploymentId}</p>
                      </div>
                    )}
                    {deployment.commitHash && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Commit</p>
                        <p className="font-mono text-xs text-slate-300">{deployment.commitHash}</p>
                      </div>
                    )}
                    {deployment.deploymentStatus === 'building' && (
                      <div className="mt-3">
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse"></div>
                        </div>
                        <p className="text-xs text-blue-300 mt-2">Building deployment...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Completed deployments */}
      {completedDeployments.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-300">Deployment History</h3>

          <div className="space-y-3">
            {completedDeployments.slice(0, 10).map((deployment) => (
              <div
                key={deployment.id}
                className={`p-4 rounded-lg border cursor-pointer hover:bg-opacity-75 transition-colors ${
                  deployment.deploymentStatus === 'ready'
                    ? 'bg-green-950/20 border-green-900/30'
                    : 'bg-red-950/20 border-red-900/30'
                }`}
                onClick={() =>
                  setExpandedId(expandedId === deployment.id ? null : deployment.id)
                }
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">
                      {getStatusIcon(deployment.deploymentStatus)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {deployment.section}.{deployment.field}
                      </p>
                      <p className="text-xs text-slate-400">
                        by {deployment.changedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded border ${getStatusColor(
                        deployment.deploymentStatus
                      )}`}
                    >
                      {deployment.deploymentStatus}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {deployment.deployedAt
                        ? new Date(deployment.deployedAt).toLocaleString()
                        : new Date(deployment.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === deployment.id && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                    {deployment.deploymentId && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Deployment ID</p>
                        <p className="font-mono text-xs text-slate-300">{deployment.deploymentId}</p>
                      </div>
                    )}
                    {deployment.commitHash && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Commit</p>
                        <p className="font-mono text-xs text-slate-300">{deployment.commitHash}</p>
                      </div>
                    )}
                    {deployment.deploymentUrl && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <a
                          href={deployment.deploymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs font-medium hover:underline ${
                            deployment.deploymentStatus === 'ready'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Deployment →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {completedDeployments.length > 10 && (
            <p className="text-xs text-slate-500 text-center pt-2">
              Showing 10 of {completedDeployments.length} completed deployments
            </p>
          )}
        </Card>
      )}

      {/* Empty state */}
      {deployments.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <p className="text-slate-400">No deployments yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create and approve a settings change to trigger a deployment
          </p>
        </Card>
      )}

      {/* Loading state */}
      {loading && deployments.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="animate-spin">⏳</div>
          </div>
          <p className="text-slate-400">Loading deployment status...</p>
        </Card>
      )}
    </div>
  );
}
