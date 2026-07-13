# Webhook Event Logging & Monitoring System

Comprehensive webhook event logging, idempotency detection, replay capabilities, and real-time monitoring for Wave 2.1.

## Architecture Overview

```
Webhook Request
    ↓
[Signature Verification] → eventLog.ts (log verification time)
    ↓
[Idempotency Check] → Redis + eventLog (duplicate detection)
    ↓
[Business Logic] → webhookHandler.ts (latency tracking)
    ↓
[Persistence] → Supabase (event + metrics)
    ↓
[Monitoring] → WebhookMonitor.tsx (real-time display)
    ↓
[Sentry Breadcrumbs] → Error tracking & analytics
```

## Core Components

### 1. Event Logger (`eventLog.ts`)

Manages all webhook event logging to Supabase.

**Key Methods:**
- `logEvent(input)` - Log a webhook event with full metrics
- `getEventById(eventId)` - Retrieve specific event
- `getEventsByWebhookId(webhookId, limit)` - List events for a webhook
- `findDuplicateEvents(payloadHash, provider)` - Find duplicates by payload
- `getEvents(filters)` - Query events with filtering
- `getMetrics(filters)` - Get aggregated metrics
- `getSummaryStats(timeframeHours)` - Get summary statistics

**Usage:**
```typescript
import { webhookEventLogger } from '@/lib/webhooks/eventLog';

const eventId = await webhookEventLogger.logEvent({
  webhookId: 'gid://shopify/webhook/12345',
  provider: 'shopify',
  eventType: 'products/update',
  payloadHash: await getWebhookBodyHash(body),
  status: 'success',
  latencyMs: 450,
  processingDurationMs: 350,
  signatureVerificationMs: 50,
  persistenceMs: 50,
});
```

### 2. Idempotency Manager (`idempotencyManager.ts`)

Prevents duplicate webhook processing using Redis.

**Key Methods:**
- `checkIdempotency(provider, webhookId)` - Check if already processed
- `markWebhookProcessed(provider, webhookId, result)` - Record processing
- `extractWebhookId(provider, headers)` - Extract webhook ID from headers
- `getWebhookBodyHash(body)` - Generate payload hash for replay detection

**Updated in Wave 2.1:**
- Now integrates with event logging
- Accepts optional `eventLogContext` parameter
- Automatically logs events when marking processed

**Usage:**
```typescript
import { checkIdempotency, markWebhookProcessed, extractWebhookId } from '@/lib/webhooks/idempotencyManager';

// Check for duplicates
const idempotencyCheck = await checkIdempotency('shopify', webhookId);
if (idempotencyCheck.isDuplicate) {
  return NextResponse.json({ success: true, idempotent: true });
}

// Process webhook...

// Mark as processed
await markWebhookProcessed('shopify', webhookId, {
  success: true,
  message: 'Processed successfully',
});
```

### 3. Event Inspector (`eventInspector.ts`)

Provides analysis, comparison, and replay capabilities for webhook events.

**Key Methods:**
- `getEventById(eventId)` - Get event details
- `listEventsByWebhookId(webhookId, options)` - List webhook events
- `findDuplicateEvents(payloadHash, provider)` - Find duplicate events
- `compareEvents(eventId1, eventId2)` - Compare two events
- `getEventDetails(eventId)` - Get comprehensive event context
- `analyzeEventPatterns(provider, timeframeHours)` - Analyze patterns
- `initiateEventReplay(eventId, reason, userId)` - Queue event for replay
- `exportEventsAsCSV(filters)` - Export events for compliance
- `searchEvents(query)` - Search events with flexible criteria

**Usage:**
```typescript
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';

// Get event details with context
const details = await webhookEventInspector.getEventDetails(eventId);
// Returns: { event, duplicates, originalEvent, replays }

// Analyze patterns
const analysis = await webhookEventInspector.analyzeEventPatterns('shopify', 24);
// Returns: { totalEvents, successRate, issues, topErrors, ... }

// Initiate replay
const result = await webhookEventInspector.initiateEventReplay(
  eventId,
  'Manual replay for debugging',
  userId
);
```

### 4. Latency Tracker (`latencyTracker.ts`)

Tracks webhook processing latency and SLA compliance.

