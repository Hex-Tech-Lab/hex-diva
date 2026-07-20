-- Migration 018: Allow 'paytabs' in webhook_events.provider
--
-- The PayTabs webhook (src/app/api/webhooks/paytabs/route.ts) needs the
-- same idempotency protection as the Stripe webhook -- wiring it into the
-- existing checkIdempotency/markWebhookProcessed infra (migration 006),
-- which requires 'paytabs' to be a valid provider value.

alter table public.webhook_events drop constraint if exists webhook_events_provider_check;

alter table public.webhook_events add constraint webhook_events_provider_check
  check (provider in ('shopify', 'uppromote', 'orders', 'process-order', 'stripe', 'paytabs'));
