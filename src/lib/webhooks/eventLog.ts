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
    return this.logger.getEventById(eventId);
  }

  /**
   * Get events by webhook ID
   */
  async getEventsByWebhookId(
    webhookId: string,
    limit: number = 10
  ): Promise<WebhookEventRecord[]> {
    return this.logger.getEventsByWebhookId(webhookId, limit);
  }

  /**
   * Find duplicate events with same payload hash
   */
  async findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]> {
    return this.logger.findDuplicateEvents(payloadHash, provider, excludeEventId);
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
    return this.logger.getEvents(filters);
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
    return this.logger.getMetrics(filters);
  }

  /**
   * Get summary statistics for webhooks
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

export async function createWebhookEventLogger(): Promise<WebhookEventLogger> {
  return getLoggerInstance()
}

// Singleton export for convenience
export const webhookEventLogger = {
  async logEvent(input: any): Promise<string> {
    const logger = await getLoggerInstance()
    return logger.logEvent(input)
  },
  async getEventById(eventId: string) {
    const logger = await getLoggerInstance()
    return logger.getEventById(eventId)
  },
  async getEventsByWebhookId(webhookId: string, limit?: number) {
    const logger = await getLoggerInstance()
    return logger.getEventsByWebhookId(webhookId, limit)
  },
  async findDuplicateEvents(payloadHash: string, provider: string, excludeEventId?: string) {
    const logger = await getLoggerInstance()
    return logger.findDuplicateEvents(payloadHash, provider, excludeEventId)
  },
  async getEvents(filters?: any) {
    const logger = await getLoggerInstance()
    return logger.getEvents(filters)
  },
  async getMetrics(filters?: any) {
    const logger = await getLoggerInstance()
    return logger.getMetrics(filters)
  },
  async getSummaryStats(timeframeHours?: number) {
    const logger = await getLoggerInstance()
    return logger.getSummaryStats(timeframeHours)
  },
};
