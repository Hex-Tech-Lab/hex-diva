/**
 * Webhook Handler Utilities
 * Provides helper functions for logging, measuring latency, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookEventLogger, WebhookEventLogInput } from './eventLog';
import { latencyTracker } from './latencyTracker';
import { checkIdempotency, markWebhookProcessed, getWebhookBodyHash, releaseIdempotencyKey } from './idempotencyManager';
import * as Sentry from '@sentry/nextjs';

export interface WebhookHandlerContext {
  provider: 'shopify' | 'uppromote' | 'orders' | 'process-order' | 'stripe';
  webhookId: string;
  eventType: string;
  body: string;
  request: NextRequest;
  startTime: number;
}

export interface WebhookHandlerResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: unknown;
}

/**
 * Comprehensive webhook handler wrapper with logging and latency tracking
 */
export async function executeWebhookHandler(
  context: WebhookHandlerContext,
  handler: () => Promise<WebhookHandlerResponse>
): Promise<NextResponse> {
  const {
    provider,
    webhookId,
    eventType,
    body,
    request,
    startTime,
  } = context;

  const signatureVerificationStart = startTime;
  let isDuplicate = false;
  let ownerToken: string | undefined;
  let originalEventId: string | undefined;
  let handlerStartTime = 0;
  let handlerEndTime = 0;

  try {
    // 1. Check for duplicates (includes measurement)
    const idempotencyCheck = await checkIdempotency(provider, webhookId);
    ownerToken = idempotencyCheck.ownerToken;
    const signatureVerificationMs = Math.round(performance.now() - signatureVerificationStart);

    if (idempotencyCheck.isDuplicate) {
      console.log(`[WebhookHandler] Duplicate webhook detected: ${provider}/${eventType} (${webhookId})`);
      isDuplicate = true;

      // Log duplicate event
      const payloadHash = await getWebhookBodyHash(body);
      const duplicateEndTime = Date.now();
      const totalLatency = duplicateEndTime - startTime;

      try {
        await webhookEventLogger.logEvent({
          webhookId,
          provider,
          eventType,
          payloadHash,
          status: 'duplicate',
          latencyMs: Math.round(totalLatency),
          isIdempotent: true,
          signatureVerificationMs,
        });
      } catch (logError) {
        console.error('[WebhookHandler] Error logging duplicate event:', logError);
        Sentry.captureException(logError, { tags: { component: 'webhook_handler' } });
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Webhook already processed (duplicate)',
          idempotent: true,
        },
        { status: 200 }
      );
    }

    // 2. Execute handler with timing
    handlerStartTime = performance.now();
    const handlerResult = await handler();
    handlerEndTime = performance.now();
    const processingDurationMs = Math.round(handlerEndTime - handlerStartTime);

    // 3. Calculate persistence time (estimate as small portion)
    const persistenceStart = performance.now();
    const payloadHash = await getWebhookBodyHash(body);
    const persistenceMs = Math.round(performance.now() - persistenceStart);

    // 4. Mark as processed
    await markWebhookProcessed(
      provider,
      webhookId,
      {
        success: handlerResult.success,
        message: handlerResult.message,
        data: handlerResult.data,
      }
    );

    // 5. Log successful event
    const totalEndTime = Date.now();
    const totalLatency = totalEndTime - startTime;

    try {
      const eventLogInput: WebhookEventLogInput = {
        webhookId,
        provider,
        eventType,
        payloadHash,
        status: handlerResult.success ? 'success' : 'failed',
        latencyMs: Math.round(totalLatency),
        errorMessage: handlerResult.success ? undefined : handlerResult.message,
        isIdempotent: isDuplicate,
        originalEventId,
        requestHeaders: extractSafeHeaders(request.headers),
        processingDurationMs,
        signatureVerificationMs,
        persistenceMs,
        payloadSize: body.length,
      };

      const eventId = await webhookEventLogger.logEvent(eventLogInput);

      // Track latency metrics
      latencyTracker.recordWebhookLatency(provider, eventType, {
        signatureVerification: signatureVerificationMs,
        processing: processingDurationMs,
        persistence: persistenceMs,
      });

      // Add breadcrumb for monitoring
      Sentry.addBreadcrumb({
        category: 'webhook_processing',
        message: `${provider}/${eventType} processed`,
        level: handlerResult.success ? 'info' : 'warning',
        data: {
          event_id: eventId,
          latency_ms: totalLatency,
          success: handlerResult.success,
        },
      });

      console.log(
        `[WebhookHandler] Event processed: ${eventId} (${provider}/${eventType}) in ${totalLatency}ms`
      );
    } catch (logError) {
      console.error('[WebhookHandler] Error logging event:', logError);
      Sentry.captureException(logError, { tags: { component: 'webhook_handler' } });
    }

    return NextResponse.json(
      {
        success: handlerResult.success,
        message: handlerResult.message,
        data: handlerResult.data,
      },
      { status: handlerResult.statusCode }
    );
  } catch (error) {
    console.error('[WebhookHandler] Unexpected error:', error);

    // Release lock so retries can occur (owner-token compare-and-delete)
    if (!isDuplicate && webhookId) {
      await releaseIdempotencyKey(provider, webhookId, ownerToken);
    }

    // Log error event
    try {
      const payloadHash = await getWebhookBodyHash(body);
      const errorEndTime = Date.now();
      const totalLatency = errorEndTime - startTime;

      await webhookEventLogger.logEvent({
        webhookId,
        provider,
        eventType,
        payloadHash,
        status: 'failed',
        latencyMs: Math.round(totalLatency),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isIdempotent: isDuplicate,
        originalEventId,
      });
    } catch (logError) {
      console.error('[WebhookHandler] Error logging error event:', logError);
    }

    // Capture in Sentry
    Sentry.captureException(error, {
      contexts: {
        webhook: {
          provider,
          eventType,
          webhookId,
          isDuplicate,
        },
      },
      tags: {
        webhook_provider: provider,
        webhook_event_type: eventType,
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract safe headers for logging (exclude sensitive data)
 */
function extractSafeHeaders(headers: Headers): Record<string, string> {
  const safe: Record<string, string> = {};
  const sensitive = ['authorization', 'token', 'secret', 'hmac', 'key', 'password'];

  for (const [key, value] of headers.entries()) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      safe[key] = '[REDACTED]';
    } else if (key.toLowerCase().startsWith('x-') || key.toLowerCase().startsWith('content-')) {
      safe[key] = value.substring(0, 100); // Truncate long values
    }
  }

  return safe;
}

/**
 * Create a Sentry transaction for webhook processing
 */
export function createWebhookTransaction(provider: string, eventType: string) {
  // Note: Sentry.startTransaction may not be available in all versions
  // Using breadcrumb tracking as fallback
  Sentry.addBreadcrumb({
    category: 'webhook',
    message: `Processing webhook: ${provider}/${eventType}`,
    level: 'info',
    data: { provider, event_type: eventType },
  });
  return { finish: () => {} }; // Return mock transaction
}

/**
 * Wrap a webhook handler with Sentry monitoring
 */
export function withSentryMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    Sentry.addBreadcrumb({
      category: 'handler',
      message: `Executing: ${handler.name || 'webhook_handler'}`,
      level: 'info',
    });

    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  };
}
