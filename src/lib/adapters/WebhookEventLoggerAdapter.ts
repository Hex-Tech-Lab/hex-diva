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

  async getEventById(eventId: string): Promise<WebhookEventRecord | null> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data, error } = await (supabaseAdmin as any)
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[WebhookEventLoggerAdapter] Error fetching event:', error)
      throw error
    }

    return data as WebhookEventRecord
  }

  async getEventsByWebhookId(
    webhookId: string,
    limit: number = 10
  ): Promise<WebhookEventRecord[]> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[WebhookEventLoggerAdapter] Error fetching events:', error)
      throw error
    }

    return (data as unknown as WebhookEventRecord[]) || []
  }

  async findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]> {
    const { supabaseAdmin } = await import('@/lib/db')

    let query = supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('payload_hash', payloadHash)
      .eq('provider', provider)

    if (excludeEventId) {
      query = query.neq('id', excludeEventId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[WebhookEventLoggerAdapter] Error finding duplicates:', error)
      throw error
    }

    return (data as unknown as WebhookEventRecord[]) || []
  }

  async getEvents(filters?: {
    provider?: string
    status?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<{ events: WebhookEventRecord[]; total: number }> {
    const { supabaseAdmin } = await import('@/lib/db')

    const {
      provider,
      status,
      eventType,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters || {}

    let query = supabaseAdmin
      .from('webhook_events')
      .select('*', { count: 'exact' })

    if (provider) {
      query = query.eq('provider', provider)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[WebhookEventLoggerAdapter] Error fetching events:', error)
      throw error
    }

    return {
      events: (data as unknown as WebhookEventRecord[]) || [],
      total: count || 0,
    }
  }

  async getMetrics(filters?: {
    provider?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
  }): Promise<any> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { provider, eventType, startDate, endDate } = filters || {}

    let query = supabaseAdmin.from('webhook_event_metrics').select('*')

    if (provider) {
      query = query.eq('provider', provider)
    }
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (startDate) {
      query = query.gte('hour_bucket', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('hour_bucket', endDate.toISOString())
    }

    const { data, error } = await query.order('hour_bucket', { ascending: false })

    if (error) {
      console.error('[WebhookEventLoggerAdapter] Error fetching metrics:', error)
      throw error
    }

    return data || []
  }

  async getSummaryStats(timeframeHours: number = 24): Promise<any> {
    const { supabaseAdmin } = await import('@/lib/db')

    const startDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('provider, status, latency_ms')
      .gte('created_at', startDate.toISOString())

    if (error) {
      console.error('[WebhookEventLoggerAdapter] Error fetching summary stats:', error)
      throw error
    }

    const events = (data as unknown as WebhookEventRecord[]) || []

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
