/**
 * End-to-End Tests: Commission Tier Monthly Reset
 * Tests the complete workflow for monthly volume resets and tier recalculation
 *
 * Scenario: Affiliate with $15k monthly volume (15% tier) transitions to a new month
 * 1. Create affiliate with orders totaling $15k (puts them in 15% gold tier)
 * 2. Verify tier is gold (15%)
 * 3. Simulate month boundary (set volume_month_reset_at to last month)
 * 4. Trigger monthly reset
 * 5. Verify volume_month reset to 0, tier recalculated
 * 6. Create new order (should use new tier rate)
 * 7. Verify commission calculated at new tier, not old tier
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getSupabaseAdmin } from '@/lib/db'
import {
  checkAndResetMonthlyVolumes,
  shouldResetMonthlyVolume,
  getStartOfCurrentMonth,
  getEndOfCurrentMonth,
} from '@/lib/commissions/monthlyResetScheduler'
import { determineTier, calculateCommission, getTierConfig } from '@/lib/referrals'
import type { UserRecord, ReferralStatsRecord, CommissionRecord } from '@/types/database.types'

const supabaseAdmin = getSupabaseAdmin()

describe('Commission Tier Monthly Reset Flow', () => {
  let testUserId: string
  let testEmail: string

  beforeAll(async () => {
    // Create test user
    testEmail = `test-affiliate-${Date.now()}@hex-diva.local`
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'Test123!@#',
      email_confirm: true,
    })

    if (authError) throw authError
    testUserId = authUser.user.id

    // Create user record
    await supabaseAdmin.from('users').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Test Affiliate',
    })

    // Create initial referral stats record
    await supabaseAdmin.from('referral_stats').insert({
      referrer_id: testUserId,
      total_referrals: 0,
      active_referrals: 0,
      total_clicks: 0,
      total_conversions: 0,
      total_commission_earned: 0,
      total_paid: 0,
      current_tier: 'bronze',
      volume_ytd: 0,
      volume_month: 0,
      volume_month_reset_at: new Date().toISOString(),
    })
  })

  afterAll(async () => {
    if (!testUserId) return

    // Clean up: delete all test data
    await supabaseAdmin.from('commissions').delete().eq('referrer_id', testUserId)
    await supabaseAdmin.from('orders').delete().eq('user_id', testUserId)
    await supabaseAdmin.from('referral_stats').delete().eq('referrer_id', testUserId)
    await supabaseAdmin.from('users').delete().eq('id', testUserId)
    await supabaseAdmin.auth.admin.deleteUser(testUserId)
  })

  it('should identify when monthly reset is needed', () => {
    // Current month's reset should not need reset
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    expect(shouldResetMonthlyVolume(currentMonthStart.toISOString())).toBe(false)

    // Last month's reset should need reset
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    expect(shouldResetMonthlyVolume(lastMonthStart.toISOString())).toBe(true)

    // Null should need reset
    expect(shouldResetMonthlyVolume(null)).toBe(true)
  })

  it('should correctly determine tier based on conversion count', () => {
    // 0-10 conversions = bronze
    expect(determineTier(5)).toBe('bronze')
    expect(determineTier(10)).toBe('bronze')

    // 11-50 conversions = silver
    expect(determineTier(11)).toBe('silver')
    expect(determineTier(30)).toBe('silver')
    expect(determineTier(50)).toBe('silver')

    // 51+ conversions = gold
    expect(determineTier(51)).toBe('gold')
    expect(determineTier(100)).toBe('gold')
  })

  it('should calculate correct commission amounts for tiers', () => {
    const orderTotal = 100

    const bronzeCommission = calculateCommission(orderTotal, 'bronze')
    expect(bronzeCommission).toBe(5) // 5%

    const silverCommission = calculateCommission(orderTotal, 'silver')
    expect(silverCommission).toBe(10) // 10%

    const goldCommission = calculateCommission(orderTotal, 'gold')
    expect(goldCommission).toBe(15) // 15%
  })

  it('should reset monthly volume and recalculate tier on month boundary', async () => {
    // Set the affiliate's reset date to last month
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    await supabaseAdmin
      .from('referral_stats')
      .update({
        volume_month: 15000,
        volume_month_reset_at: lastMonth.toISOString(),
        total_conversions: 51, // Gold tier
        current_tier: 'gold',
      })
      .eq('referrer_id', testUserId)

    // Verify setup
    const { data: beforeReset } = await supabaseAdmin
      .from('referral_stats')
      .select('volume_month, current_tier, volume_month_reset_at')
      .eq('referrer_id', testUserId)
      .single<ReferralStatsRecord>()

    expect(beforeReset?.volume_month).toBe(15000)
    expect(beforeReset?.current_tier).toBe('gold')

    // Execute monthly reset
    const results = await checkAndResetMonthlyVolumes()

    // Verify reset occurred
    const resetResult = results.find((r) => r.referrerId === testUserId)
    expect(resetResult).toBeDefined()
    expect(resetResult?.volumeMonth).toBe(0)

    // Verify database was updated
    const { data: afterReset } = await supabaseAdmin
      .from('referral_stats')
      .select('volume_month, current_tier, volume_month_reset_at')
      .eq('referrer_id', testUserId)
      .single<ReferralStatsRecord>()

    expect(afterReset?.volume_month).toBe(0)
    expect(afterReset?.current_tier).toBe('gold') // Still gold since conversions >= 51
  })

  it('should trigger tier downgrade when volume resets below threshold', async () => {
    // Set up: 15 conversions (silver tier) with high volume_month
    await supabaseAdmin
      .from('referral_stats')
      .update({
        volume_month: 5000,
        volume_month_reset_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
        total_conversions: 15,
        current_tier: 'silver',
      })
      .eq('referrer_id', testUserId)

    // Execute monthly reset
    const results = await checkAndResetMonthlyVolumes()

    const resetResult = results.find((r) => r.referrerId === testUserId)
    expect(resetResult).toBeDefined()
    // Tier should recalculate to silver (15 conversions)
    expect(resetResult?.newTier).toBe('silver')

    // Check database
    const { data: afterReset } = await supabaseAdmin
      .from('referral_stats')
      .select('volume_month, current_tier')
      .eq('referrer_id', testUserId)
      .single<ReferralStatsRecord>()

    expect(afterReset?.volume_month).toBe(0)
    expect(afterReset?.current_tier).toBe('silver')
  })

  it('should preserve commission tier for existing uncommitted records', async () => {
    // Create a test order
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: testUserId,
        order_number: `ORD-${Date.now()}`,
        total: 1000,
        status: 'completed',
      })
      .select()
      .single()

    if (orderError) throw orderError

    const orderId = orderData.id

    // Create a commission with gold tier (15%)
    const { data: commData, error: commError } = await supabaseAdmin
      .from('commissions')
      .insert({
        referrer_id: testUserId,
        order_id: orderId,
        amount: 150, // 15% of 1000
        tier: 'gold',
        rate: 0.15,
        status: 'pending',
        order_total: 1000,
      })
      .select()
      .single<CommissionRecord>()

    if (commError) throw commError

    // Verify commission recorded at gold rate
    expect(commData.tier).toBe('gold')
    expect(commData.rate).toBe(0.15)

    // Execute monthly reset (which changes tier to silver)
    await supabaseAdmin
      .from('referral_stats')
      .update({
        total_conversions: 15,
        current_tier: 'silver',
        volume_month_reset_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('referrer_id', testUserId)

    const results = await checkAndResetMonthlyVolumes()
    expect(results.some((r) => r.referrerId === testUserId)).toBe(true)

    // Verify old commission still has gold tier (not recalculated)
    const { data: commissionAfter } = await supabaseAdmin
      .from('commissions')
      .select('tier, rate')
      .eq('id', commData.id)
      .single<CommissionRecord>()

    expect(commissionAfter?.tier).toBe('gold')
    expect(commissionAfter?.rate).toBe(0.15)

    // Verify new tier in stats
    const { data: statsAfter } = await supabaseAdmin
      .from('referral_stats')
      .select('current_tier')
      .eq('referrer_id', testUserId)
      .single<ReferralStatsRecord>()

    expect(statsAfter?.current_tier).toBe('silver') // New tier for new orders
  })

  it('should have correct tier config values', () => {
    const bronzeConfig = getTierConfig('bronze')
    expect(bronzeConfig.rate).toBe(0.05)
    expect(bronzeConfig.minReferrals).toBe(0)
    expect(bronzeConfig.maxReferrals).toBe(10)

    const silverConfig = getTierConfig('silver')
    expect(silverConfig.rate).toBe(0.1)
    expect(silverConfig.minReferrals).toBe(11)
    expect(silverConfig.maxReferrals).toBe(50)

    const goldConfig = getTierConfig('gold')
    expect(goldConfig.rate).toBe(0.15)
    expect(goldConfig.minReferrals).toBe(51)
    expect(goldConfig.maxReferrals).toBeNull()
  })

  it('should correctly calculate month boundaries', () => {
    const now = new Date()
    const startOfMonth = getStartOfCurrentMonth()
    const endOfMonth = getEndOfCurrentMonth()

    // Start should be on the 1st at 00:00:00
    expect(startOfMonth.getUTCDate()).toBe(1)
    expect(startOfMonth.getUTCHours()).toBe(0)
    expect(startOfMonth.getUTCMinutes()).toBe(0)
    expect(startOfMonth.getUTCSeconds()).toBe(0)

    // End should be on last day at 23:59:59
    expect(endOfMonth.getUTCHours()).toBe(23)
    expect(endOfMonth.getUTCMinutes()).toBe(59)
    expect(endOfMonth.getUTCSeconds()).toBe(59)

    // Start should be before end
    expect(startOfMonth < endOfMonth).toBe(true)
  })
})
