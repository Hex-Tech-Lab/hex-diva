import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import {
  processOrderCommission,
  updateReferralStats,
  linkReferralToSignup,
} from '@/lib/referrals';

/**
 * POST /api/commissions/process-order
 * Process commission for an order (typically called by webhook)
 * Body: { orderId: string, referralToken?: string }
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get order details
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    let referrerId: string | null = null;

    // If referral token provided, find the referrer
    if (referralToken) {
      const { data: referral, error: refError } = await (supabaseAdmin as any)
        .from('referrals')
        .select('referrer_id, referred_user_id')
        .eq('referral_token', referralToken)
        .single();

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
      const { data: referral, error: refError } = await (supabaseAdmin as any)
        .from('referrals')
        .select('referrer_id')
        .eq('referred_user_id', order.user_id)
        .single();

      if (!refError && referral) {
        referrerId = referral.referrer_id;
      }
    }

    if (!referrerId) {
      return NextResponse.json({
        success: true,
        message: 'No referrer found for this order',
      });
    }

    // Process commission
    const commission = await processOrderCommission(
      referrerId,
      orderId,
      order.total
    );

    // Update referral stats
    await updateReferralStats(referrerId);

    return NextResponse.json({
      success: true,
      commission,
    });
  } catch (error) {
    console.error('Error processing order commission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
