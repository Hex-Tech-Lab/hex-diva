/**
 * Webhook Event Inspector
 * Provides tools for analyzing, comparing, and replaying webhook events
 * Supports forensic analysis and manual event replay
 */

import { getSupabaseAdmin } from '@/lib/db';
import { WebhookEventRecord, webhookEventLogger } from './eventLog';

export interface EventComparisonResult {
  original: WebhookEventRecord;
  duplicate: WebhookEventRecord;
  differences: {
    field: string;
    original: unknown;
    duplicate: unknown;
  }[];
  isDuplicate: boolean;
}

export interface EventReplayResult {
  success: boolean;
  originalEventId: string;
  newEventId?: string;
  newStatus?: string;
  message: string;
  error?: string;
}

export class WebhookEventInspector {
  private get supabase(): ReturnType<typeof getSupabaseAdmin> {
    return getSupabaseAdmin();
  }

  /**
   * Get event by ID with full details
   */
  async getEventById(eventId: string): Promise<WebhookEventRecord | null> {
    return webhookEventLogger.getEventById(eventId);
  }

  /**
   * List events for a specific webhook ID
   */
  async listEventsByWebhookId(
    webhookId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<WebhookEventRecord[]> {
    const { limit = 50 } = options;
    return webhookEventLogger.getEventsByWebhookId(webhookId, limit);
  }

  /**
   * Find all duplicate events for a given payload hash
   */
  async findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]> {
    return webhookEventLogger.findDuplicateEvents(payloadHash, provider, excludeEventId);
  }

