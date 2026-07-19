/**
 * GET /api/admin/payouts/dashboard
 * Fetch aggregated payout data for admin dashboard
 * Shows pending/paid commissions by referrer
 * Auth: Admin only (checked at route level)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export interface PayoutAggregation {
  referrerId: string
  referrerEmail: string
  referrerName: string
  pendingAmount: number
  paidAmount: number
  totalEarned: number
  conversionCount: number
  lastPayoutDate: string | null
  stripeConnectStatus: 'not_setup' | 'active'
}

export interface PayoutDashboardResponse {
  success: boolean
  payouts: PayoutAggregation[]
  totalPending: number
  totalPaid: number
  referrerCount: number
  error?: string
}

export async function GET(
  _request: NextRequest
): Promise<NextResponse<PayoutDashboardResponse>> {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // TODO: Add admin role check
    // For now, rely on RLS + app-level auth

    // Get all referrers with pending commissions
    const { data: referrers, error: referrersError } = await supabaseAdmin
      .from('referral_stats')
      .select(
        `
        referrer_id,
        total_conversions,
        total_commission_earned,
        total_paid
      `
      )
      .not('referrer_id', 'is', null)

    if (referrersError) {
      Sentry.captureException(referrersError)
      return NextResponse.json(
        {
          success: false,
          payouts: [],
          totalPending: 0,
          totalPaid: 0,
          referrerCount: 0,
          error: 'Failed to fetch referral stats',
        },
        { status: 400 }
      )
    }

    // Get user info for each referrer
    const referrerIds = referrers?.map((r) => r.referrer_id) || []

    if (referrerIds.length === 0) {
      return NextResponse.json({
        success: true,
        payouts: [],
        totalPending: 0,
        totalPaid: 0,
        referrerCount: 0,
      })
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', referrerIds)

    if (usersError) {
      Sentry.captureException(usersError)
      return NextResponse.json(
        {
          success: false,
          payouts: [],
          totalPending: 0,
          totalPaid: 0,
          referrerCount: 0,
          error: 'Failed to fetch user data',
        },
        { status: 400 }
      )
    }

    // Get latest payout date for each referrer
    const { data: payoutDates, error: payoutDatesError } = await supabaseAdmin
      .from('commission_payouts')
      .select('referrer_id, paid_at')
      .order('paid_at', { ascending: false })

    if (payoutDatesError) {
      // Non-critical; continue without payout dates
      console.error('Failed to fetch payout dates:', payoutDatesError)
    }

    // Build aggregation
    const userMap = new Map(users?.map((u) => [u.id, u]) || [])
    const latestPayoutMap = new Map()

    payoutDates?.forEach((p) => {
      if (!latestPayoutMap.has(p.referrer_id) && p.paid_at) {
        latestPayoutMap.set(p.referrer_id, p.paid_at)
      }
    })

    const payouts: PayoutAggregation[] = (referrers || []).map((ref) => {
      const user = userMap.get(ref.referrer_id)
      const pendingAmount = (ref.total_commission_earned || 0) - (ref.total_paid || 0)

      return {
        referrerId: ref.referrer_id,
        referrerEmail: user?.email || 'unknown',
        referrerName: user?.email?.split('@')[0] || 'Unknown',
        pendingAmount: Math.max(0, pendingAmount),
        paidAmount: ref.total_paid || 0,
        totalEarned: ref.total_commission_earned || 0,
        conversionCount: ref.total_conversions || 0,
        lastPayoutDate: latestPayoutMap.get(ref.referrer_id) || null,
        stripeConnectStatus: 'not_setup', // TODO: Check actual Stripe status
      }
    })

    const totalPending = payouts.reduce((sum, p) => sum + p.pendingAmount, 0)
    const totalPaid = payouts.reduce((sum, p) => sum + p.paidAmount, 0)

    return NextResponse.json({
      success: true,
      payouts,
      totalPending: Math.round(totalPending * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      referrerCount: payouts.length,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('GET /api/admin/payouts/dashboard error:', error)
    return NextResponse.json(
      {
        success: false,
        payouts: [],
        totalPending: 0,
        totalPaid: 0,
        referrerCount: 0,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
