import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MINIMUM_PAYOUT_AMOUNT = 25;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: payouts } = await supabase
      .from('payouts')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    const { data: pendingCommissions } = await supabase
      .from('commissions')
      .select('commission_amount')
      .eq('referrer_id', user.id)
      .eq('status', 'pending');

    const pendingAmount = pendingCommissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

    return NextResponse.json({
      payouts: payouts || [],
      pendingAmount,
      minimumPayoutAmount: MINIMUM_PAYOUT_AMOUNT,
      canRequestPayout: pendingAmount >= MINIMUM_PAYOUT_AMOUNT,
    });
  } catch (error) {
    console.error('Payouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethod } = await request.json();

    if (!paymentMethod || !['stripe_connect', 'bank_transfer'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: pendingCommissions } = await supabase
      .from('commissions')
      .select('id, commission_amount')
      .eq('referrer_id', user.id)
      .eq('status', 'pending');

    const totalPending = pendingCommissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

    if (totalPending < MINIMUM_PAYOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum payout is $${MINIMUM_PAYOUT_AMOUNT}` },
        { status: 400 }
      );
    }

    const periodStart = new Date();
    periodStart.setDate(1);
    const periodEnd = new Date();

    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        referrer_id: user.id,
        amount: totalPending,
        status: 'pending',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (payoutError) {
      return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 });
    }

    if (pendingCommissions && pendingCommissions.length > 0) {
      const commissionIds = pendingCommissions.map(c => c.id);
      await supabase
        .from('commissions')
        .update({ status: 'approved', payout_id: payout.id })
        .in('id', commissionIds);
    }

    return NextResponse.json({ success: true, payout, message: `Payout request created` });
  } catch (error) {
    console.error('Payout POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
