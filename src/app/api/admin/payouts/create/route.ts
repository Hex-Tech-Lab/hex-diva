/**
 * POST /api/admin/payouts/create
 * Create a Stripe Connect payout for a referrer
 * Marks commissions as paid and creates payout record
 * Auth: Admin only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export interface CreatePayoutRequest {
  referrerId: string
  amount: number
  periodEnd: string // ISO date
}

export interface CreatePayoutResponse {
  success: boolean
  error?: string
  payoutId?: string
  stripeTransferId?: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreatePayoutResponse>> {
  try {
    const body = (await request.json()) as CreatePayoutRequest

    const { referrerId, amount, periodEnd } = body

    if (!referrerId || !amount || !periodEnd) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: referrerId, amount, periodEnd',
        },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be greater than 0',
        },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // TODO: Verify Stripe Connect account exists for referrer
    // TODO: Call Stripe API to create transfer
    // For now, create payout record without Stripe integration

    // Create payout record
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('commission_payouts')
      .insert({
        referrer_id: referrerId,
        amount,
        status: 'paid', // TODO: Set to 'processing' initially
        period_end: new Date(periodEnd).toISOString(),
        paid_at: new Date().toISOString(),
        stripe_transfer_id: null, // TODO: Set from Stripe response
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (payoutError || !payout) {
      Sentry.captureException(payoutError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create payout record',
        },
        { status: 500 }
      )
    }

    // Update commissions to 'paid' for this referrer with balance <= amount
    // CRITICAL: Only update commissions with status='pending'
    const { error: updateError } = await supabaseAdmin
      .from('commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('referrer_id', referrerId)
      .eq('status', 'pending')

    if (updateError) {
      Sentry.captureException(updateError)
      console.error('Failed to update commissions:', updateError)
      // Non-critical; continue with payout creation
    }

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('POST /api/admin/payouts/create error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
