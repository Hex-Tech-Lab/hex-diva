/**
 * POST /api/referrals/track - Track referral conversion (purchase)
 * Called when an order is placed to create commission record
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { calculateCommission, determineTier } from '@/lib/referrals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { orderId, userId, orderTotal, referralCode } = await request.json();

    // Validate required fields
    if (!orderId || !userId || !orderTotal) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, userId, orderTotal' },
        { status: 400 }
      );
    }

    if (orderTotal <= 0) {
      return NextResponse.json(
        { error: 'Invalid order total' },
        { status: 400 }
      );
    }

    // If no referral code provided, try to find from referrals table
    let referralRecord = null;

    if (referralCode) {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('referred_user_id', userId)
        .single();

      referralRecord = data;
    } else {
      // Try to find active referral for this user
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

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
    const { data: stats } = await supabase
      .from('referral_stats')
      .select('total_conversions')
      .eq('referrer_id', referralRecord.referrer_id)
      .single();

    const totalConversions = stats?.total_conversions || 0;
    const currentTier = determineTier(totalConversions);
    const commissionAmount = calculateCommission(orderTotal, currentTier);

    // Create commission record
    const { data: commission, error: commissionError } = await supabase
      .from('commissions')
      .insert({
        referrer_id: referralRecord.referrer_id,
        referral_id: referralRecord.id,
        order_id: orderId,
        order_total: orderTotal,
        commission_rate: currentTier === 'gold' ? 0.15 : currentTier === 'silver' ? 0.1 : 0.05,
        commission_amount: commissionAmount,
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

    // Update referral status to converted
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        conversion_order_id: orderId,
        conversion_amount: orderTotal,
      })
      .eq('id', referralRecord.id);

    if (updateError) {
      console.error('Referral update error:', updateError);
    }

    // Trigger stats update
    try {
      await supabase.rpc('update_referral_stats', {
        p_referrer_id: referralRecord.referrer_id,
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
