/**
 * UpPromote Webhook Handler
 * Receives order attribution, commission approval, and payout events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import type {
  ReferralRecord,
  ReferralStatsRecord,
} from '@/types/database.types';
import {
  UpPromoteClient,
  determineCommissionTier,
  calculateCommission,
} from '@/lib/uppromote';

const UPPROMOTE_WEBHOOK_SECRET = process.env.UPPROMOTE_WEBHOOK_SECRET || '';

/**
 * Handle order.attributed event
 * When UpPromote tracks an order conversion from a referral link
 */
async function handleOrderAttributed(data: Record<string, unknown>, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { orderId, amount, referralCode } = data;

  try {
    // Find referral by code
    const { data: referral, error: refError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referral_code', String(referralCode || '') as string)
      .single<ReferralRecord>();

    if (refError || !referral) {
      console.warn(`[UpPromote] Referral not found for code: ${referralCode}`);
      return;
    }

    const ref = referral;

    // Check if commission already created for this order
    const { data: existing } = await supabaseAdmin
      .from('commissions')
      .select('id')
      .eq('order_id', String(orderId || '') as string)
      .eq('referrer_id', ref.referrer_id);

    if (existing && existing.length > 0) {
      console.log(`[UpPromote] Commission already exists for order ${orderId}`);
      return;
    }

    // Get referrer to determine tier
    const { data: stats } = await supabaseAdmin
      .from('referral_stats')
      .select('*')
      .eq('referrer_id', ref.referrer_id)
      .single<ReferralStatsRecord>();

    const tier = determineCommissionTier(stats?.volume_ytd || 0);
    const commissionAmount = calculateCommission(Number(amount), tier.commissionPercent);

    // Create commission record
    const { error: commError } = await supabaseAdmin
      .from('commissions')
      .insert({
        referrer_id: ref.referrer_id,
        order_id: String(orderId),
        referral_id: ref.id,
        amount: commissionAmount,
        rate: tier.commissionPercent / 100,
        tier: tier.name as 'bronze' | 'silver' | 'gold' | 'custom',
        tier_multiplier: tier.commissionPercent / 100,
        status: 'pending',
        order_total: Number(amount),
      });

    if (commError) {
      throw commError;
    }

    // Update referral conversion count
    await supabaseAdmin
      .from('referrals')
      .update({
        conversions: (ref.conversions || 0) + 1,
        commission_amount: (ref.commission_amount || 0) + commissionAmount,
      })
      .eq('id', ref.id);

    // Update referral stats
    const { data: currentStats } = await supabaseAdmin
      .from('referral_stats')
      .select('*')
      .eq('referrer_id', ref.referrer_id)
      .single<ReferralStatsRecord>();

    if (currentStats) {
      await supabaseAdmin
        .from('referral_stats')
        .update({
          total_conversions: (currentStats.total_conversions || 0) + 1,
          total_commission_earned: (currentStats.total_commission_earned || 0) + commissionAmount,
          volume_ytd: (currentStats.volume_ytd || 0) + Number(amount),
        })
        .eq('referrer_id', ref.referrer_id);
    }

    console.log(
      `[UpPromote] Order attributed: ${orderId} → ${ref.referrer_id}, Commission: ${commissionAmount} ${tier.name}`
    );
  } catch (error) {
    console.error('[UpPromote] Error handling order attribution:', error);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Handle commission.approved event
 * When UpPromote approves a pending commission
 */
async function handleCommissionApproved(data: Record<string, unknown>, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { orderId, amount } = data;

  try {
    const { error } = await supabaseAdmin
      .from('commissions')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('order_id', String(orderId));

    if (error) {
      throw error;
    }

    console.log(`[UpPromote] Commission approved: ${orderId}, Amount: ${amount}`);
  } catch (error) {
    console.error('[UpPromote] Error approving commission:', error);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Handle payout.processed event
 * When UpPromote initiates a payout to an affiliate
 */
async function handlePayoutProcessed(data: Record<string, unknown>, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { amount, status } = data;

  try {
    // Find referrer by UpPromote affiliate ID
    const { data: stats } = await supabaseAdmin
      .from('referral_stats')
      .select('referrer_id')
      .eq('uppromote_affiliate_id', String(data.affiliateId))
      .single<ReferralStatsRecord>();

    if (!stats) {
      console.warn(`[UpPromote] Referrer not found for affiliate: ${data.affiliateId}`);
      return;
    }

    // Create payout record
    const { error } = await supabaseAdmin
      .from('commission_payouts')
      .insert({
        referrer_id: stats.referrer_id,
        user_id: stats.referrer_id,
        amount: Number(amount),
        status: status === 'processing' ? 'processing' : 'paid',
        payout_date: status === 'paid' ? new Date().toISOString() : null,
      });

    if (error) {
      throw error;
    }

    // Update paid commission total
    if (status === 'paid') {
      const { data: currentStats } = await supabaseAdmin
        .from('referral_stats')
        .select('*')
        .eq('referrer_id', stats.referrer_id)
        .single<ReferralStatsRecord>();

      if (currentStats) {
        await supabaseAdmin
          .from('referral_stats')
          .update({
            total_paid: (currentStats.total_paid || 0) + Number(amount),
          })
          .eq('referrer_id', stats.referrer_id);
      }
    }

    console.log(`[UpPromote] Payout processed: ${data.affiliateId}, Amount: ${amount}, Status: ${status}`);
  } catch (error) {
    console.error('[UpPromote] Error processing payout:', error);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Handle affiliate.upgraded event
 * When UpPromote detects tier upgrade (volume-based)
 */
async function handleAffiliateUpgraded(data: Record<string, unknown>, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { referralCode, newTier, newCommission } = data;

  try {
    // Find referral
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referral_code', String(referralCode))
      .single<ReferralRecord>();

    if (!referral) {
      console.warn(`[UpPromote] Referral not found for code: ${referralCode}`);
      return;
    }

    // Update referral stats with new tier
    const { error } = await supabaseAdmin
      .from('referral_stats')
      .update({
        current_tier: String(newTier),
        updated_at: new Date().toISOString(),
      })
      .eq('referrer_id', referral.referrer_id);

    if (error) {
      throw error;
    }

    // Update user profile affiliate tier
    await supabaseAdmin
      .from('user_profiles')
      .update({
        affiliate_tier: String(newTier),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', referral.referrer_id);

    console.log(
      `[UpPromote] Affiliate upgraded: ${referralCode} → ${newTier}, Commission: ${newCommission}%`
    );
  } catch (error) {
    console.error('[UpPromote] Error handling affiliate upgrade:', error);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * POST /api/webhooks/uppromote
 * Webhook endpoint for UpPromote events
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const body = await request.text();
    const signature = request.headers.get('x-uppromote-signature') || '';

    // Verify webhook signature
    if (!UpPromoteClient.verifyWebhookSignature(body, signature, UPPROMOTE_WEBHOOK_SECRET)) {
      console.warn('[UpPromote] Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = UpPromoteClient.parseWebhookPayload(body);
    const { event, data } = payload;

    console.log(`[UpPromote] Received webhook: ${event}`);

    // Route to appropriate handler
    switch (event) {
      case 'order.attributed':
        await handleOrderAttributed(data, supabaseAdmin);
        break;
      case 'commission.approved':
        await handleCommissionApproved(data, supabaseAdmin);
        break;
      case 'payout.processed':
        await handlePayoutProcessed(data, supabaseAdmin);
        break;
      case 'affiliate.upgraded':
        await handleAffiliateUpgraded(data, supabaseAdmin);
        break;
      default:
        console.log(`[UpPromote] Unhandled webhook event: ${event}`);
    }

    // Log webhook delivery
    await supabaseAdmin.from('uppromote_sync_log').insert({
      event_type: event,
      payload: payload as unknown as any,
      status: 'success',
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UpPromote] Webhook error:', error);
    Sentry.captureException(error);

    // Log failed webhook
    try {
      await supabaseAdmin.from('uppromote_sync_log').insert({
        event_type: 'unknown',
        status: 'failed',
        error_message: (error as Error).message,
        payload: null,
        processed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to log webhook error:', e);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
