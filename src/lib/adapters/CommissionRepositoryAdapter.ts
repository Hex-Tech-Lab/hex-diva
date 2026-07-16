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
// Note: CommissionInsert and CommissionPayoutInsert are private to this adapter
// and are not exposed through the port interface

/**
 * Supabase-backed implementation of ICommissionRepository
 * Handles all database operations for commissions and referral stats
 * Uses request-scoped Supabase client for RLS context isolation
 */
export class CommissionRepositoryAdapter implements ICommissionRepository {
  /**
   * Approve a commission for payout (status: pending → approved)
   * @param commissionId - Unique commission identifier
   * @returns Updated DbCommissionRecord with approved status and updated_at timestamp
   * @throws If commission not found or database error occurs
   */
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

  /**
   * Process commission from order (creates commission record from order total and tier)
   * Idempotent: returns existing commission if (referrer_id, order_id) already has a record
   * @param referrerId - User ID of the referrer/affiliate
   * @param orderId - Unique order identifier
   * @param orderTotal - Order total amount in dollars
   * @returns DbCommissionRecord with calculated amount based on current tier rate
   * @remarks Calculates amount based on referrer's total_conversions → tier → rate; existing records bypass recalculation
   */
  async processOrderCommission(
    referrerId: string,
    orderId: string,
    orderTotal: number
  ): Promise<DbCommissionRecord> {
    const { supabaseAdmin } = await import('@/lib/db')

    // Import domain logic for pure calculations
    const { determineTier, calculateCommission, getTierConfig } = await import('@/lib/referrals')

    // Fetch conversions to determine tier
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
      tier_multiplier: getTierConfig(tier).rate,
      status: 'pending',
      order_total: orderTotal,
    }

    try {
      // Upsert on conflict 'referrer_id,order_id' to resolve TOCTOU race condition
      const client = supabaseAdmin as any
      const { data, error } = await client
        .from('commissions')
        .upsert(insertPayload, {
          onConflict: 'referrer_id,order_id',
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) {
        throw error
      }
      return data as DbCommissionRecord
    } catch (insertError: any) {
      // Fallback: If upsert failed, try selecting the existing record
      const { data: retryData, error: retryError } = await supabaseAdmin
        .from('commissions')
        .select('*')
        .eq('referrer_id', referrerId)
        .eq('order_id', orderId)
        .maybeSingle<DbCommissionRecord>()
      
      if (retryError) throw retryError
      if (retryData) return retryData
      throw insertError
    }
  }

  /**
   * Create a payout record for pending commissions in a period
   * @param userId - Referrer user ID
   * @param periodStart - Payout period start date (ISO format)
   * @param periodEnd - Payout period end date (ISO format)
   * @param amount - Total payout amount in dollars
   * @returns CommissionPayoutRecord with pending status
   * @throws If database insert error occurs
   */
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

  /**
   * Mark a payout as paid (status: pending → paid) via Stripe transfer
   * @param payoutId - Unique payout identifier
   * @param stripeTransferId - Stripe transfer ID for audit trail
   * @returns CommissionPayoutRecord with paid status, stripe_transfer_id, and paid_at timestamp
   * @throws If payout not found or database error occurs
   */
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

  /**
   * Get pending commissions for a user (status = pending)
   * @param userId - Referrer user ID
   * @returns Array of DbCommissionRecord in pending status, empty array if none found
   * @throws If database query error occurs (non-404)
   */
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

  /**
   * Link a referral code to a newly signed-up user
   * @param referralToken - Unique referral code/token
   * @param userId - Newly signed-up user ID to link
   * @returns Void; updates referral record referred_user_id
   * @throws If database update error occurs
   */
  async linkReferralToSignup(referralToken: string, userId: string): Promise<void> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { error } = await supabaseAdmin
      .from('referrals')
      .update({ referred_user_id: userId })
      .eq('referral_token', referralToken)

    if (error) throw error
  }

  /**
   * Update referral stats for a referrer atomically (upserts record if missing)
   * @param referrerId - Referrer user ID
   * @param commissionAmount - Commission amount to add to total_commission_earned
   * @param orderTotal - Order total to add to volume_month/volume_ytd
   * @returns Void; delegates to update_referral_stats_atomic RPC (upsert)
   * @throws If database error occurs
   */
  async updateReferralStats(
    referrerId: string,
    commissionAmount: number,
    orderTotal: number
  ): Promise<void> {
    const { supabaseAdmin } = await import('@/lib/db')

    const { error } = await supabaseAdmin.rpc('update_referral_stats_atomic', {
      p_referrer_id: referrerId,
      p_commission_amount: commissionAmount,
      p_order_total: orderTotal,
    })
    if (error) throw error
  }

  /**
   * Get referral stats for a referrer (conversions, payouts, tier, volume tracking)
   * @param referrerId - Referrer user ID
   * @returns ReferralStatsRecord if exists, null if no stats record found
   * @throws If database error occurs (non-404)
   * @remarks Includes current_tier, volume_month, volume_ytd, and payout tracking
   */
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
