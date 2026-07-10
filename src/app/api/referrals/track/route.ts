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

    if (!orderId || !userId || !orderTotal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let referralRecord = referralCode
      ? (await supabase.from('referrals').select('*').eq('referral_code', referralCode).eq('referred_user_id', userId).single()).data
      : (await supabase.from('referrals').select('*').eq('referred_user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()).data;

    if (!referralRecord) {
      return NextResponse.json({ success: false, message: 'No referral found' }, { status: 200 });
    }

    const { data: stats } = await supabase.from('referral_stats').select('total_conversions').eq('referrer_id', referralRecord.referrer_id).single();
    const currentTier = determineTier(stats?.total_conversions || 0);
    const commissionAmount = calculateCommission(orderTotal, currentTier);

    const { data: commission, error } = await supabase.from('commissions').insert({
      referrer_id: referralRecord.referrer_id,
      referral_id: referralRecord.id,
      order_id: orderId,
      order_total: orderTotal,
      commission_rate: currentTier === 'gold' ? 0.15 : currentTier === 'silver' ? 0.1 : 0.05,
      commission_amount: commissionAmount,
      tier: currentTier,
      status: 'pending',
    }).select().single();

    if (error) return NextResponse.json({ error: 'Commission creation failed' }, { status: 500 });

    await supabase.from('referrals').update({
      status: 'converted',
      converted_at: new Date().toISOString(),
      conversion_order_id: orderId,
      conversion_amount: orderTotal,
    }).eq('id', referralRecord.id);

    return NextResponse.json({ success: true, commission });
  } catch (error) {
    console.error('Track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
