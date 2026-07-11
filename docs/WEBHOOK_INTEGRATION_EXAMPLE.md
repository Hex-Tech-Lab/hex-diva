# Webhook Integration Example - Wave 2.1

This document shows how to integrate the new webhook event logging system with an existing webhook handler.

## Before (Original)

```typescript
// src/app/api/webhooks/shopify/route.ts (original)
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { checkIdempotency, markWebhookProcessed, extractWebhookId } from '@/lib/webhooks/idempotencyManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookId = extractWebhookId('shopify', request.headers);

    // Check for duplicates
    const idempotencyCheck = await checkIdempotency('shopify', webhookId);
    if (idempotencyCheck.isDuplicate) {
      return NextResponse.json({ success: true, idempotent: true });
    }

    // Process event
    const event = JSON.parse(body);
    await handleProductUpdate(event);

    // Mark as processed
    await markWebhookProcessed('shopify', webhookId, {
      success: true,
      message: 'Processed',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

## After (With Event Logging)

### Option 1: Using executeWebhookHandler (Recommended)

```typescript
// src/app/api/webhooks/shopify/route.ts (new)
import { NextRequest } from 'next/server';
import { executeWebhookHandler } from '@/lib/webhooks/webhookHandler';
import { extractWebhookId } from '@/lib/webhooks/idempotencyManager';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const webhookId = extractWebhookId('shopify', request.headers) || '';
  const startTime = performance.now();

  return executeWebhookHandler(
    {
      provider: 'shopify',
      webhookId,
      eventType: request.headers.get('x-shopify-topic') || 'unknown',
      body,
      request,
      startTime,
    },
    async () => {
      const event = JSON.parse(body);
      await handleProductUpdate(event);
      return {
        success: true,
        message: 'Product updated successfully',
        statusCode: 200,
      };
    }
  );
}

