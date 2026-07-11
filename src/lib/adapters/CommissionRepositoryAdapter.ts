/**
 * Commission Repository Adapter
 * Implements ICommissionRepository port using Supabase
 * Concrete implementation of domain port for database access
 */

import type { ICommissionRepository } from '@/lib/ports'
import type {
  CommissionRecord as DbCommissionRecord,
  CommissionInsert,
  ReferralStatsRecord,
  CommissionPayoutRecord,
  CommissionPayoutInsert,
} from '@/types/database.types'

/**
 * Supabase-backed implementation of ICommissionRepository
 * Handles all database operations for commissions and referral stats
 * Uses request-scoped Supabase client for RLS context isolation
 */
export class CommissionRepositoryAdapter implements ICommissionRepository {
  async approveCommission(commissionId: string): Promise<DbCommissionRecord> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data, error } = await supabaseAdmin
      .from('commissions')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', commissionId)
      .select()
      .single<DbCommissionRecord>()

    if (error) throw error
    return data
  }

  async processOrderCommission(
    referrerId: string,
    orderId: string,
    orderTotal: number
  ): Promise<DbCommissionRecord> {
    const { supabaseAdmin } = await import('@/lib/db')

    // Check if commission already exists for this order+referrer combination (idempotency)
    const { data: existingCommission, error: existingError } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('referrer_id', referrerId)
      .eq('order_id', orderId)
      .maybeSingle<DbCommissionRecord>()

    if (existingError && existingError.code !== 'PGRST116') throw existingError

    if (existingCommission) {
      console.log(
        `[Commission] Idempotent return: commission already exists for order ${orderId} by referrer ${referrerId}`
      )
      return existingCommission
    }

    // Import domain logic for pure calculations
    const { determineTier, calculateCommission, getTierConfig } = await import('@/lib/referrals')

    const { data: stats, error: statsError } = await supabaseAdmin
      .from('referral_stats')
      .select('total_conversions')
      .eq('referrer_id', referrerId)
      .single<ReferralStatsRecord>()

    if (statsError && statsError.code !== 'PGRST116') throw statsError

    const totalConversions = stats?.total_conversions || 0
    const tier = determineTier(totalConversions)
    const commission = calculateCommission(orderTotal, tier)

    const insertPayload: CommissionInsert = {
      referrer_id: referrerId,
      order_id: orderId,
      amount: commission,
      rate: getTierConfig(tier).rate,
      tier: tier as 'bronze' | 'silver' | 'gold' | 'custom',
      status: 'pending',
      order_total: orderTotal,
    }

    const { data, error } = await supabaseAdmin
      .from('commissions')
      .insert(insertPayload)
      .select()
      .single<DbCommissionRecord>()

    if (error) throw error
    return data
  }

  async createPayout(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    amount: number
  ): Promise<CommissionPayoutRecord> {
    const { supabaseAdmin } = await import('@/lib/db')

    const insertPayload: CommissionPayoutInsert = {
      referrer_id: userId,
      user_id: userId,
      amount,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: 'pending',
    }

    const { data, error } = await supabaseAdmin
      .from('commission_payouts')
      .insert(insertPayload)
      .select()
      .single<CommissionPayoutRecord>()

    if (error) throw error
    return data
  }

  async markPayoutAsPaid(
    payoutId: string,
    stripeTransferId: string
  ): Promise<CommissionPayoutRecord> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data, error } = await supabaseAdmin
      .from('commission_payouts')
      .update({
        status: 'paid',
        stripe_transfer_id: stripeTransferId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId)
      .select()
      .single<CommissionPayoutRecord>()

    if (error) throw error
    return data
  }

  async getPendingCommissions(userId: string): Promise<DbCommissionRecord[]> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data, error } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('referrer_id', userId)
      .eq('status', 'pending')

    if (error) throw error
    return (data || []) as DbCommissionRecord[]
  }

  async linkReferralToSignup(referralToken: string, userId: string): Promise<void> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { error } = await supabaseAdmin
      .from('referrals')
      .update({ referred_user_id: userId })
      .eq('referral_token', referralToken)

    if (error) throw error
  }

  async updateReferralStats(referrerId: string): Promise<void> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data: stats, error: statsError } = await supabaseAdmin
      .from('referral_stats')
      .select('*')
      .eq('referrer_id', referrerId)
      .single<ReferralStatsRecord>()

    if (statsError && statsError.code !== 'PGRST116') throw statsError

    if (!stats) {
      await supabaseAdmin.from('referral_stats').insert({
        referrer_id: referrerId,
        total_referrals: 0,
        total_conversions: 0,
        total_commission_earned: 0,
        volume_ytd: 0,
      })
    }
  }

  async getReferralStats(referrerId: string): Promise<ReferralStatsRecord | null> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { data, error } = await supabaseAdmin
      .from('referral_stats')
      .select('*')
      .eq('referrer_id', referrerId)
      .single<ReferralStatsRecord>()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }
}
