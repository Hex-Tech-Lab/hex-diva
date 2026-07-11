/**
 * Referral & Commission System Core Logic
 * Handles commission calculations, tier tracking, and payout processing
 */

import type {
  CommissionRecord as DbCommissionRecord,
  CommissionInsert,
  ReferralStatsRecord,
  CommissionPayoutRecord,
  CommissionPayoutInsert,
} from '@/types/database.types'

export interface CommissionTier {
  name: 'bronze' | 'silver' | 'gold';
  minReferrals: number;
  maxReferrals: number | null;
  rate: number; // as decimal, e.g., 0.05 for 5%
  minMonthlyRevenue?: number;
}

export interface ReferralStats {
  totalReferrals: number;
  totalConversions: number;
  totalRevenue: number;
  currentTier: CommissionTier['name'];
  monthlyRevenue: number;
  pendingCommission: number;
  paidCommission: number;
}

export interface CommissionRecord {
  id: string;
  referrer_id: string;
  referred_user_id?: string;
  order_id?: string;
  amount: number;
  rate: number;
  tier: CommissionTier['name'];
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  order_total: number;
  created_at: string;
  paid_at?: string;
}

/**
 * Commission tier structure for the referral program
 * Bronze: 5% (0-10 referrals)
 * Silver: 10% (11-50 referrals)
 * Gold: 15% (51+ referrals)
 */
export const COMMISSION_TIERS: CommissionTier[] = [
  {
    name: 'bronze',
    minReferrals: 0,
    maxReferrals: 10,
    rate: 0.05,
  },
  {
    name: 'silver',
    minReferrals: 11,
    maxReferrals: 50,
    rate: 0.1,
  },
  {
    name: 'gold',
    minReferrals: 51,
    maxReferrals: null,
    rate: 0.15,
  },
];

/**
 * Determine the commission tier based on total referrals
 * @param totalReferrals - Total number of successful referrals
 * @returns Commission tier
 */
export function determineTier(totalReferrals: number): CommissionTier['name'] {
  if (totalReferrals >= 51) return 'gold';
  if (totalReferrals >= 11) return 'silver';
  return 'bronze';
}

/**
 * Get commission tier details
 * @param tier - Commission tier name
 * @returns Tier configuration
 */
export function getTierConfig(tier: CommissionTier['name']): CommissionTier {
  const config = COMMISSION_TIERS.find((t) => t.name === tier);
  if (!config) throw new Error(`Invalid tier: ${tier}`);
  return config;
}

/**
 * Calculate commission for an order
 * @param orderTotal - Total order amount
 * @param tier - Commission tier
 * @returns Commission amount
 */
export function calculateCommission(
  orderTotal: number,
  tier: CommissionTier['name'] = 'bronze'
): number {
  const tierConfig = getTierConfig(tier);
  const commission = orderTotal * tierConfig.rate;
  // Round to 2 decimal places
  return Math.round(commission * 100) / 100;
}

/**
 * Get current tier for a referrer based on stats
 * @param referralCount - Number of successful referrals
 * @returns Current tier
 */
export function getCurrentTier(referralCount: number): CommissionTier['name'] {
  return determineTier(referralCount);
}

/**
 * Get next tier requirements
 * @param currentTier - Current commission tier
 * @param currentReferrals - Current number of referrals
 * @returns Object with next tier info or null if already at max
 */
export function getNextTierInfo(
  currentTier: CommissionTier['name'],
  currentReferrals: number
): {
  nextTier: CommissionTier | null;
  referralsNeeded: number;
  currentRate: number;
  nextRate: number;
} | null {
  const currentConfig = getTierConfig(currentTier);
  const currentIdx = COMMISSION_TIERS.findIndex((t) => t.name === currentTier);

  if (currentIdx === COMMISSION_TIERS.length - 1) {
    // Already at max tier
    return null;
  }

  const nextConfig = COMMISSION_TIERS[currentIdx + 1];
  if (!nextConfig) return null;
  const referralsNeeded = nextConfig.minReferrals - currentReferrals;

  return {
    nextTier: nextConfig,
    referralsNeeded: Math.max(0, referralsNeeded),
    currentRate: currentConfig.rate,
    nextRate: nextConfig.rate,
  };
}

