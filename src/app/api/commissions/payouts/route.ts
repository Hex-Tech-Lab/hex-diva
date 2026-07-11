/**
 * GET /api/commissions/payouts - Get user's payout history
 * POST /api/commissions/payouts - Request payout (only for pending commissions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getSupabaseAdmin } from '@/lib/db';
import type {
  UserRecord,
  CommissionPayoutRecord,
} from '@/types/database.types';

const MINIMUM_PAYOUT_AMOUNT = 25; // Minimum $25 to request payout

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single<UserRecord>();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get payouts with details
    const { data: payouts, error: payoutsError } = await supabaseAdmin
      .from('commission_payouts')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (payoutsError) {
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500 }
      );
    }

    // Get pending commission amount
    const { data: pendingCommissions } = await supabaseAdmin
      .from('commissions')
      .select('amount')
      .eq('referrer_id', user.id)
      .eq('status', 'pending');

    const pendingAmount = pendingCommissions?.reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0) || 0;

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

    const supabaseAdmin = getSupabaseAdmin();

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .single<UserRecord>();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get pending commissions
    const { data: pendingCommissions, error: commissionsError } = await supabaseAdmin
      .from('commissions')
      .select('id, amount')
      .eq('referrer_id', user.id)
      .eq('status', 'pending');

    if (commissionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch pending commissions' },
        { status: 500 }
      );
    }

    const totalPending = pendingCommissions?.reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0) || 0;

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

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('commission_payouts')
      .insert({
        referrer_id: user.id,
        user_id: user.id,
        amount: totalPending,
        status: 'pending',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .select()
      .single<CommissionPayoutRecord>();

    if (payoutError) {
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    // Mark commissions as approved (will be paid when payout completes)
    if (pendingCommissions && pendingCommissions.length > 0) {
      const commissionIds = pendingCommissions.map((c: { id: string; amount: number }) => c.id);

      await supabaseAdmin
        .from('commissions')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
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
