/**
 * Commission Repository Port
 * Abstracts database access for commission records
 * Allows domain logic to remain independent of concrete DB implementations
 */

import type {
  CommissionRecord as DbCommissionRecord,
  ReferralStatsRecord,
  CommissionPayoutRecord,
} from '@/types/database.types'

export interface ICommissionRepository {
  /**
   * Approve a commission for payout (status: pending → approved)
   * @param commissionId - Unique commission identifier
   * @returns Updated DbCommissionRecord with approved status
   * @remarks Only pending commissions can transition to approved
   */
  approveCommission(commissionId: string): Promise<DbCommissionRecord>

  /**
   * Process commission from order (creates commission record from order total and tier)
   * Idempotent: returns existing commission if (referrer_id, order_id) already has a record
   * @param referrerId - User ID of the referrer/affiliate
   * @param orderId - Unique order identifier
   * @param orderTotal - Order total amount in dollars
   * @returns DbCommissionRecord with calculated amount based on current tier rate
   * @remarks Calculates amount based on referrer's current_tier; existing records bypass recalculation
   */
  processOrderCommission(
    referrerId: string,
    orderId: string,
    orderTotal: number
  ): Promise<DbCommissionRecord>

  /**
   * Create a payout record for pending commissions in a period
   * @param userId - Referrer user ID
   * @param periodStart - Payout period start (ISO date)
   * @param periodEnd - Payout period end (ISO date)
   * @param amount - Total payout amount in dollars
   * @returns CommissionPayoutRecord with pending status and timestamp
   */
  createPayout(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    amount: number
  ): Promise<CommissionPayoutRecord>

  /**
   * Mark a payout as paid (status: pending → paid) via Stripe transfer
   * @param payoutId - Unique payout identifier
   * @param stripeTransferId - Stripe transfer ID for audit trail
   * @returns CommissionPayoutRecord with paid status and transfer reference
   */
  markPayoutAsPaid(
    payoutId: string,
    stripeTransferId: string
  ): Promise<CommissionPayoutRecord>

  /**
   * Get pending commissions for a user (status = pending)
   * @param userId - Referrer user ID
   * @returns Array of DbCommissionRecord in pending status
   */
  getPendingCommissions(userId: string): Promise<DbCommissionRecord[]>

  /**
   * Link a referral code to a newly signed-up user
   * @param referralToken - Unique referral code/token
   * @param userId - Newly signed-up user ID
   * @returns Void; updates referral record status to claimed
   */
  linkReferralToSignup(referralToken: string, userId: string): Promise<void>

  /**
   * Update referral stats for a referrer (total_conversions, total_commission_earned, etc.)
   * @param referrerId - Referrer user ID
   * @returns Void; aggregates commission data into referral_stats record
   * @remarks Called after commission creation to keep stats in sync
   */
  updateReferralStats(referrerId: string): Promise<void>

  /**
   * Get referral stats for a referrer (conversions, payouts, tier, volume tracking)
   * @param referrerId - Referrer user ID
   * @returns ReferralStatsRecord if exists, null if no stats record
   * @remarks Includes current_tier, volume_month, volume_ytd, and payout tracking
   */
  getReferralStats(referrerId: string): Promise<ReferralStatsRecord | null>
}