**Key Methods:**
- `startMeasurement()` - Get high-resolution start time
- `endMeasurement(startTime, provider, eventType)` - Record latency
- `recordWebhookLatency(provider, eventType, breakdown)` - Record detailed breakdown
- `getMetrics(provider, eventType, stage)` - Get latency metrics
- `getAllMetrics()` - Get all metrics
- `getSLAReport()` - Get SLA compliance report
- `exportMetrics()` - Export for external monitoring
- `getPercentile(provider, eventType, latency)` - Get percentile rank

**Usage:**
```typescript
import { latencyTracker } from '@/lib/webhooks/latencyTracker';

// Record detailed latency breakdown
latencyTracker.recordWebhookLatency('shopify', 'products/update', {
  signatureVerification: 50,
  processing: 350,
  persistence: 50,
  other: 0,
});

// Get SLA report
const slaReport = latencyTracker.getSLAReport();
console.log(`SLA Breach Rate: ${slaReport.slaBreakedRate}`);
```

### 5. Webhook Handler Utilities (`webhookHandler.ts`)

Comprehensive wrapper for webhook processing with integrated logging.

**Key Functions:**
- `executeWebhookHandler(context, handler)` - Wrap handler with logging
- `createWebhookTransaction(provider, eventType)` - Create Sentry transaction
- `withSentryMonitoring(handler)` - Decorator for Sentry monitoring

**Usage:**
```typescript
import { executeWebhookHandler } from '@/lib/webhooks/webhookHandler';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const startTime = performance.now();

  return executeWebhookHandler(
    {
      provider: 'shopify',
      webhookId: extractWebhookId('shopify', request.headers) || '',
      eventType: request.headers.get('x-shopify-topic') || 'unknown',
      body,
      request,
      startTime,
    },
    async () => {
      // Your business logic here
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

### 6. Monitoring Dashboard (`WebhookMonitor.tsx`)

Real-time dashboard component for webhook monitoring.

**Features:**
- Real-time event stream (polling every 10s)
- Summary statistics (total, success rate, failures, avg latency)
- Provider-specific performance metrics
- Filtering by provider, status, time range
- Event replay button
- CSV export
- Error log with details

**Usage in Admin Panel:**
```typescript
import { WebhookMonitor } from '@/components/admin/WebhookMonitor';

export default function AdminPage() {
  return (
    <div>
      <WebhookMonitor />
    </div>
  );
}
```

## Database Schema

### `webhook_events` Table
Comprehensive event log with full context.

**Columns:**
- `id` (uuid): Unique event identifier
- `webhook_id` (text): Provider webhook ID for deduplication
- `provider` (text): Webhook source (shopify, uppromote, orders, etc)
- `event_type` (text): Event type (e.g., products/update)
- `status` (text): success, failed, duplicate, skipped
- `latency_ms` (integer): End-to-end latency
- `is_idempotent` (boolean): True if duplicate
- `original_event_id` (uuid): References original if duplicate
- `payload_hash` (text): SHA256 for replay detection
- `error_message` (text): Failure reason
- `processing_duration_ms` (integer): Business logic time
- `signature_verification_ms` (integer): Verification time
- `persistence_ms` (integer): Database write time
- `created_at` (timestamp): When event was created

**Indexes:**
- webhook_id (for webhook tracking)
- provider, status, event_type (for filtering)
- created_at (for time-based queries)
- payload_hash (for duplicate detection)
- Composite indexes for common query patterns

### `webhook_event_metrics` Table
Hourly aggregated metrics for analytics.

**Columns:**
- `provider` (text)
- `event_type` (text)
- `hour_bucket` (timestamp)
- `total_events`, `successful_events`, `failed_events`, `duplicate_events` (integer)
- `avg_latency_ms`, `p50_latency_ms`, `p95_latency_ms`, `p99_latency_ms` (numeric)
- `success_rate` (numeric)

### `webhook_replays` Table
Track manual event replays for debugging.

**Columns:**
- `original_event_id` (uuid): Event being replayed
- `initiated_by` (uuid): Admin user
- `reason` (text): Replay reason
- `status` (text): pending, processing, success, failed
- `result_event_id` (uuid): New event from replay
- `error_message` (text): Failure details

## API Endpoints

### Webhook Events
- `GET /api/admin/webhooks/events` - List events with filters
  - Query params: `provider`, `status`, `eventType`, `timeRange`, `limit`, `offset`
  - Returns: events, stats, pagination

- `GET /api/admin/webhooks/events/[eventId]` - Get event details
  - Returns: event, duplicates, originalEvent, replays

- `POST /api/admin/webhooks/events/[eventId]/replay` - Initiate replay
  - Body: `{ reason: string }`

- `GET /api/admin/webhooks/events/export` - Export as CSV
  - Query params: `provider`, `status`, `startDate`, `endDate`

## Integration Guide

### Step 1: Add Migration
Run migration 006 to create webhook_events tables:
```bash
npx supabase migration up
```

### Step 2: Update Webhook Routes
Update each webhook handler (shopify, uppromote, orders) to use the new system:

```typescript
import { executeWebhookHandler } from '@/lib/webhooks/webhookHandler';
import { extractWebhookId, getWebhookBodyHash } from '@/lib/webhooks/idempotencyManager';

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
      // Your handler logic
      await handleEvent(event);
      return { success: true, message: 'OK', statusCode: 200 };
    }
  );
}
```

### Step 3: Add Monitoring Dashboard
Add WebhookMonitor component to admin dashboard:

```typescript
import { WebhookMonitor } from '@/components/admin/WebhookMonitor';

