/**
 * UpPromote Webhook Handler
 * Receives order attribution, commission approval, and payout events
 * Implements idempotency to prevent duplicate processing
 *
 * @module api/webhooks/uppromote
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { checkIdempotency, markWebhookProcessed, extractWebhookId, releaseIdempotencyKey } from '@/lib/webhooks/idempotencyManager';
import * as Sentry from '@sentry/nextjs';
import type {
  ReferralRecord,
  ReferralStatsRecord,
} from '@/types/database.types';
import {
  UpPromoteClient,
} from '@/lib/uppromote';

const UPPROMOTE_WEBHOOK_SECRET = process.env.UPPROMOTE_WEBHOOK_SECRET || '';

/**
 * Handles order.attributed event from UpPromote
 * Creates commission record and updates referral/referral_stats when order conversion detected
 * Resets monthly volume if crossing into new month for tier recalculation
 */
async function handleOrderAttributed(data: Record<string, unknown>, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { orderId, amount, referralCode } = data;

  try {
    const { CommissionRepositoryAdapter } = await import('@/lib/adapters/CommissionRepositoryAdapter');
    const commissionRepo = new CommissionRepositoryAdapter();

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

    // Process order commission using the adapter
    const commission = await commissionRepo.processOrderCommission(
      ref.referrer_id,
      String(orderId),
      Number(amount)
    );

    // Update referral conversion count
    const { error: updateRefError } = await supabaseAdmin
      .from('referrals')
      .update({
        conversions: (ref.conversions || 0) + 1,
        commission_amount: (ref.commission_amount || 0) + commission.amount,
      })
      .eq('id', ref.id);

    if (updateRefError) throw updateRefError;

    // Update referral stats atomically with this commission's amounts
    await commissionRepo.updateReferralStats(ref.referrer_id, commission.amount, Number(amount));

    console.log(
      `[UpPromote] Order attributed: ${orderId} → ${ref.referrer_id}, Commission: ${commission.amount}`
    );
  } catch (error) {
    console.error('[UpPromote] Error handling order attribution:', error);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Handles commission.approved event from UpPromote
 * Updates commission status to approved and records timestamp
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
 * Handles payout.processed event from UpPromote
 * Creates payout record and updates referral_stats with paid amount if status is 'paid'
 */
async function handlePayoutProcessed(data: Record<string, unknown>, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { amount, status, affiliateId, payoutId } = data;

  try {
    // Find referrer by UpPromote affiliate ID
    const { data: stats } = await supabaseAdmin
      .from('referral_stats')
      .select('referrer_id')
      .eq('uppromote_affiliate_id', String(affiliateId))
      .single<ReferralStatsRecord>();

    if (!stats) {
      console.warn(`[UpPromote] Referrer not found for affiliate: ${affiliateId}`);
      return;
    }

    // Check if payout record already exists to prevent duplicate processing (idempotency guard)
    const payoutRef = String(payoutId || data.reference || '');
    if (payoutRef) {
      const { data: existingPayout, error: payoutError } = await supabaseAdmin
        .from('commission_payouts')
        .select('id')
        .eq('referrer_id', stats.referrer_id)
        .eq('stripe_transfer_id', payoutRef) // or map to stripe_transfer_id/reference
        .maybeSingle();

      if (payoutError) throw payoutError;
      if (existingPayout) {
        console.log(`[UpPromote] Payout already processed for reference ${payoutRef}`);
        return;
      }
    }

    // Validate payout status - only allow known values (prevent data corruption)
    const validStatuses = ['processing', 'paid'];
    const validatedStatus = validStatuses.includes(String(status)) ? String(status) : 'pending';

    // Create payout record
    const { error } = await supabaseAdmin
      .from('commission_payouts')
      .insert({
        referrer_id: stats.referrer_id,
        user_id: stats.referrer_id,
        amount: Number(amount),
        status: validatedStatus as 'processing' | 'paid' | 'pending',
        stripe_transfer_id: payoutRef || null,
        payout_date: validatedStatus === 'paid' ? new Date().toISOString() : null,
      });

    if (error) {
      throw error;
    }

    // Update paid commission total (use validated status to prevent data corruption)
    if (validatedStatus === 'paid') {
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

    console.log(`[UpPromote] Payout processed: ${affiliateId}, Amount: ${amount}, Status: ${status}`);
  } catch (error) {
    console.error('[UpPromote] Error processing payout:', error);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Handles affiliate.upgraded event from UpPromote
 * Updates referral_stats and user_profiles with new tier and commission rate
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
 *
 * Webhook endpoint for UpPromote affiliate platform events
 *
 * Flow:
 * 1. Verify webhook signature using UPPROMOTE_WEBHOOK_SECRET
 * 2. Extract webhook ID for idempotency check (7-day TTL)
 * 3. Route to appropriate handler (order.attributed, commission.approved, payout.processed, affiliate.upgraded)
 * 4. Log event to webhook_events table via RPC function
 * 5. Mark as processed if successful, allow retry if failed
 *
 * @returns 200 OK on success (idempotent), 200 with error message on handler failure (retryable)
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

    // Extract webhook ID for idempotency
    const webhookId = extractWebhookId('uppromote', request.headers);
    if (!webhookId) {
      console.warn('[UpPromote] Missing webhook ID for idempotency check');
      return NextResponse.json({ error: 'Missing webhook ID' }, { status: 400 });
    }

    // Check for duplicate processing
    const idempotencyCheck = await checkIdempotency('uppromote', webhookId);
    if (idempotencyCheck.isDuplicate) {
      console.log(`[Idempotent] Duplicate UpPromote webhook detected: ${event} (${webhookId})`);
      return NextResponse.json({
        success: true,
        message: 'Webhook already processed',
        idempotent: true,
      });
    }

    console.log(`[UpPromote] Received webhook: ${event} (${webhookId})`);

    let processingResult = { success: true, message: `Event processed: ${event}` };

    try {
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

      // Mark webhook as processed
      await markWebhookProcessed('uppromote', webhookId, processingResult);
    } catch (handlerError) {
      console.error(`[UpPromote] Error processing event (${event}):`, handlerError);

      // Release key to allow retry (owner-token compare-and-delete; no-op without token)
      await releaseIdempotencyKey('uppromote', webhookId, idempotencyCheck.ownerToken);

      // Log failed webhook but do NOT mark as processed
      // This allows provider retries to be reprocessed on next attempt
      try {
        await supabaseAdmin.from('uppromote_sync_log').insert({
          event_type: event,
          status: 'failed',
          error_message: handlerError instanceof Error ? handlerError.message : String(handlerError),
          payload: payload as unknown as any,
          processed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[UpPromote] Failed to log webhook error:', e);
      }

      // Return 500 to signal failure and trigger provider retry
      // Webhook providers only retry on non-2xx responses
      return NextResponse.json({
        success: false,
        message: 'Handler error - webhook will be retried',
        error: handlerError instanceof Error ? handlerError.message : String(handlerError),
      }, { status: 500 });
    }

    // Log successful webhook delivery OUTSIDE the guarded try:
    // a sync-log write failure after successful processing must NOT release the
    // COMPLETED idempotency key (a provider retry would re-run money handlers)
    try {
      await supabaseAdmin.from('uppromote_sync_log').insert({
        event_type: event,
        payload: payload as unknown as any,
        status: 'success',
        processed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[UpPromote] Failed to write success sync log (webhook already processed):', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UpPromote] Webhook error:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
