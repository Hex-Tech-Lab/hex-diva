/**
 * POST /api/referrals/track-click - Track referral link clicks
 * Called when a user visits a referral link (?ref=CODE)
 * Fire-and-forget tracking (no response body blocking)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const referralCode = searchParams.get('ref')

    if (!referralCode) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Instantiate admin client (service-role for tracking)
    const supabaseAdmin = getSupabaseAdmin()

    // Find active referral with this code
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_id')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .single()

    if (!referral) {
      // Silent fail: invalid code, don't expose
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Track click (fire-and-forget, don't block response)
    // Intentionally not awaiting this to avoid blocking the response.
    // NOTE: this endpoint always returns { success: true } to the caller
    // regardless of whether the insert below succeeds, so the redirect/pixel
    // flow is never broken by a tracking failure. But a silently swallowed
    // insert failure makes broken click-tracking invisible in practice, so
    // failures here are surfaced to Sentry (with the referral code as a tag)
    // and logged as an error rather than a generic console.error, making
    // them alertable instead of only discoverable by manually tailing logs.
    void (async () => {
      try {
        const { error: insertError } = await supabaseAdmin
          .from('referral_clicks')
          .insert({
            referral_id: referral.id,
            clicked_at: new Date().toISOString(),
          })

        if (insertError) {
          Sentry.captureException(insertError, {
            tags: { endpoint: 'referrals/track-click', referralCode },
          })
          console.error(
            `Failed to record referral click for code ${referralCode}:`,
            insertError
          )
          return
        }

        console.log(`Referral click tracked: ${referralCode}`)
      } catch (error) {
        Sentry.captureException(error, {
          tags: { endpoint: 'referrals/track-click', referralCode },
        })
        console.error('Failed to track referral click:', error)
      }
    })()

    // Always return success immediately
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    Sentry.captureException(error)
    console.error('POST /api/referrals/track-click error:', error)
    // Don't expose errors, always return success for tracking endpoints
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
