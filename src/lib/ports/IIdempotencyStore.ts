/**
 * Idempotency Store Port
 * Abstracts storage for webhook idempotency checks
 * Allows domain logic to remain independent of concrete storage (Redis, etc.)
 */

export interface IdempotencyCheckResult {
  isDuplicate: boolean
  /**
   * Owner token proving this caller created the processing reservation.
   * Present only when isDuplicate=false and a new reservation was written.
   * Must be passed to releaseIdempotencyKey for compare-and-delete release.
   */
  ownerToken?: string
  previousResult?: {
    success: boolean
    message: string
    data?: unknown
  }
}

export type WebhookProvider = 'shopify' | 'uppromote' | 'orders' | 'process-order' | 'stripe'

export interface IIdempotencyStore {
  /**
   * Check if webhook has already been processed (idempotency gate)
   * @param provider - Webhook provider identifier (shopify, uppromote, orders, stripe, etc.)
   * @param webhookId - Unique webhook identifier from provider headers
   * @returns IdempotencyCheckResult with isDuplicate flag; if duplicate, includes cached previousResult
   * @remarks Enables fail-open: returns isDuplicate=false if cache unavailable, allowing reprocessing
   */
  checkIdempotency(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<IdempotencyCheckResult>

  /**
   * Mark webhook as processed and cache result for deduplication
   * Only call for successful terminal outcomes; failed attempts bypass caching to allow retries
   * @param provider - Webhook provider identifier
   * @param webhookId - Unique webhook identifier
   * @param result - Processing result object { success, message, data? } to persist in cache
   * @param eventLogContext - Optional event logging context with latency breakdowns and metadata
   * @returns True if caching succeeded, false if Redis unavailable or error; uses fail-open pattern
   * @remarks 7-day TTL applied; timestamp auto-added at cache time for audit trail
   */
  markWebhookProcessed(
    provider: WebhookProvider,
    webhookId: string,
    result: { success: boolean; message: string; data?: unknown },
    eventLogContext?: {
      eventType?: string
      payloadHash?: string
      latencyMs?: number
      processingDurationMs?: number
      signatureVerificationMs?: number
      persistenceMs?: number
      payloadSize?: number
    }
  ): Promise<boolean>

  /**
   * Get idempotency status from cache for audit and forensics
   * @param provider - Webhook provider identifier
   * @param webhookId - Unique webhook identifier
   * @returns Object with processed flag and optional processedAt timestamp (ISO string)
   * @remarks Returns cached timestamp when available; null timestamp means never cached
   */
  getIdempotencyStatus(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<{ processed: boolean; timestamp?: string }>

  /**
   * Get webhook body hash for replay detection and duplicate analysis
   * @param body - Raw webhook body as string
   * @returns SHA-256 hex hash of the body for content-based deduplication
   * @remarks Used to detect bit-identical replays; constant-time comparison recommended
   */
  getWebhookBodyHash(body: string): Promise<string>

  /**
   * Release idempotency lock/key if processing failed, so retries can occur
   * @param provider - Webhook provider identifier
   * @param webhookId - Unique webhook identifier
   * @param ownerToken - Token returned by checkIdempotency when the reservation was created;
   *                     release is an atomic compare-and-delete on this token. Without a token
   *                     the release is a no-op (never blind-delete a key another owner may hold).
   * @returns True if successfully released, false otherwise
   */
  releaseIdempotencyKey(
    provider: WebhookProvider,
    webhookId: string,
    ownerToken?: string
  ): Promise<boolean>
}
