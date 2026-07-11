'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

      const response = await fetch(`/api/admin/webhooks/events/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export events');

      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webhook-events-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      a.click();
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
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'duplicate':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Duplicate
          </Badge>
        );
      case 'skipped':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Skipped
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
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
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-gray-600 mt-1">in {timeRange}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.successRate}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.successfulEvents} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.failedEvents}</div>
              <p className="text-xs text-gray-600 mt-1">events failed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Latency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageLatency}</div>
              <p className="text-xs text-gray-600 mt-1">end-to-end</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Provider Stats */}
      {stats && Object.keys(stats.byProvider).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Provider</CardTitle>
            <CardDescription>Performance metrics per webhook provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byProvider).map(([provider, providerStats]) => (
                <div
                  key={provider}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
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
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Provider</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map(provider => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                {events.length} events matching filters
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No events found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Webhook ID</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Idempotent</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">
                        {event.webhook_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">{event.provider}</TableCell>
                      <TableCell className="text-sm">{event.event_type}</TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell className="text-sm">{formatLatency(event.latency_ms)}</TableCell>
                      <TableCell className="text-sm">
                        {event.is_idempotent ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-gray-600">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {format(new Date(event.created_at), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReplay(event.id)}
                            className="text-xs"
                          >
                            Replay
                          </Button>
                          {event.error_message && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title={event.error_message}
                              className="text-xs"
                            >
                              Details
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
