/**
 * Referral & Commission System Core Logic
 * Handles commission calculations, tier tracking, and payout processing
 */

export interface CommissionTier {
  name: 'bronze' | 'silver' | 'gold';
  minReferrals: number;
  maxReferrals: number | null;
  rate: number;
}

export const COMMISSION_TIERS: CommissionTier[] = [
  { name: 'bronze', minReferrals: 0, maxReferrals: 10, rate: 0.05 },
  { name: 'silver', minReferrals: 11, maxReferrals: 50, rate: 0.1 },
  { name: 'gold', minReferrals: 51, maxReferrals: null, rate: 0.15 },
];

export function determineTier(totalReferrals: number): 'bronze' | 'silver' | 'gold' {
  if (totalReferrals >= 51) return 'gold';
  if (totalReferrals >= 11) return 'silver';
  return 'bronze';
}

export function getTierConfig(tier: string): CommissionTier {
  const config = COMMISSION_TIERS.find((t) => t.name === tier);
  if (!config) throw new Error(`Invalid tier: ${tier}`);
  return config;
}

export function calculateCommission(orderTotal: number, tier: string = 'bronze'): number {
  const tierConfig = getTierConfig(tier);
  const commission = orderTotal * tierConfig.rate;
  return Math.round(commission * 100) / 100;
}

export function parseReferralCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const sanitized = String(code).toUpperCase().trim();
  const validFormat = /^[A-Z0-9]{6,12}$/.test(sanitized);
  return validFormat ? sanitized : null;
}

export function buildReferralUrl(baseUrl: string, referralCode: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('ref', referralCode);
    return url.toString();
  } catch (error) {
    throw new Error('Invalid base URL');
  }
}
