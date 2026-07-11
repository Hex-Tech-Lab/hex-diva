# Wave 2.1 Webhook Event Logging & Monitoring - Index & Navigation

**Quick reference and navigation guide for the complete webhook monitoring system.**

## Start Here

1. **Quick Overview** (5 min read)
   - File: `WEBHOOK_SYSTEM_SUMMARY.md`
   - What: Complete system summary
   - Why: Understand architecture before diving deep

2. **Setup Instructions** (30 min)
   - File: `docs/WEBHOOK_MONITORING_SETUP.md`
   - What: Step-by-step setup and configuration
   - Why: Get the system running end-to-end

3. **Deployment Checklist** (60 min)
   - File: `WAVE_2_1_DEPLOYMENT_CHECKLIST.md`
   - What: Complete deployment checklist
   - Why: Ensure nothing is missed during rollout

## Core Components

### Libraries (src/lib/webhooks/)

| File | Purpose | Usage |
|------|---------|-------|
| `eventLog.ts` | Central webhook event logging to Supabase | `import { webhookEventLogger }` |
| `idempotencyManager.ts` | Duplicate prevention via Redis | `import { checkIdempotency }` |
| `eventInspector.ts` | Event analysis and replay tools | `import { webhookEventInspector }` |
| `latencyTracker.ts` | Latency tracking and SLA monitoring | `import { latencyTracker }` |
| `webhookHandler.ts` | Comprehensive webhook handler wrapper | `import { executeWebhookHandler }` |
| `README.md` | Complete library documentation | Architecture, examples, best practices |

### Database

| File | Tables | Purpose |
|------|--------|---------|
| `migrations/006_webhook_event_logging.sql` | `webhook_events`, `webhook_event_metrics`, `webhook_replays` | Schema, indexes, triggers, functions |

### API Endpoints (src/app/api/admin/webhooks/)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events` | GET | List events with filters and stats |
| `/events/[eventId]` | GET | Get event details with context |
| `/events/[eventId]/replay` | POST | Initiate manual event replay |
| `/events/export` | GET | Export events as CSV |

### UI Components (src/components/)

| File | Purpose | Usage |
|------|---------|-------|
| `admin/WebhookMonitor.tsx` | Real-time monitoring dashboard | Add to admin pages |

### Documentation

| File | Content | Audience |
|------|---------|----------|
| `src/lib/webhooks/README.md` | Architecture, API reference, best practices | Developers |
| `docs/WEBHOOK_MONITORING_SETUP.md` | Setup, configuration, troubleshooting | DevOps, Developers |
| `docs/WEBHOOK_INTEGRATION_EXAMPLE.md` | Integration examples with code | Developers |
| `WEBHOOK_SYSTEM_SUMMARY.md` | System overview and features | All |
| `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` | Deployment checklist and sign-off | Deployment lead |
| `WEBHOOK_MONITORING_INDEX.md` | This file - navigation guide | All |

## Quick Links by Role

### I'm a Developer

1. **Setting up webhook logging**
   - Start: `docs/WEBHOOK_INTEGRATION_EXAMPLE.md`
   - Reference: `src/lib/webhooks/README.md`
   - Code: `src/lib/webhooks/` (libraries)

2. **Testing the system**
   - Examples: `docs/WEBHOOK_MONITORING_SETUP.md` > Testing section
   - Setup: `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` > Testing section

3. **Troubleshooting**
   - Quick fixes: `docs/WEBHOOK_MONITORING_SETUP.md` > Troubleshooting section
   - Details: `src/lib/webhooks/README.md` > Troubleshooting section

### I'm Deploying This

1. **Pre-deployment**
   - Checklist: `WAVE_2_1_DEPLOYMENT_CHECKLIST.md`
   - Setup: `docs/WEBHOOK_MONITORING_SETUP.md`

2. **During deployment**
   - Follow: `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` > Deployment section
   - Reference: `docs/WEBHOOK_MONITORING_SETUP.md` > Installation

3. **Post-deployment**
   - Verify: `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` > Post-Deployment
   - Monitor: `src/components/admin/WebhookMonitor.tsx`

### I'm Supporting This

1. **Understanding the system**
   - Overview: `WEBHOOK_SYSTEM_SUMMARY.md`
   - Architecture: `src/lib/webhooks/README.md` > Architecture Overview

