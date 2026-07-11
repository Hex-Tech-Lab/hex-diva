/**
 * Webhook Event Logger Port
 * Abstracts logging of webhook events to persistent storage
 */

export interface WebhookEventLogInput {
  webhookId: string
  provider: 'shopify' | 'uppromote' | 'orders' | 'process-order' | 'stripe'
  eventType: string
  payloadHash: string
  status: 'success' | 'failed' | 'duplicate' | 'skipped'
  latencyMs?: number
  errorMessage?: string
  errorCode?: string
  originalEventId?: string
  isIdempotent?: boolean
  requestHeaders?: Record<string, string>
  requestMetadata?: Record<string, unknown>
  processingDurationMs?: number
  signatureVerificationMs?: number
  persistenceMs?: number
  payloadSize?: number
}

export interface WebhookEventRecord {
  id: string
  webhook_id: string
  provider: string
  event_type: string
  status: string
  latency_ms: number | null
  is_idempotent: boolean
  original_event_id: string | null
  error_message: string | null
  error_code: string | null
  payload_hash: string
  payload_size: number | null
  request_headers: Record<string, string> | null
  request_metadata: Record<string, unknown> | null
  processing_duration_ms: number | null
  signature_verification_ms: number | null
  persistence_ms: number | null
  received_at: string
  processed_at: string | null
  created_at: string
  retry_count: number
  max_retries: number
  next_retry_at: string | null
}

export interface IWebhookEventLogger {
  /**
   * Log a webhook event with comprehensive metrics
   */
  logEvent(input: WebhookEventLogInput): Promise<string>

  /**
   * Get event by ID
   */
  getEventById(eventId: string): Promise<WebhookEventRecord | null>

  /**
   * Get events by webhook ID
   */
  getEventsByWebhookId(webhookId: string, limit?: number): Promise<WebhookEventRecord[]>

  /**
   * Find duplicate events with same payload hash
   */
  findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]>

  /**
   * Get webhook events with filters
   */
  getEvents(filters?: {
    provider?: string
    status?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<{ events: WebhookEventRecord[]; total: number }>

  /**
   * Get webhook metrics for a time range
   */
  getMetrics(filters?: {
    provider?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
  }): Promise<any>

  /**
   * Get summary statistics for webhooks
   */
  getSummaryStats(timeframeHours?: number): Promise<any>
}
