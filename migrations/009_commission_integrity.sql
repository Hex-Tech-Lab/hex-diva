-- Migration 009: Commission Integrity & Referral Stats Atomic RPC
-- Dedupe existing rows (keep earliest) on commissions table, then add unique index.

-- 1. Dedupe commissions table: Keep the earliest commission record for any given (referrer_id, order_id)
DELETE FROM public.commissions
WHERE id NOT IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY referrer_id, order_id 
                   ORDER BY created_at ASC, id ASC
               ) as row_num
        FROM public.commissions
    ) sub
    WHERE sub.row_num = 1
);

-- 2. Create unique index if not exists to enforce single commission per referrer + order
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_referrer_order ON public.commissions(referrer_id, order_id);

-- 3. Create or replace atomic RPC for updating referral stats to avoid race conditions
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
        volume_month_reset_at,
        created_at,
        updated_at
    )
    VALUES (
        p_referrer_id,
        1,
        p_commission_amount,
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
        updated_at = NOW();
END;
$$;
