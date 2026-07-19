/**
 * POST /api/referrals/stripe-connect-link
 * Create a Stripe Connect account link for referrer onboarding
 * Allows referrers to set up their Stripe account for payouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export interface StripeConnectLinkRequest {
  userId: string
}

export interface StripeConnectLinkResponse {
  success: boolean
  accountLink?: {
    url: string
  }
  error?: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<StripeConnectLinkResponse>> {
  try {
    const body = (await request.json()) as StripeConnectLinkRequest
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId',
        },
        { status: 400 }
      )
    }

    // TODO: Implement Stripe Connect account link creation
    // This requires:
    // 1. Stripe API key in environment
    // 2. Stripe account object creation for the referrer
    // 3. Account link generation for onboarding
    //
    // For now, return a placeholder response
    // Actual implementation:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    // const account = await stripe.accounts.create({
    //   type: 'express',
    //   country: 'US',
    //   email: referrerEmail,
    // })
    // const accountLink = await stripe.accountLinks.create({
    //   account: account.id,
    //   type: 'account_onboarding',
    //   refresh_url: 'https://...'/referrals?stripe_refresh=true',
    //   return_url: 'https://...'/referrals?stripe_success=true',
    // })

    const supabaseAdmin = getSupabaseAdmin()

    // Get referrer email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    // Placeholder: return mock Stripe Connect URL
    // In production, use actual Stripe API
    const mockAccountLink = {
      url: `https://connect.stripe.com/onboarding/express?redirect_url=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}/referrals`,
    }

    return NextResponse.json({
      success: true,
      accountLink: mockAccountLink,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('POST /api/referrals/stripe-connect-link error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
