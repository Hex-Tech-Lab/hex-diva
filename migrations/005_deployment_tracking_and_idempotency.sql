/**
 * Migration 005: Deployment Tracking & Idempotency
 * - Add deployment tracking columns to admin audit log
 * - Add unique constraint to prevent duplicate commissions per order+referrer
 * - Support for webhook idempotency and admin deployment workflows
 */

-- Add deployment tracking columns to audit_log if not exists
alter table if exists public.audit_log
  add column if not exists deployment_id text,
  add column if not exists deployment_status text check (deployment_status in ('pending', 'building', 'ready', 'failed')),
  add column if not exists deployed_at timestamp with time zone;

-- Create index for deployment tracking queries
create index if not exists idx_audit_log_deployment_id on public.audit_log(deployment_id);
create index if not exists idx_audit_log_deployment_status on public.audit_log(deployment_status);

-- Add unique constraint to commissions table for referrer+order idempotency
-- This prevents duplicate commissions from the same referrer for the same order
alter table if exists public.commissions
  add constraint if not exists unique_referrer_order_commission unique (referrer_id, order_id);

-- Add index for webhook idempotency checks on commissions
create index if not exists idx_commissions_order_id on public.commissions(order_id);

-- Add webhook sync tracking columns if not already present
alter table if exists public.commissions
  add column if not exists webhook_id text,
  add column if not exists idempotency_key text,
  add column if not exists webhook_processed_at timestamp with time zone;

-- Add index for webhook deduplication
create index if not exists idx_commissions_webhook_id on public.commissions(webhook_id);
create index if not exists idx_commissions_idempotency_key on public.commissions(idempotency_key);

-- Add similar tracking to referrals table
alter table if exists public.referrals
  add column if not exists webhook_id text,
  add column if not exists webhook_processed_at timestamp with time zone;

create index if not exists idx_referrals_webhook_id on public.referrals(webhook_id);

-- Add tracking to orders table
alter table if exists public.orders
  add column if not exists referral_webhook_id text;

create index if not exists idx_orders_referral_webhook_id on public.orders(referral_webhook_id);

-- Add comment for deployment tracking
comment on column public.audit_log.deployment_id is 'Vercel deployment ID associated with this change';
comment on column public.audit_log.deployment_status is 'Current deployment status: pending, building, ready, or failed';
comment on column public.audit_log.deployed_at is 'Timestamp when deployment was completed';

comment on column public.commissions.webhook_id is 'Webhook ID that triggered this commission for idempotency';
comment on column public.commissions.idempotency_key is 'Unique key for idempotent processing';
comment on column public.commissions.webhook_processed_at is 'Timestamp when webhook was processed';

comment on column public.referrals.webhook_id is 'Webhook ID that triggered this referral';
comment on column public.referrals.webhook_processed_at is 'Timestamp when referral webhook was processed';

comment on column public.orders.referral_webhook_id is 'Webhook ID for referral attribution tracking';
