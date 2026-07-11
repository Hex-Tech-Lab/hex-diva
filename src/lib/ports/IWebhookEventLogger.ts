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
   * @param input - WebhookEventLogInput with event details, latency breakdowns, and optional metadata
   * @returns Unique event ID assigned to the logged event
   * @remarks Persists all fields to database; sensitive headers sanitized before storage
   */
  logEvent(input: WebhookEventLogInput): Promise<string>

  /**
   * Get event by ID with full record details
   * @param eventId - Unique event identifier
   * @returns WebhookEventRecord if found, null if event does not exist
   */
  getEventById(eventId: string): Promise<WebhookEventRecord | null>

  /**
   * Get events by webhook ID (paginated)
   * @param webhookId - Unique webhook identifier
   * @param limit - Maximum events to return (default varies by implementation)
   * @returns Array of WebhookEventRecord for the given webhook, ordered descending by created_at
   */
  getEventsByWebhookId(webhookId: string, limit?: number): Promise<WebhookEventRecord[]>

  /**
   * Find duplicate events with same payload hash (content-based deduplication)
   * @param payloadHash - SHA-256 hex hash of webhook payload
   * @param provider - Webhook provider identifier
   * @param excludeEventId - Optional event ID to exclude from results (typically the original)
   * @returns Array of WebhookEventRecord with matching payload_hash, ordered by created_at
   */
  findDuplicateEvents(
    payloadHash: string,
    provider: string,
    excludeEventId?: string
  ): Promise<WebhookEventRecord[]>

  /**
   * Get webhook events with flexible filtering and pagination
   * @param filters - Optional filter object (all fields optional)
   * @returns Object with events array and total count (for pagination UI)
   * @remarks Empty filters returns all events; respects limit/offset for large result sets
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
   * Get webhook metrics (latency percentiles, success rates, error counts)
   * @param filters - Optional filter by provider, eventType, and/or date range
   * @returns Aggregated metrics object with percentiles, rates, and counts
   * @remarks Computes p50, p95, p99 latencies and success/failure rates
   */
  getMetrics(filters?: {
    provider?: string
    eventType?: string
    startDate?: Date
    endDate?: Date
  }): Promise<any>

  /**
   * Get summary statistics for all webhooks in a time window
   * @param timeframeHours - Number of hours to look back (default 24)
   * @returns Aggregated stats: success rate, duplicate rate, failure rate, average latency, and issues
   * @remarks Used for dashboard and alert thresholds
   */
  getSummaryStats(timeframeHours?: number): Promise<any>
}
