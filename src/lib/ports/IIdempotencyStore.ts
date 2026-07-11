/**
 * Idempotency Store Port
 * Abstracts storage for webhook idempotency checks
 * Allows domain logic to remain independent of concrete storage (Redis, etc.)
 */

export interface IdempotencyCheckResult {
  isDuplicate: boolean
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
   */
  checkIdempotency(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<IdempotencyCheckResult>

  /**
   * Mark webhook as processed and cache result for deduplication
   * Only call for successful terminal outcomes
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
   * Get idempotency status from cache
   */
  getIdempotencyStatus(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<{ processed: boolean; timestamp?: string }>

  /**
   * Get webhook body hash for replay detection
   */
  getWebhookBodyHash(body: string): Promise<string>
}
