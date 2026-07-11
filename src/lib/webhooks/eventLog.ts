/**
 * Webhook Event Logger
 * Provides comprehensive event logging infrastructure for webhook processing
 * Tracks: idempotency, performance, errors, and enables replay/forensics
 */

import { getSupabaseAdmin } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export interface WebhookEventLogInput {
  webhookId: string;
  provider: 'shopify' | 'uppromote' | 'orders' | 'process-order' | 'stripe';
  eventType: string;
  payloadHash: string;
  status: 'success' | 'failed' | 'duplicate' | 'skipped';
  latencyMs?: number;
  errorMessage?: string;
  errorCode?: string;
  originalEventId?: string;
  isIdempotent?: boolean;
  requestHeaders?: Record<string, string>;
  requestMetadata?: Record<string, unknown>;
  processingDurationMs?: number;
  signatureVerificationMs?: number;
  persistenceMs?: number;
  payloadSize?: number;
}

export interface WebhookEventRecord {
  id: string;
  webhook_id: string;
  provider: string;
  event_type: string;
  status: string;
  latency_ms: number | null;
  is_idempotent: boolean;
  original_event_id: string | null;
  error_message: string | null;
  error_code: string | null;
  payload_hash: string;
  payload_size: number | null;
  request_headers: Record<string, string> | null;
  request_metadata: Record<string, unknown> | null;
  processing_duration_ms: number | null;
  signature_verification_ms: number | null;
  persistence_ms: number | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
}

export class WebhookEventLogger {
  private supabaseInstance: ReturnType<typeof getSupabaseAdmin> | null = null;

  private get supabase(): ReturnType<typeof getSupabaseAdmin> {
    if (!this.supabaseInstance) {
      this.supabaseInstance = getSupabaseAdmin();
    }
    return this.supabaseInstance;
  }

