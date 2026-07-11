import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import {
  createPayout,
  markPayoutAsPaid,
  getPendingCommissions,
} from '@/lib/referrals';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * GET /api/commissions/payout
 * Get payout information for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending commissions
    const pendingCommissions = await getPendingCommissions(user.id);

    // Get approved but unpaid commissions
    const { data: approvedCommissions, error: approvedError } = await (supabaseAdmin as any)
      .from('commissions')
      .select('*')
      .eq('referrer_id', user.id)
      .eq('status', 'approved');

    if (approvedError) {
      throw approvedError;
    }

    const pendingAmount = pendingCommissions.reduce(
      (sum, c) => sum + ((c as any).commission_amount || 0),
      0
    );

    const approvedAmount = ((approvedCommissions as any) || []).reduce(
      (sum: number, c: any) => sum + (c.commission_amount || 0),
      0
    );

    return NextResponse.json({
      pendingAmount,
      pendingCommissionsCount: pendingCommissions.length,
      approvedAmount,
      approvedCommissionsCount: approvedCommissions?.length || 0,
      readyForPayout: approvedAmount > 0,
    });
  } catch (error) {
    console.error('Error fetching payout info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commissions/payout
 * Process payout for approved commissions
 * Body: { stripeAccountId: string } (optional - can be fetched from user record)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { stripeAccountId } = body;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account ID required' },
        { status: 400 }
      );
    }

    // Get approved commissions
    const { data: approvedCommissions, error: commError } = await (supabaseAdmin as any)
      .from('commissions')
      .select('*')
      .eq('referrer_id', user.id)
      .eq('status', 'approved');

    if (commError || !approvedCommissions || approvedCommissions.length === 0) {
      return NextResponse.json(
        { error: 'No approved commissions to payout' },
        { status: 400 }
      );
    }

    const totalAmount = (approvedCommissions as any).reduce(
      (sum: number, c: any) => sum + (c.commission_amount || 0),
      0
    );

    // Minimum payout: $5
    if (totalAmount < 5) {
      return NextResponse.json(
        {
          error: 'Minimum payout amount is $5.00',
          totalAmount,
        },
        { status: 400 }
      );
    }

    // Create payout record
    const payoutPeriodStart = new Date();
    payoutPeriodStart.setDate(1); // Start of month
    const payoutPeriodEnd = new Date(payoutPeriodStart);
    payoutPeriodEnd.setMonth(payoutPeriodEnd.getMonth() + 1);
    payoutPeriodEnd.setDate(0); // End of month

    const payout = await createPayout(
      user.id,
      payoutPeriodStart,
      payoutPeriodEnd,
      totalAmount
    );

    try {
      // Process payout through Stripe
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: 'usd',
          destination: stripeAccountId,
          description: `Monthly referral commission payout for ${payoutPeriodStart.toLocaleDateString()}`,
        }
      );

      // Mark payout as paid
      await markPayoutAsPaid(payout.id, transfer.id);

      // Update commission statuses to paid
      const { error: updateError } = await (supabaseAdmin as any)
        .from('commissions')
        .update({ status: 'paid' })
        .in('id', (approvedCommissions as any).map((c: any) => c.id));

      if (updateError) {
        console.error('Error updating commission statuses:', updateError);
      }

      return NextResponse.json({
        success: true,
        payoutId: payout.id,
        stripeTransferId: transfer.id,
        amount: totalAmount,
        message: `Payout of $${totalAmount.toFixed(2)} processed successfully`,
      });
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);

      // Update payout with error
      const { error: updateError } = await (supabaseAdmin as any)
        .from('commission_payouts')
        .update({
          status: 'failed',
          error_message: stripeError.message,
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error('Error updating payout status:', updateError);
      }

      return NextResponse.json(
        {
          error: 'Payout processing failed',
          details: stripeError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
