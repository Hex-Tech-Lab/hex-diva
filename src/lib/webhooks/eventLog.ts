/**
 * Webhook Event Logger
 * Provides comprehensive event logging infrastructure for webhook processing
 * Tracks: idempotency, performance, errors, and enables replay/forensics
 * Depends on injected IWebhookEventLogger port for persistence
 */

import * as Sentry from '@sentry/nextjs';
import type { IWebhookEventLogger as IEventLoggerPort } from '@/lib/ports';

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
  constructor(private logger: IEventLoggerPort) {}


  /**
   * Log a webhook event with comprehensive metrics
   * @param input - WebhookEventLogInput with event details, latency breakdowns, and optional metadata
   * @returns Unique event ID assigned to the logged event
   * @throws If logging fails; caught and reported to Sentry
   * @remarks Sanitizes sensitive headers; tracks failed events and SLA violations
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

      // Delegate to injected logger port
      const eventId = await this.logger.logEvent({
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
        requestHeaders: sanitizedHeaders || undefined,
        requestMetadata,
        processingDurationMs,
        signatureVerificationMs,
        persistenceMs,
        payloadSize,
      });

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
   * Track latency metrics for monitoring SLAs in Sentry
   * @param provider - Webhook provider identifier
   * @param eventType - Webhook event type
   * @param latencyMs - Latency in milliseconds
   * @remarks Captures breadcrumb and sends alert if latency > 2000ms SLA threshold
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
   * Sanitize headers to remove sensitive information before persistence
   * @param headers - Optional request headers object
   * @returns Headers with sensitive values redacted, null if no headers provided
   * @remarks Masks authorization, api-key, token, password, and hmac headers for security
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
   * Get event by ID with full record details
   * @param eventId - Unique event identifier
   * @returns WebhookEventRecord if found, null if event does not exist
   */
  async getEventById(eventId: string): Promise<WebhookEventRecord | null> {
    return this.logger.getEventById(eventId);
  }

  /**
   * Get events by webhook ID (paginated)
   * @param webhookId - Unique webhook identifier
   * @param limit - Maximum events to return (default 10)
   * @returns Array of WebhookEventRecord for the given webhook, ordered descending by created_at
   */
  async getEventsByWebhookId(
    webhookId: string,
    limit: number = 10
  ): Promise<WebhookEventRecord[]> {
    return this.logger.getEventsByWebhookId(webhookId, limit);
  }

  /**
   * Find duplicate events with same payload hash (content-based deduplication)
   * @param payloadHash - SHA-256 hex hash of webhook payload
   * @param provider - Webhook provider identifier
   * @param excludeEventId - Optional event ID to exclude from results (typically the original)
   * @returns Array of WebhookEventRecord with matching payload_hash
   */
  async findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]> {
    return this.logger.findDuplicateEvents(payloadHash, provider, excludeEventId);
  }

  /**
   * Get webhook events with flexible filtering and pagination
   * @param filters - Optional filter object (all fields optional)
   * @returns Object with events array and total count (for pagination UI)
   * @remarks Empty filters returns all events; respects limit/offset for large result sets
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
    return this.logger.getEvents(filters);
  }

  /**
   * Get webhook metrics (latency percentiles, success rates, error counts)
   * @param filters - Optional filter by provider, eventType, and/or date range
   * @returns Aggregated metrics object with percentiles, rates, and counts
   * @remarks Computes p50, p95, p99 latencies and success/failure rates
   */
  async getMetrics(
    filters: {
      provider?: string;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    return this.logger.getMetrics(filters);
  }

  /**
   * Get summary statistics for all webhooks in a time window
   * @param timeframeHours - Number of hours to look back (default 24)
   * @returns Aggregated stats: success rate, duplicate rate, failure rate, average latency, and issues
   * @remarks Used for dashboard and alert thresholds
   */
  async getSummaryStats(timeframeHours: number = 24) {
    return this.logger.getSummaryStats(timeframeHours);
  }

}

/**
 * Backward compatibility singleton
 * Maintains existing API for code not yet migrated
 */
let loggerInstance: WebhookEventLogger | null = null

async function getLoggerInstance(): Promise<WebhookEventLogger> {
  if (!loggerInstance) {
    const { WebhookEventLoggerAdapter } = await import('@/lib/adapters/WebhookEventLoggerAdapter')
    const adapter = new WebhookEventLoggerAdapter()
    loggerInstance = new WebhookEventLogger(adapter)
  }
  return loggerInstance
}

/**
 * Create a WebhookEventLogger instance using the default adapter
 * @returns WebhookEventLogger instance (singleton)
 * @remarks Lazy-loads adapter; use WebhookEventLogger class for DI-enabled version
 */
export async function createWebhookEventLogger(): Promise<WebhookEventLogger> {
  return getLoggerInstance()
}

/**
 * Singleton export for convenience (backward compatibility)
 * Provides lazy-loaded webhook event logger instance with all logging methods
 * @remarks Use WebhookEventLogger class for DI-enabled version or dependency injection
 */
export const webhookEventLogger = {
  /**
   * Log a webhook event with comprehensive metrics
   * @param input - WebhookEventLogInput with event details
   * @returns Unique event ID assigned to the logged event
   */
  async logEvent(input: any): Promise<string> {
    const logger = await getLoggerInstance()
    return logger.logEvent(input)
  },
  /**
   * Get event by ID
   * @param eventId - Unique event identifier
   * @returns WebhookEventRecord or null if not found
   */
  async getEventById(eventId: string) {
    const logger = await getLoggerInstance()
    return logger.getEventById(eventId)
  },
  /**
   * Get events by webhook ID
   * @param webhookId - Unique webhook identifier
   * @param limit - Maximum events to return
   * @returns Array of WebhookEventRecord
   */
  async getEventsByWebhookId(webhookId: string, limit?: number) {
    const logger = await getLoggerInstance()
    return logger.getEventsByWebhookId(webhookId, limit)
  },
  /**
   * Find duplicate events with same payload hash
   * @param payloadHash - SHA-256 hex hash of webhook payload
   * @param provider - Webhook provider identifier
   * @param excludeEventId - Optional event ID to exclude from results
   * @returns Array of WebhookEventRecord with matching payload_hash
   */
  async findDuplicateEvents(payloadHash: string, provider: string, excludeEventId?: string) {
    const logger = await getLoggerInstance()
    return logger.findDuplicateEvents(payloadHash, provider, excludeEventId)
  },
  /**
   * Get webhook events with filters
   * @param filters - Optional filter object
   * @returns Object with events array and total count
   */
  async getEvents(filters?: any) {
    const logger = await getLoggerInstance()
    return logger.getEvents(filters)
  },
  /**
   * Get webhook metrics for a time range
   * @param filters - Optional filter by provider, eventType, and/or date range
   * @returns Aggregated metrics object
   */
  async getMetrics(filters?: any) {
    const logger = await getLoggerInstance()
    return logger.getMetrics(filters)
  },
  /**
   * Get summary statistics for webhooks
   * @param timeframeHours - Number of hours to look back (default 24)
   * @returns Aggregated stats with success rate, duplicate rate, failure rate, and issues
   */
  async getSummaryStats(timeframeHours?: number) {
    const logger = await getLoggerInstance()
    return logger.getSummaryStats(timeframeHours)
  },
};