  /**
   * Log a webhook event with comprehensive metrics
   */
  async logEvent(input: WebhookEventLogInput): Promise<string> {
    try {
      const {
        webhookId,
        provider,
        eventType,
        payloadHash,
        status,
        latencyMs,
        errorMessage,
        errorCode,
        originalEventId,
        isIdempotent,
        requestHeaders,
        requestMetadata,
        processingDurationMs,
        signatureVerificationMs,
        persistenceMs,
        payloadSize,
      } = input;

      // Prepare headers (sanitize sensitive data)
      const sanitizedHeaders = this.sanitizeHeaders(requestHeaders);

      // Call RPC function to insert event and trigger metrics update
      const { data, error } = await (this.supabase as any).rpc('log_webhook_event', {
        p_webhook_id: webhookId,
        p_provider: provider,
        p_event_type: eventType,
        p_status: status,
        p_payload_hash: payloadHash,
        p_latency_ms: latencyMs,
        p_error_message: errorMessage,
        p_original_event_id: originalEventId,
        p_is_idempotent: isIdempotent,
        p_request_headers: sanitizedHeaders,
        p_request_metadata: requestMetadata,
        p_processing_duration_ms: processingDurationMs,
        p_signature_verification_ms: signatureVerificationMs,
        p_persistence_ms: persistenceMs,
        p_payload_size: payloadSize,
      });

      if (error) {
        console.error('[WebhookEventLogger] RPC error:', error);
        Sentry.captureException(error, {
          contexts: {
            webhook: {
              webhookId,
              provider,
              eventType,
              status,
            },
          },
          tags: {
            webhook_provider: provider,
            webhook_status: status,
          },
        });
        throw error;
      }

      const eventId = data as string;

      // Track latency distribution in Sentry
      if (latencyMs) {
        this.trackLatencyMetric(provider, eventType, latencyMs);
      }

      // Alert if event failed
      if (status === 'failed') {
        Sentry.captureException(new Error(`Webhook processing failed: ${provider}/${eventType}`), {
          level: 'error',
          contexts: {
            webhook: {
              webhookId,
              provider,
              eventType,
              status,
              errorMessage,
              errorCode,
              latencyMs,
            },
          },
          tags: {
            webhook_provider: provider,
            webhook_event_type: eventType,
            webhook_status: 'failed',
            webhook_id: webhookId,
          },
        });
      }

      console.log(`[WebhookEventLogger] Event logged: ${eventId} (${provider}/${eventType})`);
      return eventId;
    } catch (error) {
      console.error('[WebhookEventLogger] Failed to log event:', error);
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          component: 'webhook_event_logger',
          operation: 'log_event',
        },
      });
      throw error;
    }
  }

  /**
   * Track latency metrics for monitoring SLAs
   */
  private trackLatencyMetric(provider: string, eventType: string, latencyMs: number): void {
    // Create Sentry breadcrumb for latency tracking
    Sentry.addBreadcrumb({
      category: 'webhook_latency',
      message: `${provider}/${eventType} latency`,
      level: 'info',
      data: {
        latency_ms: latencyMs,
        provider,
        event_type: eventType,
        sla_exceeded: latencyMs > 2000, // Alert if > 2s
      },
    });

    // Alert if latency exceeds SLA (2 seconds)
    if (latencyMs > 2000) {
      console.warn(
        `[WebhookEventLogger] SLA EXCEEDED: ${provider}/${eventType} took ${latencyMs}ms (SLA: 2000ms)`
      );

      Sentry.captureMessage(`Webhook latency SLA exceeded: ${provider}/${eventType} (${latencyMs}ms)`, {
        level: 'warning',
        contexts: {
          webhook_latency: {
            provider,
            event_type: eventType,
            latency_ms: latencyMs,
            sla_threshold_ms: 2000,
          },
        },
        tags: {
          webhook_provider: provider,
          webhook_event_type: eventType,
          sla_exceeded: 'true',
        },
      });
    }
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | null {
    if (!headers) return null;

    const sensitivePatterns = ['authorization', 'x-api-key', 'x-secret', 'token', 'password', 'hmac'];
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<WebhookEventRecord | null> {
    const { data, error } = await (this.supabase as any)
      .from('webhook_events' as any)
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[WebhookEventLogger] Error fetching event:', error);
      throw error;
    }

    return data as WebhookEventRecord;
  }

  /**
   * Get events by webhook ID
   */
  async getEventsByWebhookId(
    webhookId: string,
    limit: number = 10
  ): Promise<WebhookEventRecord[]> {
    const { data, error } = await this.supabase
      .from('webhook_events' as any)
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[WebhookEventLogger] Error fetching events:', error);
      throw error;
    }

    return (data as unknown as WebhookEventRecord[]) || [];
  }

  /**
   * Find duplicate events with same payload hash
   */
  async findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]> {
    let query = this.supabase
      .from('webhook_events' as any)
      .select('*')
      .eq('payload_hash', payloadHash)
      .eq('provider', provider);

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[WebhookEventLogger] Error finding duplicates:', error);
      throw error;
    }

    return (data as unknown as WebhookEventRecord[]) || [];
  }

  /**
   * Get webhook events with filters
   */
  async getEvents(
    filters: {
      provider?: string;
      status?: string;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ events: WebhookEventRecord[]; total: number }> {
    const {
      provider,
      status,
      eventType,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters;

    let query = this.supabase.from('webhook_events' as any).select('*', { count: 'exact' });

    if (provider) {
      query = query.eq('provider', provider);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[WebhookEventLogger] Error fetching events:', error);
      throw error;
    }

    return {
      events: (data as unknown as WebhookEventRecord[]) || [],
      total: count || 0,
    };
  }

  /**
   * Get webhook metrics for a time range
   */
  async getMetrics(
    filters: {
      provider?: string;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { provider, eventType, startDate, endDate } = filters;

    let query = this.supabase.from('webhook_event_metrics' as any).select('*');

    if (provider) {
      query = query.eq('provider', provider);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (startDate) {
      query = query.gte('hour_bucket', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('hour_bucket', endDate.toISOString());
    }

    const { data, error } = await query.order('hour_bucket', { ascending: false });

    if (error) {
      console.error('[WebhookEventLogger] Error fetching metrics:', error);
      throw error;
    }

    return (data as unknown as WebhookEventRecord[]) || [];
  }

  /**
   * Get summary statistics for webhooks
   */
  async getSummaryStats(timeframeHours: number = 24) {
    const startDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const { data, error } = await this.supabase
      .from('webhook_events' as any)
      .select('provider, status, latency_ms')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('[WebhookEventLogger] Error fetching summary stats:', error);
      throw error;
    }

    const events = (data as unknown as WebhookEventRecord[]) || [];

    // Calculate statistics
    const stats = {
      totalEvents: events.length,
      successfulEvents: events.filter(e => e.status === 'success').length,
      failedEvents: events.filter(e => e.status === 'failed').length,
      duplicateEvents: events.filter(e => e.status === 'duplicate').length,
      successRate: events.length ? (
        (events.filter(e => e.status === 'success').length / events.length) * 100
      ).toFixed(2) + '%' : 'N/A',
      averageLatency: events.length ? (
        events.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / events.length
      ).toFixed(0) + 'ms' : 'N/A',
      byProvider: this.groupByProvider(events),
    };

    return stats;
  }

  /**
   * Group statistics by provider
   */
  private groupByProvider(events: any[]) {
    const grouped: Record<string, any> = {};

    for (const event of events) {
      if (!grouped[event.provider]) {
        grouped[event.provider] = {
          total: 0,
          success: 0,
          failed: 0,
          duplicate: 0,
          latencies: [],
        };
      }

      grouped[event.provider].total++;
      grouped[event.provider][event.status]++;
      if (event.latency_ms) {
        grouped[event.provider].latencies.push(event.latency_ms);
      }
    }

    // Calculate percentiles
    for (const provider in grouped) {
      const stats = grouped[provider];
      if (stats.latencies.length > 0) {
        stats.latencies.sort((a: number, b: number) => a - b);
        const len = stats.latencies.length;
        stats.p50 = stats.latencies[Math.floor(len * 0.5)];
        stats.p95 = stats.latencies[Math.floor(len * 0.95)];
        stats.p99 = stats.latencies[Math.floor(len * 0.99)];
        stats.average = (
          stats.latencies.reduce((a: number, b: number) => a + b, 0) / len
        ).toFixed(0);
      }
      delete stats.latencies; // Remove raw latencies
    }

    return grouped;
  }
}

// Export singleton instance
export const webhookEventLogger = new WebhookEventLogger();
