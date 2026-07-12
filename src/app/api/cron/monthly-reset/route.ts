/**
 * Cron Endpoint: Monthly Commission Tier Reset
 * GET /api/cron/monthly-reset
 *
 * Automatically triggered monthly (1st of month at 00:00 UTC)
 * Resets affiliate volume and recalculates commission tiers
 * Verifies Vercel cron signature using HMAC-SHA256
 *
 * Environment Variables:
 * - CRON_SECRET: 32-character hex string for HMAC verification
 *
 * Vercel Configuration (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/monthly-reset",
 *       "schedule": "0 0 1 * *"
 *     }
 *   ]
 * }
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { checkAndResetMonthlyVolumes, logMonthlyResetAudit } from '@/lib/commissions/monthlyResetScheduler'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Verify Vercel cron signature using timing-safe HMAC comparison
 * Vercel sends the cron path as the HMAC payload
 *
 * @param request - Next.js request object
 * @returns true if signature is valid, false otherwise
 */
function verifyCronSignature(request: NextRequest): boolean {
  const cronHeader = request.headers.get('x-vercel-cron')
  if (!cronHeader) {
    console.warn('[MonthlyCron] Missing x-vercel-cron header')
    return false
  }

  if (!CRON_SECRET) {
    console.error('[MonthlyCron] CRON_SECRET not configured')
    return false
  }

  // Vercel sends the request path as the payload (e.g., "/api/cron/monthly-reset")
  const payload = '/api/cron/monthly-reset'

  try {
    const hash = createHmac('sha256', CRON_SECRET)
      .update(payload, 'utf8')
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(hash), Buffer.from(cronHeader))
  } catch (error) {
    console.error('[MonthlyCron] Signature verification error:', error)
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify Vercel cron signature
    if (!verifyCronSignature(req)) {
      console.warn('[MonthlyCron] Unauthorized: invalid signature')
      return NextResponse.json(
        { error: 'Unauthorized: invalid cron signature' },
        { status: 401 }
      )
    }

    console.log('[MonthlyCron] Starting monthly volume reset...')
    const startTime = Date.now()

    // Execute monthly reset
    const results = await checkAndResetMonthlyVolumes()

    // Log audit trail
    await logMonthlyResetAudit(results)

    // Count tier changes
    const tierChanges = results.filter((r) => r.tierChanged)
    const tierDowngrades = results.filter((r) => r.tierDowngrade)
    const tierUpgrades = tierChanges.filter((r) => !r.tierDowngrade)

    const duration = Date.now() - startTime

    console.log(
      `[MonthlyCron] Completed in ${duration}ms: ` +
      `${results.length} affiliates reset, ` +
      `${tierDowngrades.length} downgrades, ` +
      `${tierUpgrades.length} upgrades`
    )

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalAffiliatesReset: results.length,
          tierChanges: tierChanges.length,
          tierDowngrades: tierDowngrades.length,
          tierUpgrades: tierUpgrades.length,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
        results: results.map((r) => ({
          referrerId: r.referrerId,
          email: r.email || 'unknown',
          previousTier: r.previousTier,
          newTier: r.newTier,
          tierChanged: r.tierChanged,
          tierDowngrade: r.tierDowngrade,
          volumeReset: 0,
          volumeMonthResetAt: r.volumeMonthResetAt,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[MonthlyCron] Fatal error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Monthly reset failed',
        details: message,
      },
      { status: 500 }
    )
  }
}
