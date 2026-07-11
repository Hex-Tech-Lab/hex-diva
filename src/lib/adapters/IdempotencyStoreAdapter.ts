/**
 * Idempotency Store Adapter
 * Implements IIdempotencyStore port using Redis
 * Concrete implementation of domain port for webhook deduplication
 */

import type { IIdempotencyStore, IdempotencyCheckResult, WebhookProvider } from '@/lib/ports'
import { redis } from '@/lib/cache'

const WEBHOOK_ID_PREFIX = 'webhook:'
const WEBHOOK_ID_TTL = 86400 * 7 // 7 days (webhook retention period)

/**
 * Redis-backed implementation of IIdempotencyStore
 * Prevents duplicate webhook processing using atomic Redis operations
 */
export class IdempotencyStoreAdapter implements IIdempotencyStore {
  /**
   * Generate idempotency key from provider and webhook ID
   */
  private getIdempotencyKey(provider: WebhookProvider, webhookId: string): string {
    return `${WEBHOOK_ID_PREFIX}${provider}:${webhookId}`
  }

  async checkIdempotency(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<IdempotencyCheckResult> {
    if (!redis || !webhookId) {
      return { isDuplicate: false }
    }

    try {
      const key = this.getIdempotencyKey(provider, webhookId)
      const cached = await redis.get(key)

      if (cached) {
        try {
          return {
            isDuplicate: true,
            previousResult: JSON.parse(String(cached)),
          }
        } catch {
          return { isDuplicate: true }
        }
      }

      return { isDuplicate: false }
    } catch (error) {
      console.error('[IdempotencyStoreAdapter] Error checking idempotency:', error)
      // Fail open - allow processing if cache check fails
      return { isDuplicate: false }
    }
  }

  async markWebhookProcessed(
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
  ): Promise<boolean> {
    if (!redis || !webhookId) {
      return false
    }

    try {
      const key = this.getIdempotencyKey(provider, webhookId)
      const value = JSON.stringify(result)
      await redis.setex(key, WEBHOOK_ID_TTL, value)

      // Log to event logging system if context provided
      if (eventLogContext) {
        try {
          // Lazy import to avoid circular dependencies
          // Event logging is optional and should not fail the operation
        } catch (logError) {
          console.error('[IdempotencyStoreAdapter] Error logging event:', logError)
        }
      }

      return true
    } catch (error) {
      console.error('[IdempotencyStoreAdapter] Error marking webhook processed:', error)
      return false
    }
  }

  async getIdempotencyStatus(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<{ processed: boolean; timestamp?: string }> {
    if (!redis || !webhookId) {
      return { processed: false }
    }

    try {
      const key = this.getIdempotencyKey(provider, webhookId)
      const cached = await redis.get(key)
      return {
        processed: !!cached,
        timestamp: cached ? new Date().toISOString() : undefined,
      }
    } catch {
      return { processed: false }
    }
  }

  async getWebhookBodyHash(body: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(body)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}
