# Wave 2.1 Webhook Monitoring Setup Guide

Complete setup guide for the webhook event logging, idempotency tracking, and monitoring system.

## Architecture Summary

```
Webhook Request
    ↓
[Signature Verification] (signatureVerificationMs)
    ↓
[Idempotency Check] (Redis cache + duplicate detection)
    ↓
[Business Logic Handler] (processingDurationMs)
    ↓
[Event Logging] (to Supabase webhook_events table)
    ↓
[Metrics Aggregation] (hourly rollups)
    ↓
[Monitoring Dashboard] (real-time display)
    ↓
[Sentry Breadcrumbs] (error tracking & alerting)
```

## Installation Checklist

### 1. Database Schema (Migration 006)

File: `migrations/006_webhook_event_logging.sql`

Creates:
- `webhook_events` table - Comprehensive event log
- `webhook_event_metrics` table - Hourly aggregated metrics
- `webhook_replays` table - Event replay tracking
- Indexes on webhook_id, provider, status, created_at
- RLS policies for admin access
- Trigger for metrics aggregation

Run:
```bash
npx supabase migration up
```

Verify:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'webhook%';
```

### 2. Core Libraries

#### Event Logger
File: `src/lib/webhooks/eventLog.ts`
- Manages all webhook event logging
- Integrates with Supabase
- Provides filtering and statistics queries
- Sanitizes sensitive headers

Key exports:
- `WebhookEventLogger` class
- `webhookEventLogger` singleton
- `WebhookEventLogInput` interface

#### Idempotency Manager (Updated)
File: `src/lib/webhooks/idempotencyManager.ts`
- Prevents duplicate webhook processing
- Uses Redis for fast lookups
- Updated to integrate with event logging
- Exports webhook IDs and payload hashes

Key exports:
- `checkIdempotency()` - Check if duplicate
- `markWebhookProcessed()` - Record processing with optional logging
- `extractWebhookId()` - Extract from headers
- `getWebhookBodyHash()` - SHA256 hash for replay detection
- `WebhookProvider` type

#### Event Inspector
File: `src/lib/webhooks/eventInspector.ts`
- Analyzes and compares webhook events
- Enables manual event replay
- Provides forensic analysis tools
- Exports events as CSV

Key exports:
- `WebhookEventInspector` class
- `webhookEventInspector` singleton

#### Latency Tracker
File: `src/lib/webhooks/latencyTracker.ts`
- Tracks webhook processing latency
- Calculates percentiles (p50, p95, p99)
- Monitors SLA compliance
- Exports metrics for monitoring

Key exports:
- `LatencyTracker` class
- `latencyTracker` singleton

#### Webhook Handler Utilities
File: `src/lib/webhooks/webhookHandler.ts`
- Comprehensive wrapper for webhook processing
- Integrated logging, latency tracking, error handling
- Sentry integration
- Best-practice error handling

Key exports:
- `executeWebhookHandler()` - Main wrapper function
- `WebhookHandlerContext` interface
- `WebhookHandlerResponse` interface

### 3. API Endpoints

#### List/Filter Events
Route: `src/app/api/admin/webhooks/events/route.ts`
- GET: List events with filters, get stats
- Query params: provider, status, eventType, timeRange, limit, offset
- Returns: events array, stats, pagination

#### Event Details
Route: `src/app/api/admin/webhooks/events/[eventId]/route.ts`
- GET: Retrieve event with full context
- Returns: event, duplicates, originalEvent, replays

#### Event Replay
Route: `src/app/api/admin/webhooks/events/[eventId]/replay/route.ts`
- POST: Initiate event replay
- Body: { reason: string }
- Returns: success status, replay record created

#### Export Events
Route: `src/app/api/admin/webhooks/events/export/route.ts`
- GET: Export events as CSV
- Query params: provider, status, startDate, endDate
- Returns: CSV file

### 4. Monitoring Dashboard

Component: `src/components/admin/WebhookMonitor.tsx`

Features:
- Real-time event stream (polls every 10s)
- Summary statistics (total, success rate, failures, avg latency)
- Provider-specific metrics (p50, p95, p99 latency)
- Filtering by provider, status, time range
- Event replay buttons
- Error message display
- CSV export

Add to admin page:
```typescript
import { WebhookMonitor } from '@/components/admin/WebhookMonitor';

