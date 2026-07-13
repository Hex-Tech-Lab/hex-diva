/**
 * Admin API Endpoint: Monthly Commission Tier Reset
 * POST /api/admin/commissions/reset-monthly
 *
 * Manually triggers the monthly volume reset and tier recalculation
 * Requires admin authentication
 * Returns detailed results including tier changes and affected users
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAndResetMonthlyVolumes, logMonthlyResetAudit } from '@/lib/commissions/monthlyResetScheduler'
import { verifyAdminAccess } from '@/lib/admin/auth'

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(req)
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: admin access required' },
        { status: 403 }
      )
    }

    // Execute monthly reset
    const results = await checkAndResetMonthlyVolumes()

    // Log audit trail
    await logMonthlyResetAudit(results)

    // Count tier changes
    const tierChanges = results.filter((r) => r.tierChanged)
    const tierDowngrades = results.filter((r) => r.tierDowngrade)
    const tierUpgrades = tierChanges.filter((r) => !r.tierDowngrade)

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalAffiliatesReset: results.length,
          tierChanges: tierChanges.length,
          tierDowngrades: tierDowngrades.length,
          tierUpgrades: tierUpgrades.length,
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
    console.error('[MonthlyReset API] Error:', error)
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
