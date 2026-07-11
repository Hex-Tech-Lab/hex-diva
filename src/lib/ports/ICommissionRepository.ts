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
   * Approve a commission for payout
   */
  approveCommission(commissionId: string): Promise<DbCommissionRecord>

  /**
   * Process commission from order (creates commission record)
   * Idempotent: returns existing commission if (referrer_id, order_id) already has a record
   */
  processOrderCommission(
    referrerId: string,
    orderId: string,
    orderTotal: number
  ): Promise<DbCommissionRecord>

  /**
   * Create a payout record
   */
  createPayout(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    amount: number
  ): Promise<CommissionPayoutRecord>

  /**
   * Mark a payout as paid
   */
  markPayoutAsPaid(
    payoutId: string,
    stripeTransferId: string
  ): Promise<CommissionPayoutRecord>

  /**
   * Get pending commissions for a user
   */
  getPendingCommissions(userId: string): Promise<DbCommissionRecord[]>

  /**
   * Link a referral to a signup/user
   */
  linkReferralToSignup(referralToken: string, userId: string): Promise<void>

  /**
   * Update referral stats for a referrer
   */
  updateReferralStats(referrerId: string): Promise<void>

  /**
   * Get referral stats for a referrer
   */
  getReferralStats(referrerId: string): Promise<ReferralStatsRecord | null>
}
