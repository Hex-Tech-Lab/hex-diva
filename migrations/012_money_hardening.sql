-- Migration 012: Money-path hardening
-- (0) Add columns the mig-009 RPC references but prod referral_stats lacks
--     (volume_month, volume_month_reset_at, created_at) — verified missing in prod
--     2026-07-16; without these the RPC throws at first invocation.
-- (a) update_referral_stats_atomic now also tracks volume_ytd (insert + atomic increment)
-- (b) Partial unique index on commission_payouts(referrer_id, stripe_transfer_id)
--     to block duplicate payout inserts for the same external transfer reference.

-- 0. Schema alignment: columns referenced by the RPC and runtime code
ALTER TABLE public.referral_stats ADD COLUMN IF NOT EXISTS volume_month decimal(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.referral_stats ADD COLUMN IF NOT EXISTS volume_month_reset_at timestamp with time zone DEFAULT now();
ALTER TABLE public.referral_stats ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

-- 1. Extend atomic referral stats RPC with volume_ytd tracking
CREATE OR REPLACE FUNCTION public.update_referral_stats_atomic(
    p_referrer_id UUID,
    p_commission_amount DECIMAL(10, 2),
    p_order_total DECIMAL(10, 2)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.referral_stats (
        referrer_id,
        total_conversions,
        total_commission_earned,
        volume_month,
        volume_ytd,
        volume_month_reset_at,
        created_at,
        updated_at
    )
    VALUES (
        p_referrer_id,
        1,
        p_commission_amount,
        COALESCE(p_order_total, 0),
        COALESCE(p_order_total, 0),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (referrer_id)
    DO UPDATE SET
        total_conversions = public.referral_stats.total_conversions + 1,
        total_commission_earned = public.referral_stats.total_commission_earned + p_commission_amount,
        volume_month = public.referral_stats.volume_month + COALESCE(p_order_total, 0),
        volume_ytd = public.referral_stats.volume_ytd + COALESCE(p_order_total, 0),
        updated_at = NOW();
END;
$$;

-- 2. One payout row per (referrer, external transfer reference)
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_payouts_referrer_transfer
    ON public.commission_payouts(referrer_id, stripe_transfer_id)
    WHERE stripe_transfer_id IS NOT NULL;
