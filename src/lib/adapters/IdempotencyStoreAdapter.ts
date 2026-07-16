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

      // Use atomic setnx via Upstash Redis set with { nx: true, ex: 60 }
      // This reserves the key with a short TTL (60s) to guard against crash-failures blocking retries.
      // The stored value doubles as the owner token: it embeds a crypto.randomUUID(), making it
      // unique per reservation, and release does an atomic compare-and-delete on the full value
      // (Law #1: atomic Redis operations only — a blind DEL could drop another owner's key).
      const ownerToken = JSON.stringify({
        status: 'processing',
        token: crypto.randomUUID(),
        processedAt: new Date().toISOString(),
      })

      const setSuccess = await redis.set(key, ownerToken, { nx: true, ex: 60 })
      
      if (!setSuccess) {
        // Key already exists. Fetch it to check status / return cached result
        const cached = await redis.get(key)
        if (cached) {
          try {
            const parsed = JSON.parse(String(cached))
            if (parsed.status === 'processing') {
              throw new Error('Webhook processing in progress')
            }
            return {
              isDuplicate: true,
              previousResult: {
                success: parsed.success ?? true,
                message: parsed.message ?? 'Webhook already processed',
                data: parsed.data,
              },
            }
          } catch (e) {
            if (e instanceof Error && e.message === 'Webhook processing in progress') {
              throw e
            }
            return { isDuplicate: true }
          }
        }
        return { isDuplicate: true }
      }

      // New reservation created — hand the owner token to the caller for scoped release
      return { isDuplicate: false, ownerToken }
    } catch (error) {
      if (error instanceof Error && error.message === 'Webhook processing in progress') {
        throw error
      }
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
      const value = JSON.stringify({
        ...result,
        status: 'completed',
        processedAt: new Date().toISOString(),
      })
      
      // Update the pre-reserved key with the finalized status, result details, and long TTL (7 days)
      const setSuccess = await redis.setex(key, WEBHOOK_ID_TTL, value)
      if (!setSuccess) {
        console.warn('[IdempotencyStoreAdapter] Failed to mark webhook processed in Redis')
      }

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

      let timestamp: string | undefined
      if (cached) {
        try {
          const parsed = JSON.parse(String(cached))
          timestamp = parsed.processedAt
        } catch (parseError) {
          console.warn('[IdempotencyStoreAdapter] Failed to parse cached JSON status:', parseError)
        }
      }

      return {
        processed: !!cached,
        timestamp,
      }
    } catch (getStatusError) {
      console.error('[IdempotencyStoreAdapter] Error getting status:', getStatusError)
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

  async releaseIdempotencyKey(
    provider: WebhookProvider,
    webhookId: string,
    ownerToken?: string
  ): Promise<boolean> {
    if (!redis || !webhookId) {
      return false
    }

    // Never blind-delete: without proof of ownership a DEL could remove a key held by a
    // concurrent request or a COMPLETED record, re-opening the door to duplicate processing.
    // The 60s processing TTL guarantees a stuck reservation expires on its own.
    if (!ownerToken) {
      console.warn(
        `[IdempotencyStoreAdapter] releaseIdempotencyKey called without owner token for ${provider}:${webhookId} — skipping delete (no-op)`
      )
      return false
    }

    try {
      const key = this.getIdempotencyKey(provider, webhookId)
      // Atomic compare-and-delete (Upstash Lua): only the reservation owner may release.
      // If the key was overwritten by markWebhookProcessed (completed record) or re-reserved
      // by another request, the values differ and nothing is deleted.
      const deleted = await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        [key],
        [ownerToken]
      )
      return Number(deleted) === 1
    } catch (error) {
      console.error('[IdempotencyStoreAdapter] Error releasing idempotency key:', error)
      return false
    }
  }
}
