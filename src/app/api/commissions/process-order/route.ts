import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { checkIdempotency, markWebhookProcessed } from '@/lib/webhooks/idempotencyManager';
import type { OrderRecord, ReferralRecord } from '@/types/database.types';
import {
  processOrderCommission,
  updateReferralStats,
  linkReferralToSignup,
} from '@/lib/referrals';

/**
 * POST /api/commissions/process-order
 * Process commission for an order (typically called by webhook)
 * Body: { orderId: string, referralToken?: string }
 * Implements idempotency to prevent duplicate commission processing
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.SHOPIFY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, referralToken, userId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Use orderId as idempotency key for this internal API
    const idempotencyCheck = await checkIdempotency('process-order', orderId);
    if (idempotencyCheck.isDuplicate) {
      console.log(`[Idempotent] Duplicate order commission request detected (${orderId})`);
      return NextResponse.json({
        success: true,
        message: 'Order commission already processed',
        idempotent: true,
        commission: idempotencyCheck.previousResult?.data,
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single<OrderRecord>();

    if (orderError || !order) {
      const result = { success: false, message: 'Order not found' };
      await markWebhookProcessed('process-order', orderId, result);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    let referrerId: string | null = null;

    // If referral token provided, find the referrer
    if (referralToken) {
      const { data: referral, error: refError } = await supabaseAdmin
        .from('referrals')
        .select('referrer_id, referred_user_id')
        .eq('referral_token', referralToken)
        .single<ReferralRecord>();

      if (!refError && referral) {
        referrerId = referral.referrer_id;

        // Link referral to user if they haven't been linked yet
        if (!referral.referred_user_id && userId) {
          await linkReferralToSignup(referralToken, userId);
        }
      }
    }

    // If no referral token but user has a referrer in metadata
    if (!referrerId && order.user_id) {
      // Check if the order user was referred by someone
      const { data: referral, error: refError } = await supabaseAdmin
        .from('referrals')
        .select('referrer_id')
        .eq('referred_user_id', order.user_id)
        .single<ReferralRecord>();

      if (!refError && referral) {
        referrerId = referral.referrer_id;
      }
    }

    if (!referrerId) {
      const result = { success: true, message: 'No referrer found for this order' };
      await markWebhookProcessed('process-order', orderId, result);
      return NextResponse.json(result);
    }

    // Process commission
    const commission = await processOrderCommission(
      referrerId,
      orderId,
      order.total
    );

    // Update referral stats
    await updateReferralStats(referrerId);

    // Mark as processed with commission data
    const result = { success: true, message: 'Commission processed', data: commission };
    await markWebhookProcessed('process-order', orderId, result);

    return NextResponse.json({
      success: true,
      commission,
    });
  } catch (error) {
    console.error('Error processing order commission:', error);
    // Mark as failed
    try {
      const body = await request.json();
      await markWebhookProcessed('process-order', body.orderId, {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // Ignore errors marking failure
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