/**
 * Calculate projected commission if tier increases
 * @param currentMonthlyRevenue - Current month revenue
 * @param currentTier - Current tier
 * @param nextTier - Next tier to check
 * @returns Additional commission from tier upgrade
 */
export function calculateTierUpgradeBonus(
  currentMonthlyRevenue: number,
  currentTier: CommissionTier['name'],
  nextTier: CommissionTier['name']
): number {
  const currentConfig = getTierConfig(currentTier);
  const nextConfig = getTierConfig(nextTier);

  const rateDifference = nextConfig.rate - currentConfig.rate;
  const bonusCommission = currentMonthlyRevenue * rateDifference;

  return Math.round(bonusCommission * 100) / 100;
}

/**
 * Validate commission record
 * @param orderTotal - Order total
 * @param referrerExists - Whether referrer exists in system
 * @param referredUserExists - Whether referred user exists in system
 * @returns Validation result with any errors
 */
export function validateCommissionRecord(
  orderTotal: number,
  referrerExists: boolean,
  referredUserExists: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (orderTotal <= 0) {
    errors.push('Order total must be greater than 0');
  }

  if (!referrerExists) {
    errors.push('Referrer not found');
  }

  if (!referredUserExists) {
    errors.push('Referred user not found');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate commission breakdown for analytics
 * @param stats - Referral stats
 * @returns Breakdown object
 */
export function getCommissionBreakdown(
  stats: ReferralStats
): {
  tier: CommissionTier['name'];
  rate: number;
  monthlyCommission: number;
  annualizedCommission: number;
  nextTierInfo: ReturnType<typeof getNextTierInfo>;
} {
  const tier = stats.currentTier;
  const tierConfig = getTierConfig(tier);
  const nextTierInfo = getNextTierInfo(tier, stats.totalConversions);

  return {
    tier,
    rate: tierConfig.rate,
    monthlyCommission: stats.pendingCommission,
    annualizedCommission:
      Math.round((stats.pendingCommission * 12) * 100) / 100,
    nextTierInfo,
  };
}

/**
 * Parse referral code from URL parameter
 * @param code - Referral code string
 * @returns Validated referral code or null
 */
export function parseReferralCode(code: string | null | undefined): string | null {
  if (!code) return null;

  // Validate format: alphanumeric, case-insensitive, 6-12 characters
  const sanitized = String(code).toUpperCase().trim();
  const validFormat = /^[A-Z0-9]{6,12}$/.test(sanitized);

  return validFormat ? sanitized : null;
}

/**
 * Build referral tracking URL
 * @param baseUrl - Application base URL
 * @param referralCode - User's referral code
 * @returns Full referral URL
 */
export function buildReferralUrl(baseUrl: string, referralCode: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('ref', referralCode);
    return url.toString();
  } catch (error) {
    throw new Error('Invalid base URL');
  }
}

/**
 * Track referral click (for analytics)
 * @param referralCode - Code being tracked
 * @returns Event data structure for analytics
 */
export function trackReferralClick(referralCode: string): {
  event: string;
  referralCode: string;
  timestamp: string;
  source: string;
} {
  return {
    event: 'referral_click',
    referralCode,
    timestamp: new Date().toISOString(),
    source: 'direct',
  };
}

/**
 * Track referral conversion (purchase)
 * @param referralCode - Code that converted
 * @param orderTotal - Order amount
 * @param orderId - Order ID
 * @returns Event data structure for analytics
 */
export function trackReferralConversion(
  referralCode: string,
  orderTotal: number,
  orderId: string
): {
  event: string;
  referralCode: string;
  orderTotal: number;
  orderId: string;
  timestamp: string;
  commission?: number;
} {
  return {
    event: 'referral_conversion',
    referralCode,
    orderTotal,
    orderId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Approve a commission for payout
 * @param commissionId - Commission ID to approve
 * @returns Updated commission record
 */
export async function approveCommission(commissionId: string): Promise<DbCommissionRecord> {
  const { supabaseAdmin } = await import('./db');

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', commissionId)
    .select()
    .single<DbCommissionRecord>();

  if (error) throw error;
  return data;
}

/**
 * Process commission from order (creates commission record)
 * @param referrerId - ID of referring user
 * @param orderId - Order ID
 * @param orderTotal - Order total amount
 * @returns Created commission record
 */
export async function processOrderCommission(
  referrerId: string,
  orderId: string,
  orderTotal: number
): Promise<DbCommissionRecord> {
  const { supabaseAdmin } = await import('./db');

  const { data: stats, error: statsError } = await supabaseAdmin
    .from('referral_stats')
    .select('total_conversions')
    .eq('referrer_id', referrerId)
    .single<ReferralStatsRecord>();

  if (statsError && statsError.code !== 'PGRST116') throw statsError;

  const totalConversions = stats?.total_conversions || 0;
  const tier = determineTier(totalConversions);
  const commission = calculateCommission(orderTotal, tier);

  const insertPayload: CommissionInsert = {
    referrer_id: referrerId,
    order_id: orderId,
    amount: commission,
    rate: getTierConfig(tier).rate,
    tier: tier as 'bronze' | 'silver' | 'gold' | 'custom',
    status: 'pending',
    order_total: orderTotal,
  };

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .insert(insertPayload)
    .select()
    .single<DbCommissionRecord>();

  if (error) throw error;
  return data;
}

/**
 * Create a payout record
 * @param userId - User ID receiving payout
 * @param periodStart - Payout period start date
 * @param periodEnd - Payout period end date
 * @param amount - Payout amount
 * @returns Created payout record
 */
export async function createPayout(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  amount: number
): Promise<CommissionPayoutRecord> {
  const { supabaseAdmin } = await import('./db');

  const insertPayload: CommissionPayoutInsert = {
    referrer_id: userId,
    user_id: userId,
    amount,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    status: 'pending',
  };

  const { data, error } = await supabaseAdmin
    .from('commission_payouts')
    .insert(insertPayload)
    .select()
    .single<CommissionPayoutRecord>();

  if (error) throw error;
  return data;
}

/**
 * Mark a payout as paid
 * @param payoutId - Payout ID
 * @param stripeTransferId - Stripe transfer ID
 * @returns Updated payout record
 */
export async function markPayoutAsPaid(
  payoutId: string,
  stripeTransferId: string
): Promise<CommissionPayoutRecord> {
  const { supabaseAdmin } = await import('./db');

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
    .single<CommissionPayoutRecord>();

  if (error) throw error;
  return data;
}

/**
 * Get pending commissions for a user
 * @param userId - User ID
 * @returns Array of pending commission records
 */
export async function getPendingCommissions(
  userId: string
): Promise<DbCommissionRecord[]> {
  const { supabaseAdmin } = await import('./db');

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .select('*')
    .eq('referrer_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return (data || []) as DbCommissionRecord[];
}

/**
 * Link a referral to a signup/user
 * @param referralToken - Referral token
 * @param userId - User ID to link to
 */
export async function linkReferralToSignup(
  referralToken: string,
  userId: string
): Promise<void> {
  const { supabaseAdmin } = await import('./db');

  const { error } = await supabaseAdmin
    .from('referrals')
    .update({ referred_user_id: userId })
    .eq('referral_token', referralToken);

  if (error) throw error;
}

/**
 * Update referral stats for a referrer
 * @param referrerId - Referrer user ID
 */
export async function updateReferralStats(referrerId: string): Promise<void> {
  const { supabaseAdmin } = await import('./db');

  const { data: stats, error: statsError } = await supabaseAdmin
    .from('referral_stats')
    .select('*')
    .eq('referrer_id', referrerId)
    .single<ReferralStatsRecord>();

  if (statsError && statsError.code !== 'PGRST116') throw statsError;

  if (!stats) {
    await supabaseAdmin
      .from('referral_stats')
      .insert({
        referrer_id: referrerId,
        total_referrals: 0,
        total_conversions: 0,
        total_commission_earned: 0,
        volume_ytd: 0,
      });
  }
}
