-- ============================================================================
-- UpPromote Affiliate Platform Integration
-- Adds necessary columns and tables for UpPromote sync
-- ============================================================================

-- Add UpPromote affiliate ID tracking to referral_stats
alter table public.referral_stats add column if not exists uppromote_affiliate_id text;
alter table public.referral_stats add column if not exists uppromote_synced_at timestamp with time zone;

-- Add UpPromote audit trail to commissions
alter table public.commissions add column if not exists uppromote_order_id text;
alter table public.commissions add column if not exists uppromote_synced_at timestamp with time zone;

-- Add affiliate tier to user_profiles
alter table public.user_profiles add column if not exists affiliate_tier text default 'starter' check (affiliate_tier in ('starter', 'growth', 'elite', 'vip'));
alter table public.user_profiles add column if not exists affiliate_custom_commission decimal(5, 2);
alter table public.user_profiles add column if not exists affiliate_status text default 'inactive' check (affiliate_status in ('inactive', 'active', 'suspended'));

-- Create UpPromote sync log for debugging and audit
create table if not exists public.uppromote_sync_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb,
  status text default 'pending' check (status in ('pending', 'success', 'failed')),
  error_message text,
  processed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create index for webhook lookup
create index if not exists idx_uppromote_sync_log_event_type on public.uppromote_sync_log(event_type);
create index if not exists idx_uppromote_sync_log_processed_at on public.uppromote_sync_log(processed_at);

-- Create index for UpPromote affiliate ID lookup
create index if not exists idx_referral_stats_uppromote_id on public.referral_stats(uppromote_affiliate_id) where uppromote_affiliate_id is not null;

-- Add comment for documentation
comment on table public.uppromote_sync_log is 'Webhook delivery log from UpPromote affiliate platform';
comment on column public.referral_stats.uppromote_affiliate_id is 'UpPromote affiliate ID for sync purposes';
comment on column public.referral_stats.uppromote_synced_at is 'Timestamp of last sync with UpPromote';
comment on column public.commissions.uppromote_order_id is 'UpPromote order reference for audit trail';
comment on column public.user_profiles.affiliate_tier is 'Current affiliate commission tier (starter/growth/elite/vip)';
comment on column public.user_profiles.affiliate_custom_commission is 'Custom commission percentage (if tier = vip)';
comment on column public.user_profiles.affiliate_status is 'Affiliate program enrollment status';