export default function WebhookDashboard() {
  return <WebhookMonitor />;
}
```

## Monitoring & Alerts

### Sentry Integration
Events automatically create Sentry breadcrumbs:
```
- Webhook processing steps
- Latency tracking
- Error context (webhook_id, provider, event_type)
- SLA breaches (latency > 2s)
```

### SLA Monitoring
- **Target**: 2000ms (2 seconds) per webhook
- **Tracked**: p50, p95, p99 percentiles
- **Alert**: Warning logged when latency > 2s
- **Report**: Available via `getSLAReport()`

### Duplicate Detection
- **Method**: Payload hash comparison
- **Redis Cache**: 7-day TTL
- **Fallback**: Database duplicate tracking
- **Success Rate**: Tracked in metrics

## Performance Considerations

### Memory
- Latency tracker: ~10KB per provider/event_type (capped at 10k measurements)
- Event logger: Minimal (direct DB writes)
- Idempotency: Redis (external service)

### Database
- Events table growth: ~1KB per event
- Metrics table: One row per provider/event_type/hour
- Indexes optimized for common queries

### Latency Impact
- Signature verification: ~50ms
- Idempotency check: ~10-50ms (Redis)
- Event logging: ~20-50ms (async)
- Total overhead: ~150-200ms per webhook

## Best Practices

1. **Always use executeWebhookHandler()** - Ensures consistent logging
2. **Extract webhook ID early** - Required for idempotency
3. **Compute payload hash** - Use `getWebhookBodyHash()`
4. **Record latency breakdown** - Helps identify bottlenecks
5. **Check Sentry breadcrumbs** - First place to look for issues
6. **Export events regularly** - For compliance and analysis
7. **Monitor SLA report** - Catch performance issues early
8. **Review top errors** - Identify patterns

## Troubleshooting

### High Duplicate Rate (>10%)
- Check webhook retry logic in provider
- Verify idempotency key extraction
- Review payload hash algorithm

### High Failure Rate (>5%)
- Check error messages in `analyzeEventPatterns()`
- Review Sentry logs for stack traces
- Test webhook signature verification

### SLA Breaches (>2s)
- Check `processingDurationMs` - slow business logic?
- Check `persistenceMs` - slow DB writes?
- Check `signatureVerificationMs` - slow verification?
- Scale database or optimize handlers

### Missing Events
- Verify migration ran successfully
- Check database permissions (RLS policies)
- Review Sentry for logging errors
- Check Redis connectivity for idempotency

## Compliance & Auditing

### Data Retention
- Events: 90 days (adjust via migration)
- Metrics: 1 year (hourly aggregation)
- Replays: Until completion

### PII Handling
- Request headers sanitized (removes auth, tokens)
- Payload hash stored (not full payload)
- Error messages may contain data - review before export

### Exports
- CSV format for compliance reports
- Timestamp, provider, status, latency, errors
- Useful for: audit trails, SLA verification, incident reports

## Future Enhancements

1. **Webhook Payload Storage** - Optional full payload archival for replay
2. **Real-time WebSocket** - Replace polling with WebSocket stream
3. **Advanced Analytics** - Heatmaps, correlation analysis
4. **Automated Replays** - Retry failed events with exponential backoff
5. **Custom Alerting** - Slack/email alerts for SLA breaches
6. **Webhook Throttling** - Rate limit by provider/event type
7. **Conditional Logging** - Log only failures/slow events
