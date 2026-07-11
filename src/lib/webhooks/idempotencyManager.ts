/**
 * Webhook Idempotency Manager
 * Prevents duplicate webhook processing by tracking webhook IDs
 * Abstracted via IIdempotencyStore port for dependency injection
 */

import type { IIdempotencyStore, IdempotencyCheckResult, WebhookProvider } from '@/lib/ports'

/**
 * IdempotencyManager wraps the injected store
 * Provides convenient methods without direct dependency on Redis
 */
export class IdempotencyManager {
  constructor(private store: IIdempotencyStore) {}

  /**
   * Check if webhook has already been processed (idempotency gate)
   * @param provider - Webhook provider name (shopify, uppromote, orders, etc.)
   * @param webhookId - Unique webhook identifier from provider headers
   * @returns IdempotencyCheckResult with isDuplicate flag and previous result if cached
   * @remarks Only successful webhooks should be cached via markWebhookProcessed; failed attempts bypass caching to allow retries
   */
  async checkIdempotency(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<IdempotencyCheckResult> {
    return this.store.checkIdempotency(provider, webhookId);
  }

  /**
   * Mark webhook as processed and cache result for deduplication (7-day TTL)
   *
   * CRITICAL: Only call this for successful terminal outcomes. Failed webhooks should NOT be cached
   * to allow provider retries to be reprocessed on subsequent attempts.
   *
   * @param provider - Webhook provider name
   * @param webhookId - Unique webhook identifier
   * @param result - Processing result with success flag and message
   * @param eventLogContext - Optional context for event logging (latency, hashes, etc.)
   * @returns True if caching succeeded, false if Redis unavailable or error occurred
   * @remarks Fail-open pattern: if Redis is down, allow processing to proceed without caching
   */
  async markWebhookProcessed(
    provider: WebhookProvider,
    webhookId: string,
    result: { success: boolean; message: string; data?: unknown },
    eventLogContext?: {
      eventType?: string;
      payloadHash?: string;
      latencyMs?: number;
      processingDurationMs?: number;
      signatureVerificationMs?: number;
      persistenceMs?: number;
      payloadSize?: number;
    }
  ): Promise<boolean> {
    return this.store.markWebhookProcessed(provider, webhookId, result, eventLogContext);
  }

  /**
   * Get idempotency status from cache (for audit logging)
   */
  async getIdempotencyStatus(
    provider: WebhookProvider,
    webhookId: string
  ): Promise<{ processed: boolean; timestamp?: string }> {
    return this.store.getIdempotencyStatus(provider, webhookId);
  }

  /**
   * Get webhook body hash for replay detection
   */
  async getWebhookBodyHash(body: string): Promise<string> {
    return this.store.getWebhookBodyHash(body);
  }

  /**
   * Extract webhook ID from request headers based on provider
   */
  static extractWebhookId(provider: WebhookProvider, headers: Headers): string | null {
    const headerMap: Record<string, string> = {
      shopify: 'x-shopify-webhook-id',
      orders: 'x-shopify-webhook-id',
      uppromote: 'x-uppromote-webhook-id',
      stripe: 'stripe-signature',
    };

    const headerName = headerMap[provider];
    if (!headerName) {
      return null;
    }

    return headers.get(headerName);
  }
}

// Re-export types for convenience
export type { IdempotencyCheckResult, WebhookProvider } from '@/lib/ports'

/**
 * Backward compatibility functions
 * Maintain existing API for code not yet migrated to use IdempotencyManager class
 */
let defaultStore: IIdempotencyStore | null = null

async function getDefaultStore(): Promise<IIdempotencyStore> {
  if (!defaultStore) {
    const { IdempotencyStoreAdapter } = await import('@/lib/adapters/IdempotencyStoreAdapter')
    defaultStore = new IdempotencyStoreAdapter()
  }
  return defaultStore
}

export async function checkIdempotency(
  provider: WebhookProvider,
  webhookId: string
): Promise<IdempotencyCheckResult> {
  const store = await getDefaultStore()
  return store.checkIdempotency(provider, webhookId)
}

export async function markWebhookProcessed(
  provider: WebhookProvider,
  webhookId: string,
  result: { success: boolean; message: string; data?: unknown }
): Promise<boolean> {
  const store = await getDefaultStore()
  return store.markWebhookProcessed(provider, webhookId, result)
}

export async function getWebhookBodyHash(body: string): Promise<string> {
  const store = await getDefaultStore()
  return store.getWebhookBodyHash(body)
}

export function extractWebhookId(provider: WebhookProvider, headers: Headers): string | null {
  return IdempotencyManager.extractWebhookId(provider, headers)
}
