-- ============================================================================
-- Commission Tier Monthly Reset Infrastructure
-- Adds missing columns and ensures proper setup for monthly volume tracking
-- ============================================================================

-- Add rate and order_total columns to commissions table if not exists
alter table public.commissions add column if not exists rate decimal(5, 4) default 0.05;
alter table public.commissions add column if not exists order_total decimal(10, 2);

-- Ensure volume_month and volume_month_reset_at exist with proper defaults
-- (These were added in 004_uppromote_integration.sql but we reinforce here)
alter table public.referral_stats add column if not exists volume_month numeric(12, 2) default 0;
alter table public.referral_stats add column if not exists volume_month_reset_at timestamp with time zone default now();

-- Create index for efficient monthly reset queries
-- This index helps quickly find all affiliates that need volume reset
create index if not exists idx_referral_stats_volume_reset on public.referral_stats(volume_month_reset_at) where volume_month > 0;

-- Create index for commission tracking by referrer and order
create index if not exists idx_commissions_referrer_order on public.commissions(referrer_id, order_id);

-- Add comments for documentation
comment on column public.commissions.rate is 'Commission rate at time of calculation (decimal, e.g. 0.05 for 5%)';
comment on column public.commissions.order_total is 'Total order amount for which commission was calculated';
comment on column public.referral_stats.volume_month is 'Monthly order volume for tier calculation (resets monthly)';
comment on column public.referral_stats.volume_month_reset_at is 'Timestamp when monthly volume was last reset';
