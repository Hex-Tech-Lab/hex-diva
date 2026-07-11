/**
 * Webhook Idempotency Manager
 * Prevents duplicate webhook processing by tracking webhook IDs
 * Stores in Redis for fast lookups with TTL cleanup
 */

import { redis } from '@/lib/cache';

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  previousResult?: {
    success: boolean;
    message: string;
    data?: unknown;
  };
}

const WEBHOOK_ID_PREFIX = 'webhook:';
const WEBHOOK_ID_TTL = 86400 * 7; // 7 days (webhook retention period)

/**
 * Generate idempotency key from provider and webhook ID
 */
function getIdempotencyKey(provider: WebhookProvider, webhookId: string): string {
  return `${WEBHOOK_ID_PREFIX}${provider}:${webhookId}`;
}

/**
 * Supported webhook providers
 */
export type WebhookProvider = 'shopify' | 'uppromote' | 'orders' | 'process-order' | 'stripe';

/**
 * Check if webhook has already been processed (idempotency gate)
 * @param provider - Webhook provider name (shopify, uppromote, orders, etc.)
 * @param webhookId - Unique webhook identifier from provider headers
 * @returns IdempotencyCheckResult with isDuplicate flag and previous result if cached
 * @remarks Only successful webhooks should be cached via markWebhookProcessed; failed attempts bypass caching to allow retries
 */
export async function checkIdempotency(
  provider: WebhookProvider,
  webhookId: string
): Promise<IdempotencyCheckResult> {
  if (!redis || !webhookId) {
    return { isDuplicate: false };
  }

  try {
    const key = getIdempotencyKey(provider, webhookId);
    const cached = await redis.get(key);

    if (cached) {
      try {
        return {
          isDuplicate: true,
          previousResult: JSON.parse(String(cached)),
        };
      } catch {
        return { isDuplicate: true };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('[IdempotencyManager] Error checking idempotency:', error);
    // Fail open - allow processing if cache check fails
    return { isDuplicate: false };
  }
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
export async function markWebhookProcessed(
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
  if (!redis || !webhookId) {
    return false;
  }

  try {
    const key = getIdempotencyKey(provider, webhookId);
    const value = JSON.stringify(result);
    await redis.setex(key, WEBHOOK_ID_TTL, value);

    // Log to event logging system if context provided
    if (eventLogContext) {
      try {
        const { webhookEventLogger } = await import('./eventLog');
        await webhookEventLogger.logEvent({
          webhookId,
          provider,
          eventType: eventLogContext.eventType || 'unknown',
          payloadHash: eventLogContext.payloadHash || '',
          status: result.success ? 'success' : 'failed',
          latencyMs: eventLogContext.latencyMs,
          processingDurationMs: eventLogContext.processingDurationMs,
          signatureVerificationMs: eventLogContext.signatureVerificationMs,
          persistenceMs: eventLogContext.persistenceMs,
          payloadSize: eventLogContext.payloadSize,
          isIdempotent: false,
        });
      } catch (logError) {
        console.error('[IdempotencyManager] Error logging event:', logError);
        // Don't fail the entire operation if logging fails
      }
    }

    return true;
  } catch (error) {
    console.error('[IdempotencyManager] Error marking webhook processed:', error);
    return false;
  }
}

/**
 * Extract webhook ID from request headers based on provider
 */
export function extractWebhookId(provider: WebhookProvider, headers: Headers): string | null {
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

/**
 * Verify webhook request body hash for replay detection
 * Returns hash that can be stored for comparison
 */
export async function getWebhookBodyHash(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get idempotency status from cache (for audit logging)
 */
export async function getIdempotencyStatus(
  provider: WebhookProvider,
  webhookId: string
): Promise<{ processed: boolean; timestamp?: string }> {
  if (!redis || !webhookId) {
    return { processed: false };
  }

  try {
    const key = getIdempotencyKey(provider, webhookId);
    const cached = await redis.get(key);
    return {
      processed: !!cached,
      timestamp: cached ? new Date().toISOString() : undefined,
    };
  } catch {
    return { processed: false };
  }
}