export default function WebhookDashboard() {
  return <WebhookMonitor />;
}
```

### 5. Integration with Existing Routes

Each webhook route needs updating to use the new system.

**File**: `src/app/api/webhooks/[provider]/route.ts`

Update using Option 1 (Recommended):
```typescript
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
      // Your handler logic
      const event = JSON.parse(body);
      await handleProductUpdate(event);
      return {
        success: true,
        message: 'Product updated',
        statusCode: 200,
      };
    }
  );
}
```

Routes to update:
1. `src/app/api/webhooks/shopify/route.ts` - products/update, inventory/update
2. `src/app/api/webhooks/uppromote/route.ts` - promotion events
3. `src/app/api/webhooks/orders/route.ts` - order attribution
4. Any other webhook handlers

## Configuration

### Environment Variables

No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL` (for idempotency)
- `SENTRY_DSN` (for error tracking)

### Database Configuration

Supabase RLS Policies (created by migration):

1. Admins can read all events
2. Service role can manage events
3. Users cannot access webhook_events (protected endpoint)

### Rate Limiting

No built-in rate limiting (uses existing idempotency for duplicate prevention).

For rate limiting webhooks:
```typescript
import { redis } from '@/lib/cache';

async function checkWebhookRateLimit(webhookId: string): Promise<boolean> {
  const key = `webhook_rate:${webhookId}`;
  const count = await redis?.incr(key);
  if (count === 1) {
    await redis?.expire(key, 60); // 60 second window
  }
  return (count || 0) <= 100; // 100 per minute
}
```

## Performance Tuning

### Database Indexes

Created by migration:
- webhook_id (common lookup)
- provider (filtering)
- status (filtering)
- created_at (time-based queries)
- Composite indexes for common patterns

Query optimization tips:
```typescript
// Fast queries (use indexes)
const events = await webhookEventLogger.getEvents({
  provider: 'shopify',
  status: 'failed',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});

// Slow queries (avoid)
const events = await webhookEventLogger.getEvents({
  eventType: 'complex/pattern', // Consider full table scan
});
```

### Latency Tracking Memory

In-memory storage: ~10KB per provider/event_type (capped at 10k measurements)

Reset periodically if running long-lived processes:
```typescript
import { latencyTracker } from '@/lib/webhooks/latencyTracker';

// Reset every 24 hours
setInterval(() => {
  const report = latencyTracker.getSLAReport();
  console.log(report); // Log before reset
  latencyTracker.reset();
}, 24 * 60 * 60 * 1000);
```

### Event Storage

Metrics table cleanup (optional):
```sql
-- Delete metrics older than 1 year
DELETE FROM webhook_event_metrics
WHERE hour_bucket < NOW() - INTERVAL '1 year';

-- Archive old events (keep 3 months)
-- First, export to CSV for compliance
-- Then delete:
DELETE FROM webhook_events
WHERE created_at < NOW() - INTERVAL '3 months';
```

## Monitoring & Alerts

### Sentry Integration

Automatic breadcrumbs created for:
- Webhook received
- Idempotency check
- Processing start/end
- Errors with full context
- SLA breaches (latency > 2s)

Tagged with:
- `webhook_provider` - Webhook source
- `webhook_event_type` - Event type
- `webhook_status` - Processing result

### SLA Monitoring

Get SLA report:
```typescript
import { latencyTracker } from '@/lib/webhooks/latencyTracker';

const report = latencyTracker.getSLAReport();
console.log(report.slaBreakedRate); // e.g., "3.5%"

if (parseFloat(report.slaBreakedRate) > 5) {
  alert('SLA BREACH: Webhook latency exceeds 5%');
}
```

### Custom Alerting

Send alerts to Slack/email:
```typescript
import { webhookEventLogger } from '@/lib/webhooks/eventLog';

// Get recent failures
const { events } = await webhookEventLogger.getEvents({
  status: 'failed',
  startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
  limit: 100,
});

if (events.length > 10) {
  // Send alert to Slack/email
  await notifyOps(`High failure rate: ${events.length} failures in last hour`);
}
```

## Testing

### Unit Tests

```typescript
import { webhookEventLogger } from '@/lib/webhooks/eventLog';
import { latencyTracker } from '@/lib/webhooks/latencyTracker';

describe('Webhook Monitoring', () => {
  it('should log events', async () => {
    const eventId = await webhookEventLogger.logEvent({
      webhookId: 'test-123',
      provider: 'shopify',
      eventType: 'products/update',
      payloadHash: 'abc123',
      status: 'success',
      latencyMs: 150,
    });
    expect(eventId).toBeDefined();
  });

  it('should track latency', () => {
    latencyTracker.recordWebhookLatency('shopify', 'products/update', {
      signatureVerification: 50,
      processing: 100,
      persistence: 20,
    });

    const metrics = latencyTracker.getMetrics('shopify', 'products/update');
    expect(metrics.measurements.count).toBe(1);
  });
});
```

