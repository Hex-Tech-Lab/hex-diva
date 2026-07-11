# Wave 2.1 Webhook Monitoring - Deployment Checklist

Complete checklist for deploying the webhook event logging and monitoring system.

## Pre-Deployment

- [ ] Review `WEBHOOK_SYSTEM_SUMMARY.md` for overview
- [ ] Read `docs/WEBHOOK_MONITORING_SETUP.md` for complete guide
- [ ] Review code changes in `src/lib/webhooks/` directory
- [ ] Check migration `migrations/006_webhook_event_logging.sql`
- [ ] Ensure team is familiar with new components
- [ ] Allocate time for testing (estimated: 4-6 hours)

## Database Migration

- [ ] Run migration: `npx supabase migration up`
- [ ] Verify tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name LIKE 'webhook%';
  ```
- [ ] Verify indexes created:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename LIKE 'webhook%';
  ```
- [ ] Verify functions created:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_name LIKE 'log_webhook%' OR routine_name LIKE 'update_webhook%';
  ```
- [ ] Test RLS policies (admins can read, service role can write)

## Core Libraries Installation

- [ ] `src/lib/webhooks/eventLog.ts` - ✅ Created
- [ ] `src/lib/webhooks/idempotencyManager.ts` - ✅ Updated
- [ ] `src/lib/webhooks/eventInspector.ts` - ✅ Created
- [ ] `src/lib/webhooks/latencyTracker.ts` - ✅ Created
- [ ] `src/lib/webhooks/webhookHandler.ts` - ✅ Created
- [ ] `src/lib/webhooks/README.md` - ✅ Created
- [ ] Verify imports in each file
- [ ] Run TypeScript type check: `pnpm type-check`

## API Endpoints Installation

- [ ] `src/app/api/admin/webhooks/events/route.ts` - ✅ Created (GET)
- [ ] `src/app/api/admin/webhooks/events/[eventId]/route.ts` - ✅ Created (GET)
- [ ] `src/app/api/admin/webhooks/events/[eventId]/replay/route.ts` - ✅ Created (POST)
- [ ] `src/app/api/admin/webhooks/events/export/route.ts` - ✅ Created (GET CSV)
- [ ] Verify all routes return correct status codes
- [ ] Test with curl/Postman

## Dashboard Component

- [ ] `src/components/admin/WebhookMonitor.tsx` - ✅ Created
- [ ] Add to admin dashboard page:
  ```typescript
  import { WebhookMonitor } from '@/components/admin/WebhookMonitor';
  // In your admin page component:
  <WebhookMonitor />
  ```
- [ ] Verify component renders without errors
- [ ] Check styling (Tailwind classes, shadcn/ui components)
- [ ] Test responsive design (mobile, tablet, desktop)

## Webhook Route Integration

Choose integration approach for each route:

### Shopify Webhook (Option 1: Recommended)
- [ ] Update `src/app/api/webhooks/shopify/route.ts`
- [ ] Import `executeWebhookHandler`
- [ ] Wrap handler with context parameters
- [ ] Test with real Shopify webhook (or mock)
- [ ] Verify events logged to Supabase

### Uppromote Webhook
- [ ] Update `src/app/api/webhooks/uppromote/route.ts`
- [ ] Use same integration pattern as Shopify
- [ ] Test with Uppromote webhooks
- [ ] Verify event_type extraction

### Orders Webhook
- [ ] Update `src/app/api/webhooks/orders/route.ts`
- [ ] Use integration pattern
- [ ] Test order attribution tracking
- [ ] Verify webhook_id extraction

### [Any Other Webhooks]
- [ ] Update remaining webhook handlers
- [ ] Test each one independently
- [ ] Verify event logging for each

## Configuration & Environment

- [ ] Verify Supabase URL in `.env.local`
- [ ] Verify Redis URL (Upstash) in `.env.local`
- [ ] Verify Sentry DSN configured
- [ ] No new environment variables needed
- [ ] Check `.env.example` is up to date

## Testing

### Unit Tests
- [ ] Write test for `webhookEventLogger.logEvent()`
- [ ] Write test for `checkIdempotency()` / `markWebhookProcessed()`
- [ ] Write test for `latencyTracker.recordWebhookLatency()`
- [ ] Run: `pnpm test`

### Integration Tests
- [ ] Test full webhook flow (POST to endpoint)
- [ ] Verify event created in Supabase
- [ ] Verify duplicate detection works
- [ ] Verify API endpoints return correct data
- [ ] Test CSV export
- [ ] Test replay initiation

### Manual Testing
- [ ] Send test webhook via provider dashboard
- [ ] Verify event appears in webhook_events table
- [ ] Send duplicate webhook, verify duplicate detection
- [ ] Check WebhookMonitor dashboard displays event
- [ ] Click event details, verify full context shown
- [ ] Click replay button, verify replay record created
- [ ] Test time range filtering
- [ ] Test provider filtering
- [ ] Test status filtering
- [ ] Export CSV and verify format
- [ ] Check Sentry breadcrumbs for event

### Performance Testing
- [ ] Send 100 webhooks in rapid succession
- [ ] Verify all logged without errors
- [ ] Check latency metrics in dashboard
- [ ] Verify SLA report generated correctly
- [ ] Monitor database performance (CPU, disk I/O)

## Monitoring & Alerts Setup

### Sentry
- [ ] Verify webhook errors appear in Sentry
- [ ] Check breadcrumbs are created
- [ ] Setup alert for failed webhooks
- [ ] Setup alert for SLA breaches (latency > 2s)

### Custom Alerts (Optional)
- [ ] Setup Slack webhook for high failure rate
- [ ] Setup email for SLA breaches
- [ ] Setup dashboard monitoring (Datadog, etc.)

### Dashboard
- [ ] Add WebhookMonitor to admin home
- [ ] Create monitoring runbook with screenshots
- [ ] Document common issues and solutions

## Documentation

- [ ] ✅ Create `WEBHOOK_SYSTEM_SUMMARY.md`
- [ ] ✅ Create `docs/WEBHOOK_MONITORING_SETUP.md`
- [ ] ✅ Create `docs/WEBHOOK_INTEGRATION_EXAMPLE.md`
- [ ] ✅ Create `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` (this file)
- [ ] ✅ Create `src/lib/webhooks/README.md`
- [ ] Update team wiki/docs with quick reference
- [ ] Create runbook for common issues
- [ ] Create link to dashboards from admin panel

## Pre-Production Testing

- [ ] Test in staging environment first
- [ ] Use staging Supabase project
- [ ] Send staging webhooks from providers
- [ ] Monitor for 24 hours
- [ ] Review metrics and error logs
- [ ] Get team sign-off

## Production Deployment

- [ ] Create feature branch: `feature/webhook-monitoring-wave-2-1`
- [ ] Commit all changes
- [ ] Create pull request with description
- [ ] Get code review approval
- [ ] Run CI/CD tests
- [ ] Deploy to production
- [ ] Run database migration on production
- [ ] Verify webhook tables exist
- [ ] Monitor error logs for first hour
- [ ] Check real webhook events are being logged
- [ ] Verify dashboard shows data

## Post-Deployment

### Day 1
- [ ] Monitor Sentry for any errors
- [ ] Check webhook_events table growth
- [ ] Verify all providers sending webhooks successfully
- [ ] Test each webhook type manually
- [ ] Monitor latency metrics
- [ ] Check SLA report

### Week 1
- [ ] Review success rate and failure patterns
- [ ] Analyze duplicate detection accuracy
- [ ] Identify any performance issues
- [ ] Review Sentry breadcrumbs for insights
- [ ] Share initial metrics with team

### Month 1
- [ ] Archive initial setup notes
- [ ] Optimize any slow queries
- [ ] Adjust SLA thresholds if needed
- [ ] Setup automated compliance reports
- [ ] Create monitoring dashboard (Datadog, etc.)

## Rollback Plan

If critical issues occur:

1. **Quick rollback** (no code changes needed):
   - Keep webhook routes using `executeWebhookHandler`
   - Idempotency continues via Redis
   - Just stop accessing dashboard

2. **Full rollback** (revert changes):
   - Remove event logging from webhook routes
   - Keep idempotency manager
   - Database tables remain (no data loss)
   - Delete tables if needed: `DROP TABLE webhook_events;`

3. **Recovery**:
   - Restore from backup if needed
   - Re-run migration to recreate tables
   - Re-integrate webhook routes

## Maintenance Schedule

### Daily
- [ ] Monitor SLA report
- [ ] Check error log for spikes
- [ ] Verify all webhooks processed successfully

### Weekly
- [ ] Review success rate trend
- [ ] Analyze failure patterns
- [ ] Check Sentry for new error types
- [ ] Verify replica detection accuracy

### Monthly
- [ ] Export compliance reports
- [ ] Archive old events (if retention policy active)
- [ ] Review and optimize slow queries
- [ ] Update runbooks based on incidents

### Quarterly
- [ ] Review SLA targets and adjust if needed
- [ ] Analyze long-term trends
- [ ] Plan performance improvements
- [ ] Update documentation

## Support Resources

| Resource | Location |
|----------|----------|
| System Overview | `WEBHOOK_SYSTEM_SUMMARY.md` |
| Setup Guide | `docs/WEBHOOK_MONITORING_SETUP.md` |
| Integration Examples | `docs/WEBHOOK_INTEGRATION_EXAMPLE.md` |
| API Documentation | `src/lib/webhooks/README.md` |
| Quick Reference | `WEBHOOK_SYSTEM_SUMMARY.md` |
| Deployment Checklist | `WAVE_2_1_DEPLOYMENT_CHECKLIST.md` (this file) |

## Sign-Off

### Development
- [ ] Implemented: _________________ Date: _______
- [ ] Tested: _________________ Date: _______

### QA
- [ ] Tested: _________________ Date: _______
- [ ] Approved: _________________ Date: _______

### DevOps/Infra
- [ ] Deployed: _________________ Date: _______
- [ ] Verified: _________________ Date: _______

### Product/Management
- [ ] Reviewed: _________________ Date: _______
- [ ] Approved: _________________ Date: _______

## Notes

```
[Use this section for any notes, issues encountered, or special configuration needed]

- Issue: [Describe issue]
  Resolution: [How it was resolved]
  Date: [When resolved]

- Configuration: [Any special config beyond defaults]
  Date: [When configured]

- Decision: [Any decisions made during deployment]
  Rationale: [Why this decision]
  Date: [When decided]
```

---

**Estimated Time to Completion**: 6-8 hours (initial deployment), then ongoing maintenance

**Owner**: [Team name]  
**Last Updated**: 2024-07-11  
**Status**: Ready for deployment