2. **Monitoring**
   - Dashboard: `src/components/admin/WebhookMonitor.tsx`
   - Alerts: `docs/WEBHOOK_MONITORING_SETUP.md` > Monitoring & Alerts

3. **Issues**
   - Troubleshooting: `docs/WEBHOOK_MONITORING_SETUP.md` > Troubleshooting
   - Support: Check Sentry breadcrumbs (auto-generated)

## File Structure

```
hex-diva/
├── migrations/
│   └── 006_webhook_event_logging.sql (300 lines)
│
├── src/
│   ├── lib/webhooks/
│   │   ├── eventLog.ts (400 lines)
│   │   ├── idempotencyManager.ts (176 lines, updated)
│   │   ├── eventInspector.ts (460 lines)
│   │   ├── latencyTracker.ts (300 lines)
│   │   ├── webhookHandler.ts (300 lines)
│   │   └── README.md (500 lines)
│   │
│   ├── components/admin/
│   │   └── WebhookMonitor.tsx (400 lines)
│   │
│   └── app/api/admin/webhooks/
│       └── events/
│           ├── route.ts (GET list/stats)
│           ├── [eventId]/
│           │   ├── route.ts (GET details)
│           │   └── replay/route.ts (POST replay)
│           └── export/route.ts (GET CSV)
│
├── docs/
│   ├── WEBHOOK_INTEGRATION_EXAMPLE.md (400 lines)
│   └── WEBHOOK_MONITORING_SETUP.md (800 lines)
│
└── [Root docs]
    ├── WEBHOOK_SYSTEM_SUMMARY.md (800 lines)
    ├── WAVE_2_1_DEPLOYMENT_CHECKLIST.md (400 lines)
    └── WEBHOOK_MONITORING_INDEX.md (this file)
```

## Key Concepts

### Event Logging
Every webhook generates an event record:
- Timestamp, webhook ID, provider, event type
- Processing status (success/failed/duplicate)
- Full latency breakdown
- Error details if failed
- Request context (headers, metadata)

**Where it lives**: `webhook_events` table  
**Logged by**: `eventLog.ts`  
**Accessed via**: `webhookEventLogger` singleton

### Idempotency
Prevents duplicate webhook processing:
- Webhook ID extracted from provider headers
- Redis cache checked for recent processing
- Original event marked if duplicate detected
- Payload hash computed for replay detection

**Where it lives**: Redis cache + event log  
**Managed by**: `idempotencyManager.ts`  
**Accessed via**: `checkIdempotency()`, `markWebhookProcessed()`

### Latency Tracking
Monitors webhook processing performance:
- End-to-end latency measured
- Broken down by stage (signature, processing, persistence)
- Percentiles calculated (p50, p95, p99)
- SLA compliance tracked (<2s target)

**Where it lives**: In-memory + reported to dashboard  
**Tracked by**: `latencyTracker.ts`  
**Accessed via**: `latencyTracker` singleton

### Event Replay
Manual replay of webhook events:
- Original event selected
- Replay requested with reason
- Replay record created and tracked
- New event processed, results compared

**Where it lives**: `webhook_replays` table  
**Initiated via**: Dashboard button or `/api/webhooks/events/[eventId]/replay`
**Managed by**: `eventInspector.ts`

### Dashboard
Real-time monitoring interface:
- Event stream (10s polling)
- Summary statistics
- Provider-specific metrics
- Filtering and search
- Event details view
- Replay controls
- CSV export

**Component**: `WebhookMonitor.tsx`  
**Displays**: Data from `/api/admin/webhooks/events`  
**Add to**: Any admin page

## Common Tasks

### I need to...

**Log a webhook event**
```typescript
import { webhookEventLogger } from '@/lib/webhooks/eventLog';
const eventId = await webhookEventLogger.logEvent({...});
```

**Check for duplicates**
```typescript
import { checkIdempotency } from '@/lib/webhooks/idempotencyManager';
const check = await checkIdempotency('shopify', webhookId);
if (check.isDuplicate) { /* handle duplicate */ }
```

**Use integrated handler wrapper**
```typescript
import { executeWebhookHandler } from '@/lib/webhooks/webhookHandler';
return executeWebhookHandler(context, async () => {
  // your logic
  return { success: true, message: 'OK', statusCode: 200 };
});
```

**Analyze webhook patterns**
```typescript
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';
const analysis = await webhookEventInspector.analyzeEventPatterns('shopify', 24);
console.log(`Success Rate: ${analysis.successRate}%`);
```