async function handleProductUpdate(event: any) {
  // Your existing business logic
  console.log('Updating product:', event.id);
}
```

**Benefits:**
- Automatic event logging
- Integrated latency tracking
- Automatic Sentry breadcrumbs
- Duplicate detection
- Error handling
- All in one wrapper

### Option 2: Manual Integration (More Control)

If you need more granular control over the process:

```typescript
// src/app/api/webhooks/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  checkIdempotency, 
  markWebhookProcessed, 
  extractWebhookId,
  getWebhookBodyHash 
} from '@/lib/webhooks/idempotencyManager';
import { webhookEventLogger } from '@/lib/webhooks/eventLog';
import { latencyTracker } from '@/lib/webhooks/latencyTracker';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  const requestStart = performance.now();
  const body = await request.text();

  try {
    // 1. Extract webhook ID
    const webhookId = extractWebhookId('orders', request.headers);
    if (!webhookId) {
      return NextResponse.json({ error: 'Missing webhook ID' }, { status: 400 });
    }

    const signatureStart = performance.now();
    // 2. Verify signature (your existing verification logic)
    if (!verifySignature(request, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const signatureVerificationMs = performance.now() - signatureStart;

    // 3. Check idempotency
    const idempotencyCheck = await checkIdempotency('orders', webhookId);
    if (idempotencyCheck.isDuplicate) {
      // Log duplicate event
      const payloadHash = await getWebhookBodyHash(body);
      await webhookEventLogger.logEvent({
        webhookId,
        provider: 'orders',
        eventType: 'order.attributed',
        payloadHash,
        status: 'duplicate',
        isIdempotent: true,
        signatureVerificationMs,
      });

      return NextResponse.json(
        { success: true, idempotent: true },
        { status: 200 }
      );
    }

    // 4. Process event
    const processingStart = performance.now();
    const event = JSON.parse(body);
    const eventType = extractEventType(event);

    try {
      await processOrder(event);
      const processingMs = performance.now() - processingStart;

      // 5. Mark as processed
      await markWebhookProcessed('orders', webhookId, {
        success: true,
        message: 'Order processed',
      });

      // 6. Log successful event
      const payloadHash = await getWebhookBodyHash(body);
      const totalLatency = performance.now() - requestStart;

      await webhookEventLogger.logEvent({
        webhookId,
        provider: 'orders',
        eventType,
        payloadHash,
        status: 'success',
        latencyMs: Math.round(totalLatency),
        processingDurationMs: Math.round(processingMs),
        signatureVerificationMs: Math.round(signatureVerificationMs),
        payloadSize: body.length,
      });

      // 7. Track latency
      latencyTracker.recordWebhookLatency('orders', eventType, {
        signatureVerification: signatureVerificationMs,
        processing: processingMs,
        persistence: 0, // Usually minimal
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (processingError) {
      const totalLatency = performance.now() - requestStart;
      const payloadHash = await getWebhookBodyHash(body);

      // Log failed event
      await webhookEventLogger.logEvent({
        webhookId,
        provider: 'orders',
        eventType: eventType || 'unknown',
        payloadHash,
        status: 'failed',
        latencyMs: Math.round(totalLatency),
        errorMessage: processingError instanceof Error 
          ? processingError.message 
          : 'Unknown error',
        signatureVerificationMs: Math.round(signatureVerificationMs),
      });

      // Capture in Sentry with context
      Sentry.captureException(processingError, {
        contexts: {
          webhook: {
            provider: 'orders',
            eventType: eventType || 'unknown',
            webhookId,
          },
        },
        tags: {
          webhook_provider: 'orders',
          webhook_status: 'failed',
        },
      });

      return NextResponse.json(
        { error: String(processingError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[OrdersWebhook] Fatal error:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'orders_webhook',
        severity: 'critical',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function verifySignature(request: NextRequest, body: string): boolean {
  // Your signature verification logic
  return true;
}

function extractEventType(event: any): string {
  // Extract event type from event payload
  return event.type || 'unknown';
}

async function processOrder(event: any): Promise<void> {
  // Your existing order processing logic
  console.log('Processing order:', event.id);
}
```

## Monitoring Dashboard Integration

Add the webhook monitor to your admin panel:

```typescript
// src/app/admin/webhooks/page.tsx
'use client';

import { WebhookMonitor } from '@/components/admin/WebhookMonitor';

export default function WebhookDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Real-time webhook event tracking, idempotency monitoring, and performance analytics
        </p>
      </div>
      <WebhookMonitor />
    </div>
  );
}
```

## Testing Event Logging

### Test 1: Verify Event Creation

```typescript
// In your test file
import { webhookEventLogger } from '@/lib/webhooks/eventLog';

describe('Webhook Event Logging', () => {
  it('should log webhook events', async () => {
    const eventId = await webhookEventLogger.logEvent({
      webhookId: 'test-webhook-id',
      provider: 'shopify',
      eventType: 'products/update',
      payloadHash: 'abc123',
      status: 'success',
      latencyMs: 150,
    });

    expect(eventId).toBeDefined();

    // Verify event was created
    const event = await webhookEventLogger.getEventById(eventId);
    expect(event?.status).toBe('success');
  });
});
```

### Test 2: Verify Duplicate Detection

```typescript
it('should detect duplicate events', async () => {
  const webhookId = 'test-webhook-123';

  // First request
  const idempotency1 = await checkIdempotency('shopify', webhookId);
  expect(idempotency1.isDuplicate).toBe(false);

  // Mark as processed
  await markWebhookProcessed('shopify', webhookId, {
    success: true,
    message: 'Processed',
  });

  // Second request (duplicate)
  const idempotency2 = await checkIdempotency('shopify', webhookId);
  expect(idempotency2.isDuplicate).toBe(true);
});
```

### Test 3: Verify Latency Tracking

```typescript
it('should track webhook latency', () => {
  latencyTracker.recordWebhookLatency('shopify', 'products/update', {
    signatureVerification: 50,
    processing: 100,
    persistence: 20,
  });

  const metrics = latencyTracker.getMetrics('shopify', 'products/update');
  expect(metrics.measurements.count).toBe(1);
  expect(metrics.measurements.total).toBe(170);
});
```

## Migration Checklist

- [ ] Run migration 006 (`npx supabase migration up`)
- [ ] Update Shopify webhook handler with event logging
- [ ] Update Uppromote webhook handler with event logging
- [ ] Update Orders webhook handler with event logging
- [ ] Add WebhookMonitor component to admin dashboard
- [ ] Test duplicate detection
- [ ] Test event logging
- [ ] Monitor Sentry for any logging errors
- [ ] Review SLA report: `latencyTracker.getSLAReport()`
- [ ] Document any custom event types

## Troubleshooting

### Events not appearing in dashboard

1. Check migration ran: `SELECT * FROM webhook_events LIMIT 1;`
2. Verify Supabase connection in eventLog.ts
3. Check RLS policies allow service role
4. Review Sentry for logging errors

### High duplicate rates

1. Check webhook provider retry configuration
2. Verify webhook ID extraction is correct
3. Monitor Redis connectivity
4. Review `findDuplicateEvents()` results

### SLA breaches

1. Check `processingDurationMs` - is business logic slow?
2. Monitor database query performance
3. Check external API calls
4. Scale infrastructure if needed

## Performance Impact

Expected latency additions per webhook:
- Event logging: 20-50ms
- Idempotency check: 10-50ms
- Latency tracking: <5ms
- **Total overhead**: ~150-200ms

Actual impact depends on Redis/Supabase latency in your region.

## Questions?

See `src/lib/webhooks/README.md` for comprehensive documentation.
