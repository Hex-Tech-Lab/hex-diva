/**
 * POST /api/referrals/track - Track referral conversion (purchase)
 * Called when an order is placed to create commission record
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateCommission, determineTier, getTierConfig } from '@/lib/referrals';
import { getSupabaseAdmin } from '@/lib/db';
import type {
  OrderRecord,
  ReferralRecord,
  ReferralStatsRecord,
  CommissionRecord,
} from '@/types/database.types';

export async function POST(request: NextRequest) {
  try {
    const { orderId, referralCode } = await request.json();

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify the order exists and get its data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total')
      .eq('id', orderId)
      .single<OrderRecord>();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found or invalid' },
        { status: 404 }
      );
    }

    const userId = order.user_id;
    const orderTotal = order.total;

    if (orderTotal <= 0) {
      return NextResponse.json(
        { error: 'Invalid order total' },
        { status: 400 }
      );
    }

    // Find referral record
    let referralRecord: ReferralRecord | null = null;

    if (referralCode) {
      const { data } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('referred_user_id', userId)
        .single<ReferralRecord>();

      referralRecord = data;
    } else {
      // Try to find active referral for this user
      const { data } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('referred_user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single<ReferralRecord>();

      referralRecord = data;
    }

    if (!referralRecord) {
      return NextResponse.json(
        {
          success: false,
          message: 'No referral found for this order',
        },
        { status: 200 }
      );
    }

    // Get referrer stats to calculate tier
    const { data: stats } = await supabaseAdmin
      .from('referral_stats')
      .select('total_conversions')
      .eq('referrer_id', referralRecord.referrer_id)
      .single<ReferralStatsRecord>();

    const totalConversions = stats?.total_conversions || 0;
    const currentTier = determineTier(totalConversions);
    const commissionAmount = calculateCommission(orderTotal, currentTier);

    // Create commission record
    const { data: commission, error: commissionError } = await supabaseAdmin
      .from('commissions')
      .insert({
        referrer_id: referralRecord.referrer_id,
        referral_id: referralRecord.id,
        order_id: orderId,
        amount: commissionAmount,
        rate: getTierConfig(currentTier).rate,
        tier: currentTier as 'bronze' | 'silver' | 'gold' | 'custom',
        status: 'pending',
        order_total: orderTotal,
      })
      .select()
      .single<CommissionRecord>();

    if (commissionError) {
      console.error('Commission creation error:', commissionError);
      return NextResponse.json(
        { error: 'Failed to create commission record' },
        { status: 500 }
      );
    }

    // Update referral status to claimed if still pending
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', referralRecord.id)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Referral update error:', updateError);
    }

    // Update stats atomically via RPC (Law #1: atomic operations only)
    // CRITICAL: Never use manual UPDATE for referral stats
    const { error: rpcError } = await supabaseAdmin.rpc(
      'update_referral_stats_atomic',
      {
        p_referrer_id: referralRecord.referrer_id,
        p_commission_amount: commissionAmount,
        p_order_total: orderTotal,
      }
    );

    if (rpcError) {
      console.error('RPC update_referral_stats_atomic error:', rpcError);
      // RPC error is not critical; commission was already created
      // Stats will be eventually consistent via daily reconciliation
    }

    return NextResponse.json({
      success: true,
      commission,
      message: `Commission of $${commissionAmount} created for tier: ${currentTier}`,
    });
  } catch (error) {
    console.error('POST /api/referrals/track error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