### Integration Tests

```typescript
// Test full webhook flow
describe('Shopify Webhook', () => {
  it('should process and log events', async () => {
    const response = await fetch('/api/webhooks/shopify', {
      method: 'POST',
      headers: {
        'x-shopify-webhook-id': 'test-webhook-123',
        'x-shopify-topic': 'products/update',
      },
      body: JSON.stringify({ id: '123', title: 'Test' }),
    });

    expect(response.status).toBe(200);

    // Verify event was logged
    const events = await webhookEventLogger.getEventsByWebhookId('test-webhook-123');
    expect(events.length).toBeGreaterThan(0);
  });
});
```

## Compliance & Auditing

### Data Retention

- Events: Keep for 90 days (adjustable via migration)
- Metrics: Keep for 1 year (hourly aggregation)
- Replays: Keep until completion + 30 days

### Privacy

- PII not stored (request bodies not archived)
- Headers sanitized (auth tokens removed)
- Payload hashes only (enables replay detection)

### Exports

Generate compliance reports:
```typescript
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';

const csv = await webhookEventInspector.exportEventsAsCSV({
  provider: 'shopify',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});

// Send to compliance system or email
```

### Audit Trail

All webhook events are audit logged:
- Webhook received (timestamp, provider, type)
- Processing status (success/failure)
- Latency metrics (for performance review)
- Replay actions (who initiated, when, why)

## Troubleshooting

### Events Not Appearing

1. Check migration ran: `SELECT COUNT(*) FROM webhook_events;`
2. Verify RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'webhook_events';
   ```
3. Check for errors: `SELECT * FROM webhook_events WHERE status = 'failed' LIMIT 1;`
4. Verify Supabase connection in eventLog.ts

### High Duplicate Rate

1. Check provider retry config
2. Verify webhook ID extraction:
   ```typescript
   const id = extractWebhookId('shopify', headers);
   console.log('Extracted ID:', id);
   ```
3. Check Redis connectivity:
   ```typescript
   const testKey = await redis?.ping();
   console.log('Redis ping:', testKey);
   ```

### SLA Breaches

1. Check processing time: `processingDurationMs` vs total `latencyMs`
2. Optimize slow queries in business logic
3. Check database performance (CPU, disk I/O)
4. Review external API calls (slow?)
5. Consider database connection pooling

### Missing Webhooks

1. Verify webhook provider is registered
2. Check provider-specific webhook settings
3. Verify DNS resolution for callback URL
4. Check firewall rules allowing inbound traffic
5. Review provider webhook logs/history

## Rollback Plan

If issues occur, rollback is straightforward:

1. Revert webhook route changes (don't use executeWebhookHandler)
2. Event logging will stop automatically
3. Idempotency still works via Redis
4. Dashboard will show no new events
5. All existing events remain in database

To remove tables:
```sql
-- Drop in order (handle foreign keys)
DROP TRIGGER trigger_update_webhook_metrics ON webhook_events;
DROP TABLE webhook_replays;
DROP TABLE webhook_event_metrics;
DROP TABLE webhook_events;
```

## Next Steps

1. ✅ Run migration 006
2. ✅ Update webhook routes with event logging
3. ✅ Add WebhookMonitor to admin dashboard
4. ✅ Configure Sentry alerts for SLA breaches
5. ✅ Set up monitoring dashboards (Datadog, etc)
6. ✅ Test duplicate detection
7. ✅ Monitor first 24 hours for issues
8. ✅ Review SLA report and optimize if needed

## Support & Documentation

- **Architecture**: See `src/lib/webhooks/README.md`
- **Integration Examples**: See `docs/WEBHOOK_INTEGRATION_EXAMPLE.md`
- **API Reference**: See inline JSDoc comments in source files
- **Event Inspector**: Use `webhookEventInspector.analyzeEventPatterns()`
- **Sentry**: Check breadcrumbs for processing steps

## Performance Expectations

Typical metrics (per webhook):

| Metric | Value |
|--------|-------|
| Signature Verification | 50-100ms |
| Idempotency Check | 10-50ms |
| Event Processing | 100-500ms |
| Event Logging | 20-50ms |
| Total Latency | 200-700ms |
| SLA Target | <2000ms |
| Success Rate | >99% |
| Duplicate Detection | >95% accuracy |

Adjust based on your infrastructure and business requirements.