**Get SLA report**
```typescript
import { latencyTracker } from '@/lib/webhooks/latencyTracker';
const report = latencyTracker.getSLAReport();
console.log(`SLA Breach Rate: ${report.slaBreakedRate}`);
```

**Export events for compliance**
```typescript
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';
const csv = await webhookEventInspector.exportEventsAsCSV({
  provider: 'shopify',
  startDate: new Date('2024-01-01'),
});
```

**Add dashboard to admin page**
```typescript
import { WebhookMonitor } from '@/components/admin/WebhookMonitor';
export default function Dashboard() {
  return <WebhookMonitor />;
}
```

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Signature verification | 50-100ms | Provider-specific |
| Idempotency check | 10-50ms | Redis round-trip |
| Business logic | 100-500ms | Your handler |
| Event logging | 20-50ms | Supabase insert |
| **Total SLA** | **< 2000ms** | Per webhook |
| **Typical latency** | **200-700ms** | All stages combined |
| Query response | < 100ms | Indexed queries |
| Dashboard load | < 1s | Real-time polling |

## Database Schema

### webhook_events
- `id`, `webhook_id`, `provider`, `event_type`
- `status` (success/failed/duplicate/skipped)
- `latency_ms`, `is_idempotent`, `original_event_id`
- `error_message`, `payload_hash`
- Timestamps: `created_at`, `processed_at`, `received_at`

### webhook_event_metrics
- Hourly aggregation by provider/event_type
- Counts: total, successful, failed, duplicate
- Latency: average, p50, p95, p99, max
- Success rate percentage

### webhook_replays
- `original_event_id` (what was replayed)
- `initiated_by` (who requested)
- `reason` (why replayed)
- `status`, `result_event_id`, `error_message`

## Monitoring

### Automatic (via Sentry)
- Breadcrumbs for each processing step
- Error context automatically added
- SLA breach warnings
- Failed processing alerts

### Manual (via Dashboard)
- Real-time event stream
- Success rate and failure patterns
- Latency percentiles
- Provider-specific metrics
- Error log with filters

### Custom (Optional)
- Slack alerts for high failure rate
- Email for SLA breaches
- Datadog/monitoring dashboard integration

## Maintenance

### Weekly
- Review success rate trend
- Check error patterns
- Verify duplicate detection accuracy

### Monthly
- Export compliance reports
- Analyze latency trends
- Review Sentry for new issues

### Quarterly
- Archive old events (90+ days)
- Optimize slow queries
- Update SLA targets if needed

## Getting Help

1. **"How do I implement this?"**
   - Read: `docs/WEBHOOK_INTEGRATION_EXAMPLE.md`

2. **"Where do I find the dashboard?"**
   - Add: `<WebhookMonitor />` to admin page
   - Go to: `/admin/webhooks` (if set up)

3. **"How do I troubleshoot?"**
   - Check: `docs/WEBHOOK_MONITORING_SETUP.md` > Troubleshooting
   - Check Sentry: Breadcrumbs show processing steps

4. **"What's not working?"**
   - Verify migration ran: `SELECT * FROM webhook_events LIMIT 1;`
   - Check Sentry for errors
   - Review logs in `/api/admin/webhooks/events`

5. **"Need more details?"**
   - Read: `src/lib/webhooks/README.md` (comprehensive reference)
   - Check: Source code comments (JSDoc)

## Version Info

- **Wave**: 2.1
- **Created**: 2026-07-11
- **TypeScript**: Strict mode
- **Node.js**: 24.16.0
- **Database**: Supabase PostgreSQL
- **Cache**: Upstash Redis

## Files Summary

| File Type | Count | Lines | Purpose |
|-----------|-------|-------|---------|
| Libraries | 5 | 1,500+ | Core functionality |
| API Routes | 4 | 400+ | Event access & replay |
| Components | 1 | 400+ | Dashboard UI |
| Migrations | 1 | 300+ | Database schema |
| Documentation | 6 | 3,500+ | Setup & reference |
| **Total** | **17** | **6,100+** | **Complete system** |

---

**Last Updated**: 2026-07-11  
**Status**: Production-ready  
**Owner**: Engineering Team

**Start with**: `WEBHOOK_SYSTEM_SUMMARY.md` (5 min overview)  
**Then read**: `docs/WEBHOOK_MONITORING_SETUP.md` (30 min setup)  
**Finally deploy**: `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` (60 min rollout)
