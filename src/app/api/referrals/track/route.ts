/**
 * POST /api/referrals/track - Track referral conversion (purchase)
 * Called when an order is placed to create commission record
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateCommission, determineTier } from '@/lib/referrals';
import { supabaseAdmin } from '@/lib/db';

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

    // Verify the order exists and get its data
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .select('id, user_id, total')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found or invalid' },
        { status: 404 }
      );
    }

    const userId = (order as any).user_id;
    const orderTotal = (order as any).total;

    if (orderTotal <= 0) {
      return NextResponse.json(
        { error: 'Invalid order total' },
        { status: 400 }
      );
    }

    // Find referral record
    let referralRecord = null;

    if (referralCode) {
      const { data } = await (supabaseAdmin as any)
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('referred_user_id', userId)
        .single();

      referralRecord = data as any;
    } else {
      // Try to find active referral for this user
      const { data } = await (supabaseAdmin as any)
        .from('referrals')
        .select('*')
        .eq('referred_user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      referralRecord = data as any;
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
    const { data: stats } = await (supabaseAdmin as any)
      .from('referral_stats')
      .select('total_conversions')
      .eq('referrer_id', referralRecord.referrer_id)
      .single();

    const totalConversions = (stats as any)?.total_conversions || 0;
    const currentTier = determineTier(totalConversions);
    const commissionAmount = calculateCommission(orderTotal, currentTier);

    // Create commission record
    const { data: commission, error: commissionError } = await (supabaseAdmin as any)
      .from('commissions')
      .insert({
        referrer_id: (referralRecord as any)?.referrer_id,
        referral_id: (referralRecord as any)?.id,
        order_id: orderId,
        amount: commissionAmount,
        tier: currentTier,
        status: 'pending',
      })
      .select()
      .single();

    if (commissionError) {
      console.error('Commission creation error:', commissionError);
      return NextResponse.json(
        { error: 'Failed to create commission record' },
        { status: 500 }
      );
    }

    // Update referral status to active if not already converted
    const { error: updateError } = await (supabaseAdmin as any)
      .from('referrals')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', (referralRecord as any)?.id)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Referral update error:', updateError);
    }

    // Trigger stats update
    try {
      await (supabaseAdmin as any).rpc('update_referral_stats', {
        p_referrer_id: (referralRecord as any)?.referrer_id,
      });
    } catch (error) {
      console.error('Stats update error:', error);
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