  /**
   * Compare two webhook events to identify differences
   */
  async compareEvents(eventId1: string, eventId2: string): Promise<EventComparisonResult | null> {
    const event1 = await this.getEventById(eventId1);
    const event2 = await this.getEventById(eventId2);

    if (!event1 || !event2) {
      return null;
    }

    const differences: EventComparisonResult['differences'] = [];

    // Compare all fields
    const allKeys = new Set([
      ...Object.keys(event1),
      ...Object.keys(event2),
    ]);

    for (const key of allKeys) {
      const val1 = (event1 as any)[key];
      const val2 = (event2 as any)[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          field: key,
          original: val1,
          duplicate: val2,
        });
      }
    }

    return {
      original: event1,
      duplicate: event2,
      differences,
      isDuplicate: differences.length === 0,
    };
  }

  /**
   * Get comprehensive event details with context
   */
  async getEventDetails(eventId: string) {
    const event = await this.getEventById(eventId);
    if (!event) return null;

    // Get related duplicate events
    let duplicates: WebhookEventRecord[] = [];
    if (event.payload_hash) {
      duplicates = await this.findDuplicateEvents(
        event.payload_hash,
        event.provider,
        eventId
      );
    }

    // Get original event if this is a duplicate
    let originalEvent: WebhookEventRecord | null = null;
    if (event.is_idempotent && event.original_event_id) {
      originalEvent = await this.getEventById(event.original_event_id);
    }

    // Get replay history
    const { data: replays } = await this.supabase
      .from('webhook_replays' as any)
      .select('*')
      .eq('original_event_id', eventId)
      .order('created_at', { ascending: false });

    return {
      event,
      duplicates: duplicates.slice(0, 10), // Limit to 10
      originalEvent,
      replays: replays || [],
    };
  }

  /**
   * Analyze webhook event patterns to identify issues
   */
  async analyzeEventPatterns(
    provider: string,
    timeframeHours: number = 24
  ): Promise<{
    totalEvents: number;
    successRate: number;
    duplicateRate: number;
    failureRate: number;
    averageLatency: number;
    latencyPercentiles: {
      p50: number;
      p95: number;
      p99: number;
    };
    topErrors: Array<{ error: string; count: number }>;
    issues: string[];
  }> {
    const startDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const { data: events, error } = await this.supabase
      .from('webhook_events' as any)
      .select('*')
      .eq('provider', provider)
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw error;
    }

    const eventList = (events || []) as unknown as WebhookEventRecord[];

    if (eventList.length === 0) {
      return {
        totalEvents: 0,
        successRate: 0,
        duplicateRate: 0,
        failureRate: 0,
        averageLatency: 0,
        latencyPercentiles: { p50: 0, p95: 0, p99: 0 },
        topErrors: [],
        issues: ['No events found in timeframe'],
      };
    }

    // Calculate metrics
    const totalEvents = eventList.length;
    const successCount = eventList.filter(e => e.status === 'success').length;
    const duplicateCount = eventList.filter(e => e.status === 'duplicate').length;
    const failureCount = eventList.filter(e => e.status === 'failed').length;

    const successRate = (successCount / totalEvents) * 100;
    const duplicateRate = (duplicateCount / totalEvents) * 100;
    const failureRate = (failureCount / totalEvents) * 100;

    // Latency analysis
    const latencies = eventList
      .map(e => e.latency_ms)
      .filter((l): l is number => l !== null)
      .sort((a, b) => a - b);

    const averageLatency = latencies.length ? latencies.reduce((a, b) => a + b) / latencies.length : 0;
    const latencyPercentiles = {
      p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
    };

    // Error analysis
    const errorCounts: Record<string, number> = {};
    for (const event of eventList) {
      if (event.error_message) {
        errorCounts[event.error_message] = (errorCounts[event.error_message] || 0) + 1;
      }
    }

    const topErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Identify issues
    const issues: string[] = [];
    if (failureRate > 5) {
      issues.push(`High failure rate: ${failureRate.toFixed(2)}% (>5%)`);
    }
    if (duplicateRate > 10) {
      issues.push(`High duplicate rate: ${duplicateRate.toFixed(2)}% (>10%)`);
    }
    if (averageLatency > 2000) {
      issues.push(`High average latency: ${averageLatency.toFixed(0)}ms (>2000ms SLA)`);
    }
    if (latencyPercentiles.p99 > 5000) {
      issues.push(`High p99 latency: ${latencyPercentiles.p99}ms (>5000ms)`);
    }

    return {
      totalEvents,
      successRate: parseFloat(successRate.toFixed(2)),
      duplicateRate: parseFloat(duplicateRate.toFixed(2)),
      failureRate: parseFloat(failureRate.toFixed(2)),
      averageLatency: parseFloat(averageLatency.toFixed(0)),
      latencyPercentiles,
      topErrors,
      issues,
    };
  }

  /**
   * Initiate event replay
   */
  async initiateEventReplay(
    eventId: string,
    reason: string,
    userId?: string
  ): Promise<EventReplayResult> {
    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        return {
          success: false,
          originalEventId: eventId,
          message: 'Event not found',
          error: 'Event does not exist',
        };
      }

      // Create replay record
      const { error: replayError } = await this.supabase
        .from('webhook_replays' as any)
        .insert({
          original_event_id: eventId,
          initiated_by: userId,
          reason,
          status: 'processing',
        })
        .select()
        .single();

      if (replayError) {
        return {
          success: false,
          originalEventId: eventId,
          message: 'Failed to create replay record',
          error: replayError.message,
        };
      }

      // TODO: Queue webhook for replay processing
      // This would typically involve:
      // 1. Extracting the original payload from event metadata
      // 2. Queuing it for reprocessing
      // 3. Updating the replay record with the new event ID

      return {
        success: true,
        originalEventId: eventId,
        message: 'Event replay initiated. Check webhook_replays table for status.',
      };
    } catch (error) {
      return {
        success: false,
        originalEventId: eventId,
        message: 'Error initiating replay',
        error: String(error),
      };
    }
  }

  /**
   * Get replay history for an event
   */
  async getReplayHistory(eventId: string) {
    const { data, error } = await this.supabase
      .from('webhook_replays' as any)
      .select('*')
      .eq('original_event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as unknown as WebhookEventRecord[]) || [];
  }

  /**
   * Export events as CSV for compliance/analysis
   */
  async exportEventsAsCSV(
    filters: {
      provider?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<string> {
    const { events } = await webhookEventLogger.getEvents({
      ...filters,
      limit: 10000, // Max export
    });

    if (events.length === 0) {
      return 'id,webhook_id,provider,event_type,status,latency_ms,created_at\n';
    }

    // CSV header
    const headers = [
      'id',
      'webhook_id',
      'provider',
      'event_type',
      'status',
      'latency_ms',
      'is_idempotent',
      'original_event_id',
      'error_message',
      'created_at',
    ];

    // CSV rows
    const rows = events.map(event => [
      event.id,
      event.webhook_id,
      event.provider,
      event.event_type,
      event.status,
      event.latency_ms || '',
      event.is_idempotent ? 'true' : 'false',
      event.original_event_id || '',
      event.error_message ? `"${event.error_message.replace(/"/g, '""')}"` : '',
      event.created_at,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Search events by various criteria
   */
  async searchEvents(query: {
    webhook_id?: string;
    provider?: string;
    event_type?: string;
    status?: string;
    error_contains?: string;
    created_after?: Date;
    created_before?: Date;
    limit?: number;
  }): Promise<WebhookEventRecord[]> {
    let q = this.supabase.from('webhook_events' as any).select('*');

    if (query.webhook_id) {
      q = q.eq('webhook_id', query.webhook_id);
    }
    if (query.provider) {
      q = q.eq('provider', query.provider);
    }
    if (query.event_type) {
      q = q.eq('event_type', query.event_type);
    }
    if (query.status) {
      q = q.eq('status', query.status);
    }
    if (query.error_contains) {
      q = q.ilike('error_message', `%${query.error_contains}%`);
    }
    if (query.created_after) {
      q = q.gte('created_at', query.created_after.toISOString());
    }
    if (query.created_before) {
      q = q.lte('created_at', query.created_before.toISOString());
    }

    const { data, error } = await q
      .order('created_at', { ascending: false })
      .limit(query.limit || 100);

    if (error) {
      throw error;
    }

    return (data as unknown as WebhookEventRecord[]) || [];
  }
}

// Export singleton instance
export const webhookEventInspector = new WebhookEventInspector();
