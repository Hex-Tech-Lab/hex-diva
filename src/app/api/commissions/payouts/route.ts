/**
 * GET /api/commissions/payouts - Get user's payout history
 * POST /api/commissions/payouts - Request payout (only for pending commissions)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MINIMUM_PAYOUT_AMOUNT = 25; // Minimum $25 to request payout

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get payouts with details
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select(
        `
        id,
        amount,
        status,
        period_start,
        period_end,
        payment_method,
        created_at,
        completed_at,
        notes
        `
      )
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (payoutsError) {
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500 }
      );
    }

    // Get pending commission amount
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
    console.error('GET /api/commissions/payouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { paymentMethod } = await request.json();

    if (!paymentMethod || !['stripe_connect', 'bank_transfer'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get pending commissions
    const { data: pendingCommissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('id, commission_amount')
      .eq('referrer_id', user.id)
      .eq('status', 'pending');

    if (commissionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch pending commissions' },
        { status: 500 }
      );
    }

    const totalPending = pendingCommissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

    if (totalPending < MINIMUM_PAYOUT_AMOUNT) {
      return NextResponse.json(
        {
          error: `Minimum payout amount is $${MINIMUM_PAYOUT_AMOUNT}. You have $${totalPending.toFixed(2)} pending.`,
        },
        { status: 400 }
      );
    }

    // Create payout record
    const periodStart = new Date();
    periodStart.setDate(1); // First day of month
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
        notes: `Payout request from ${user.email}`,
      })
      .select()
      .single();

    if (payoutError) {
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    // Mark commissions as approved (will be paid when payout completes)
    if (pendingCommissions && pendingCommissions.length > 0) {
      const commissionIds = pendingCommissions.map(c => c.id);

      await supabase
        .from('commissions')
        .update({
          status: 'approved',
          payout_id: payout.id,
        })
        .in('id', commissionIds);
    }

    return NextResponse.json({
      success: true,
      payout,
      message: `Payout request created for $${totalPending.toFixed(2)}`,
    });
  } catch (error) {
    console.error('POST /api/commissions/payouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
