import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db'
import type { CommissionRecord } from '@/types/database.types'
import {
  createPayout,
  markPayoutAsPaid,
  getPendingCommissions,
} from '@/lib/referrals'
import { CommissionRepositoryAdapter } from '@/lib/adapters/CommissionRepositoryAdapter'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * GET /api/commissions/payout
 * Retrieve payout information and pending/approved commission summary for authenticated user
 *
 * @param {NextRequest} request - HTTP request with Bearer token authorization
 * @returns {Promise<NextResponse>} Payout status with pending/approved amounts and counts
 *
 * @example
 * GET /api/commissions/payout
 * Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "pendingAmount": 150.00,
 *   "pendingCommissionsCount": 3,
 *   "approvedAmount": 450.00,
 *   "approvedCommissionsCount": 2,
 *   "readyForPayout": true
 * }
 *
 * @throws {401} Missing or invalid authorization token
 * @throws {500} Database query error
 *
 * @remarks Pending commissions are awaiting admin approval; approved commissions can be paid out
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

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
    const commissionRepo = new CommissionRepositoryAdapter()
    const pendingCommissions = await getPendingCommissions(user.id, commissionRepo)

    // Get approved but unpaid commissions
    const { data: approvedCommissions, error: approvedError } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('referrer_id', user.id)
      .eq('status', 'approved');

    if (approvedError) {
      throw approvedError;
    }

    const pendingAmount = pendingCommissions.reduce(
      (sum: number, c: CommissionRecord) => sum + (c.amount || 0),
      0
    );

    const approvedAmount = (approvedCommissions || []).reduce(
      (sum: number, c: CommissionRecord) => sum + (c.amount || 0),
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
 * Process payout for approved commissions via Stripe
 * Creates payout record, transfers funds, and updates commission statuses to 'paid'
 *
 * @param {NextRequest} request - HTTP request with Bearer token and JSON body
 * @returns {Promise<NextResponse>} Payout confirmation with Stripe transfer ID and amount
 *
 * @example
 * POST /api/commissions/payout
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * { "stripeAccountId": "acct_123abc" }
 *
 * Response 200:
 * {
 *   "success": true,
 *   "payoutId": "payout_456",
 *   "stripeTransferId": "tr_789xyz",
 *   "amount": 450.00,
 *   "message": "Payout of $450.00 processed successfully"
 * }
 *
 * @throws {401} Missing or invalid authorization token
 * @throws {400} No stripeAccountId, no approved commissions, or amount < $5 minimum
 * @throws {500} Stripe transfer error or database update failure
 *
 * @remarks Minimum payout amount is $5.00; calculates monthly period from current date; updates all approved commissions to 'paid' status
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const commissionRepo = new CommissionRepositoryAdapter()

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { stripeAccountId } = body

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account ID required' },
        { status: 400 }
      )
    }

    // Get approved commissions
    const { data: approvedCommissions, error: commError } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('referrer_id', user.id)
      .eq('status', 'approved')

    if (commError || !approvedCommissions || approvedCommissions.length === 0) {
      return NextResponse.json(
        { error: 'No approved commissions to payout' },
        { status: 400 }
      )
    }

    const totalAmount = approvedCommissions.reduce(
      (sum: number, c: CommissionRecord) => sum + (c.amount || 0),
      0
    )

    // Minimum payout: $5
    if (totalAmount < 5) {
      return NextResponse.json(
        {
          error: 'Minimum payout amount is $5.00',
          totalAmount,
        },
        { status: 400 }
      )
    }

    // Create payout record
    const payoutPeriodStart = new Date()
    payoutPeriodStart.setDate(1) // Start of month
    const payoutPeriodEnd = new Date(payoutPeriodStart)
    payoutPeriodEnd.setMonth(payoutPeriodEnd.getMonth() + 1)
    payoutPeriodEnd.setDate(0) // End of month

    const payout = await createPayout(
      user.id,
      payoutPeriodStart,
      payoutPeriodEnd,
      totalAmount,
      commissionRepo
    )

    try {
      // Process payout through Stripe
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: 'usd',
          destination: stripeAccountId,
          description: `Monthly referral commission payout for ${payoutPeriodStart.toLocaleDateString()}`,
        }
      )

      // Mark payout as paid
      await markPayoutAsPaid(payout.id, transfer.id, commissionRepo)

      // Update commission statuses to paid
      const { error: updateError } = await supabaseAdmin
        .from('commissions')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .in('id', approvedCommissions.map((c: CommissionRecord) => c.id));

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
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown error';

      // Update payout with error
      const { error: updateError } = await supabaseAdmin
        .from('commission_payouts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error('Error updating payout status:', updateError);
      }

      return NextResponse.json(
        {
          error: 'Payout processing failed',
          details: errorMessage,
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
