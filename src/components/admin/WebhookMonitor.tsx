'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Table, proportional } from '@astryxdesign/core/Table';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';

interface WebhookEvent {
  id: string;
  webhook_id: string;
  provider: string;
  event_type: string;
  status: 'success' | 'failed' | 'duplicate' | 'skipped';
  latency_ms: number | null;
  is_idempotent: boolean;
  error_message: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface WebhookStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  duplicateEvents: number;
  successRate: string;
  averageLatency: string;
  byProvider: Record<
    string,
    {
      total: number;
      success: number;
      failed: number;
      duplicate: number;
      average?: string;
      p50?: string;
      p95?: string;
      p99?: string;
    }
  >;
}

const TIME_RANGE_OPTIONS = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
];

/**
 * WebhookMonitor - Webhook event monitoring and analytics dashboard
 * Displays real-time webhook events, success/failure rates, latency metrics, and allows event export
 */
export function WebhookMonitor() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');

  const providers = ['shopify', 'uppromote', 'orders', 'process-order', 'stripe'];
  const statuses = ['success', 'failed', 'duplicate', 'skipped'];

  const providerOptions = [{ value: 'all', label: 'All Providers' }, ...providers.map(p => ({ value: p, label: p }))];
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];

  /**
   * Fetch webhook events and stats
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedProvider !== 'all') params.append('provider', selectedProvider);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      params.append('timeRange', timeRange);

      const response = await fetch(`/api/admin/webhooks/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch webhook events');

      const data = await response.json();
      setEvents(data.events || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial load and polling
   */
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [selectedProvider, selectedStatus, timeRange]);

  /**
   * Handle event replay
   */
  const handleReplay = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/events/${eventId}/replay`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to initiate replay');

      alert('Event replay initiated');
      fetchData();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Handle CSV export
   */
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProvider !== 'all') params.append('provider', selectedProvider);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      params.append('timeRange', timeRange);

      const response = await fetch(`/api/admin/webhooks/events/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export events');

      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webhook-events-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success" label="Success" icon={<CheckCircle className="w-3 h-3" />} />;
      case 'failed':
        return <Badge variant="error" label="Failed" icon={<XCircle className="w-3 h-3" />} />;
      case 'duplicate':
        return <Badge variant="warning" label="Duplicate" icon={<AlertTriangle className="w-3 h-3" />} />;
      case 'skipped':
        return <Badge variant="neutral" label="Skipped" />;
      default:
        return <Badge variant="neutral" label={status} />;
    }
  };

  /**
   * Format latency
   */
  const formatLatency = (latency: number | null) => {
    if (!latency) return 'N/A';
    return latency > 1000 ? `${(latency / 1000).toFixed(2)}s` : `${latency}ms`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhook Monitor</h1>
          <p className="text-gray-600 mt-1">
            Real-time webhook event tracking and idempotency monitoring
          </p>
        </div>
        <Button label="Refresh" onClick={fetchData} variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} />
      </div>

      {/* Error Alert */}
      {error && <Banner status="error" title={error} icon={<AlertTriangle className="h-4 w-4" />} />}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="default" padding={4}>
            <p className="text-sm font-medium text-gray-600 mb-2">Total Events</p>
            <div className="text-3xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-gray-600 mt-1">in {timeRange}</p>
          </Card>

          <Card variant="default" padding={4}>
            <p className="text-sm font-medium text-gray-600 mb-2">Success Rate</p>
            <div className="text-3xl font-bold text-green-600">{stats.successRate}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.successfulEvents} successful</p>
          </Card>

          <Card variant="default" padding={4}>
            <p className="text-sm font-medium text-gray-600 mb-2">Failures</p>
            <div className="text-3xl font-bold text-red-600">{stats.failedEvents}</div>
            <p className="text-xs text-gray-600 mt-1">events failed</p>
          </Card>

          <Card variant="default" padding={4}>
            <p className="text-sm font-medium text-gray-600 mb-2">Avg Latency</p>
            <div className="text-3xl font-bold">{stats.averageLatency}</div>
            <p className="text-xs text-gray-600 mt-1">end-to-end</p>
          </Card>
        </div>
      )}

      {/* Provider Stats */}
      {stats && Object.keys(stats.byProvider).length > 0 && (
        <Card variant="default" padding={4}>
          <h2 className="text-lg font-semibold mb-1">By Provider</h2>
          <p className="text-sm text-gray-600 mb-4">Performance metrics per webhook provider</p>
          <div className="space-y-3">
            {Object.entries(stats.byProvider).map(([provider, providerStats]) => (
              <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-semibold text-sm">{provider}</h3>
                  <p className="text-xs text-gray-600">
                    {providerStats.total} events
                    {providerStats.success && ` • ${providerStats.success} success`}
                    {providerStats.failed && ` • ${providerStats.failed} failed`}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {providerStats.average && (
                    <>
                      <div>Avg: {providerStats.average}</div>
                      {providerStats.p95 && <div className="text-xs text-gray-600">p95: {providerStats.p95}</div>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card variant="default" padding={4}>
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Selector
            label="Time Range"
            options={TIME_RANGE_OPTIONS.map(o => o.value)}
            renderOption={option => TIME_RANGE_OPTIONS.find(o => o.value === option.value)?.label ?? option.value}
            value={timeRange}
            onChange={setTimeRange}
          />

          <Selector
            label="Provider"
            options={providerOptions.map(o => o.value)}
            renderOption={option => providerOptions.find(o => o.value === option.value)?.label ?? option.value}
            value={selectedProvider}
            onChange={setSelectedProvider}
          />

          <Selector
            label="Status"
            options={statusOptions.map(o => o.value)}
            renderOption={option => statusOptions.find(o => o.value === option.value)?.label ?? option.value}
            value={selectedStatus}
            onChange={setSelectedStatus}
          />
        </div>
      </Card>

      {/* Events Table */}
      <Card variant="default" padding={4}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Events</h2>
            <p className="text-sm text-gray-600">{events.length} events matching filters</p>
          </div>
          <Button label="Export CSV" onClick={handleExport} variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No events found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={events}
              idKey="id"
              columns={[
                {
                  key: 'webhook_id',
                  header: 'Webhook ID',
                  width: proportional(1),
                  renderCell: event => <span className="font-mono text-xs">{event.webhook_id.slice(0, 8)}...</span>,
                },
                { key: 'provider', header: 'Provider', width: proportional(1) },
                { key: 'event_type', header: 'Event Type', width: proportional(1) },
                {
                  key: 'status',
                  header: 'Status',
                  width: proportional(1),
                  renderCell: event => getStatusBadge(event.status),
                },
                {
                  key: 'latency_ms',
                  header: 'Latency',
                  width: proportional(1),
                  renderCell: event => formatLatency(event.latency_ms),
                },
                {
                  key: 'is_idempotent',
                  header: 'Idempotent',
                  width: proportional(1),
                  renderCell: event =>
                    event.is_idempotent ? (
                      <Badge variant="info" label="Yes" />
                    ) : (
                      <span className="text-gray-600">No</span>
                    ),
                },
                {
                  key: 'created_at',
                  header: 'Time',
                  width: proportional(1),
                  renderCell: event => (
                    <span className="text-xs text-gray-600">{format(new Date(event.created_at), 'HH:mm:ss')}</span>
                  ),
                },
                {
                  key: 'id',
                  header: 'Actions',
                  width: proportional(1),
                  renderCell: event => (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" label="Replay" onClick={() => handleReplay(event.id)} />
                      {event.error_message && (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Details"
                          onClick={() => alert(`Error: ${event.error_message}`)}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
              hasHover
              dividers="rows"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
