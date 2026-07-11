/**
 * Webhook Event Logger Adapter
 * Implements IWebhookEventLogger port using Supabase
 * Concrete implementation of domain port for event persistence
 */

import type {
  IWebhookEventLogger,
  WebhookEventLogInput,
  WebhookEventRecord,
} from '@/lib/ports'
import * as Sentry from '@sentry/nextjs'

/**
 * Supabase-backed implementation of IWebhookEventLogger
 * Logs webhook events with comprehensive metrics for auditing and forensics
 */
export class WebhookEventLoggerAdapter implements IWebhookEventLogger {
  /**
   * Log a webhook event with comprehensive metrics
   * @param input - WebhookEventLogInput with event details, latency breakdowns, and optional metadata
   * @returns Unique event ID assigned to the logged event by the RPC function
   * @throws If RPC call fails or database error occurs
   * @remarks Calls log_webhook_event RPC function to insert event and trigger metrics aggregation
   */
  async logEvent(input: WebhookEventLogInput): Promise<string> {
    try {
      const { supabaseAdmin } = await import('@/lib/db')

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
      } = input

      // Prepare headers (sanitize sensitive data)
      const sanitizedHeaders = this.sanitizeHeaders(requestHeaders)

      // Call RPC function to insert event and trigger metrics update
      const { data, error } = await (supabaseAdmin as any).rpc('log_webhook_event', {
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
      })

      if (error) {
        console.error('[WebhookEventLoggerAdapter] RPC error:', error)
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
        })
        throw error
      }

      const eventId = data as string

      // Track latency distribution in Sentry
      if (latencyMs) {
        this.trackLatencyMetric(provider, eventType, latencyMs)
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
        })
      }

      console.log(`[WebhookEventLoggerAdapter] Event logged: ${eventId} (${provider}/${eventType})`)
      return eventId
    } catch (error) {
      console.error('[WebhookEventLoggerAdapter] Failed to log event:', error)
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          component: 'webhook_event_logger',
          operation: 'log_event',
        },
      })
      throw error
    }
  }

  /**
   * Get event by ID with full record details
   * @param eventId - Unique event identifier
   * @returns WebhookEventRecord if found, null if event does not exist
   * @remarks Stub implementation; awaits webhook_events table availability
   */
  async getEventById(eventId: string): Promise<WebhookEventRecord | null> {
    console.log('[WebhookEventLoggerAdapter] getEventById stub:', eventId)
    return null
  }

  /**
   * Get events by webhook ID (paginated)
   * @param webhookId - Unique webhook identifier
   * @param limit - Maximum events to return (default 10)
   * @returns Array of WebhookEventRecord for the given webhook
   * @remarks Stub implementation; awaits webhook_events table availability
   */
  async getEventsByWebhookId(
    webhookId: string,
    limit: number = 10
  ): Promise<WebhookEventRecord[]> {
    console.log('[WebhookEventLoggerAdapter] getEventsByWebhookId stub:', webhookId, limit)
    return []
  }

  /**
   * Find duplicate events with same payload hash (content-based deduplication)
   * @param payloadHash - SHA-256 hex hash of webhook payload
   * @param provider - Webhook provider identifier
   * @param excludeEventId - Optional event ID to exclude from results (typically the original)
   * @returns Array of WebhookEventRecord with matching payload_hash
   * @remarks Stub implementation; awaits webhook_events table availability
   */
  async findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]> {
    console.log('[WebhookEventLoggerAdapter] findDuplicateEvents stub:', payloadHash, provider, excludeEventId)
    return []
  }

  /**
   * Get webhook events with flexible filtering and pagination
   * @param filters - Optional filter object (all fields optional)
   * @returns Object with events array and total count (for pagination UI)
   * @remarks Stub implementation; awaits webhook_events table availability
   */
  async getEvents(filters?: {
    provider?: string
    status?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<{ events: WebhookEventRecord[]; total: number }> {
    console.log('[WebhookEventLoggerAdapter] getEvents stub:', filters)
    return {
      events: [],
      total: 0,
    }
  }

  /**
   * Get webhook metrics (latency percentiles, success rates, error counts)
   * @param filters - Optional filter by provider, eventType, and/or date range
   * @returns Aggregated metrics object with percentiles, rates, and counts
   * @remarks Stub implementation; awaits webhook_event_metrics table availability
   */
  async getMetrics(filters?: {
    provider?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
  }): Promise<any> {
    console.log('[WebhookEventLoggerAdapter] getMetrics stub:', filters)
    return []
  }

  /**
   * Get summary statistics for all webhooks in a time window
   * @param timeframeHours - Number of hours to look back (default 24)
   * @returns Aggregated stats: success rate, duplicate rate, failure rate, average latency, and issues
   * @remarks Stub implementation; queries empty events array
   */
  async getSummaryStats(timeframeHours: number = 24): Promise<any> {
    console.log('[WebhookEventLoggerAdapter] getSummaryStats stub:', timeframeHours)
    const events: any[] = []

    // Calculate statistics
    const stats = {
      totalEvents: events.length,
      successfulEvents: events.filter((e) => e.status === 'success').length,
      failedEvents: events.filter((e) => e.status === 'failed').length,
      duplicateEvents: events.filter((e) => e.status === 'duplicate').length,
      successRate:
        events.length ?
          (((events.filter((e) => e.status === 'success').length / events.length) * 100).toFixed(
            2
          ) + '%')
        : 'N/A',
      averageLatency:
        events.length ?
          (
            (events.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / events.length).toFixed(0) +
            'ms'
          )
        : 'N/A',
      byProvider: this.groupByProvider(events),
    }

    return stats
  }

  /**
   * Track latency metrics in Sentry and alert if SLA exceeded
   * @param provider - Webhook provider identifier
   * @param eventType - Webhook event type
   * @param latencyMs - Latency in milliseconds
   * @remarks Captures breadcrumb and sends alert if latency > 2000ms SLA threshold
   */
  private trackLatencyMetric(provider: string, eventType: string, latencyMs: number): void {
    Sentry.addBreadcrumb({
      category: 'webhook_latency',
      message: `${provider}/${eventType} latency`,
      level: 'info',
      data: {
        latency_ms: latencyMs,
        provider,
        event_type: eventType,
        sla_exceeded: latencyMs > 2000,
      },
    })

    if (latencyMs > 2000) {
      console.warn(
        `[WebhookEventLoggerAdapter] SLA EXCEEDED: ${provider}/${eventType} took ${latencyMs}ms (SLA: 2000ms)`
      )

      Sentry.captureMessage(
        `Webhook latency SLA exceeded: ${provider}/${eventType} (${latencyMs}ms)`,
        {
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
        }
      )
    }
  }

  /**
   * Sanitize headers to remove sensitive information before persistence
   * @param headers - Optional request headers object
   * @returns Headers with sensitive values redacted, null if no headers provided
   * @remarks Masks authorization, api-key, token, password, and hmac headers
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | null {
    if (!headers) return null

    const sensitivePatterns = ['authorization', 'x-api-key', 'x-secret', 'token', 'password', 'hmac']
    const sanitized: Record<string, string> = {}

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase()
      if (sensitivePatterns.some((pattern) => lowerKey.includes(pattern))) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Group webhook events by provider and compute latency percentiles
   * @param events - Array of webhook event objects
   * @returns Grouped stats by provider: total, status counts, and latency percentiles (p50, p95, p99)
   */
  private groupByProvider(events: any[]): Record<string, any> {
    const grouped: Record<string, any> = {}

    for (const event of events) {
      if (!grouped[event.provider]) {
        grouped[event.provider] = {
          total: 0,
          success: 0,
          failed: 0,
          duplicate: 0,
          latencies: [],
        }
      }

      grouped[event.provider].total++
      grouped[event.provider][event.status]++
      if (event.latency_ms) {
        grouped[event.provider].latencies.push(event.latency_ms)
      }
    }

    // Calculate percentiles
    for (const provider in grouped) {
      const stats = grouped[provider]
      if (stats.latencies.length > 0) {
        stats.latencies.sort((a: number, b: number) => a - b)
        const len = stats.latencies.length
        stats.p50 = stats.latencies[Math.floor(len * 0.5)]
        stats.p95 = stats.latencies[Math.floor(len * 0.95)]
        stats.p99 = stats.latencies[Math.floor(len * 0.99)]
        stats.average = (
          stats.latencies.reduce((a: number, b: number) => a + b, 0) / len
        ).toFixed(0)
      }
      delete stats.latencies
    }

    return grouped
  }
}
