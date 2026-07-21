/**
 * B2B Tier Detection & Helpers
 * Centralized utilities for tier checks and pricing calculations
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type UserTier = 'b2c' | 'b2b' | 'admin'

/**
 * Get user's current tier
 * @param userId - User ID to check
 * @param supabase - Supabase client (should be request-scoped)
 * @returns User's tier or 'b2c' if not found
 */
export async function getUserTier(
  userId: string,
  supabase: SupabaseClient
): Promise<UserTier> {
  const { data: user } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single()

  return (user?.tier as UserTier) || 'b2c'
}

/**
 * Check if user is B2B (includes admin)
 * @param tier - User tier
 * @returns True if tier is b2b or admin
 */
export function isB2BUser(tier: string): tier is 'b2b' | 'admin' {
  return tier === 'b2b' || tier === 'admin'
}

/**
 * Get B2B pricing discount percentage by tier
 * @param tier - User tier
 * @returns Discount as decimal (0.25 = 25% off)
 */
export function getB2BDiscountByTier(tier: UserTier): number {
  const discounts: Record<UserTier, number> = {
    b2c: 0,
    b2b: 0.25, // Bronze tier: 25% off retail
    admin: 0.5, // Admin: 50% for testing
  }
  return discounts[tier] || 0
}

/**
 * Calculate price for user's tier
 * @param retailPrice - Original retail price
 * @param tier - User tier
 * @returns Discounted price rounded to 2 decimals
 */
export function getPriceForTier(retailPrice: number, tier: UserTier): number {
  const discount = getB2BDiscountByTier(tier)
  const discountedPrice = retailPrice * (1 - discount)
  return Math.round(discountedPrice * 100) / 100
}

/**
 * Calculate discount percentage shown to user
 * @param tier - User tier
 * @returns Discount percentage (25, 50, etc.) or 0
 */
export function getDiscountPercentageForTier(tier: UserTier): number {
  return getB2BDiscountByTier(tier) * 100
}

/**
 * Format tier name for display
 * @param tier - User tier
 * @returns Display name (e.g., "Standard", "Premium", "Admin")
 */
export function formatTierForDisplay(tier: UserTier): string {
  const names: Record<UserTier, string> = {
    b2c: 'Standard',
    b2b: 'Premium (B2B)',
    admin: 'Admin',
  }
  return names[tier]
}

/**
 * Get tier upgrade path information
 * @param currentTier - Current tier
 * @returns Information about next tier or null if at max
 */
export function getNextTierUpgradeInfo(
  currentTier: UserTier
): { nextTier: UserTier; discount: number; benefits: string[] } | null {
  if (currentTier === 'b2b' || currentTier === 'admin') {
    return null // Already at max tier
  }

  if (currentTier === 'b2c') {
    return {
      nextTier: 'b2b',
      discount: 25,
      benefits: [
        '25% discount on all products',
        'Unique referral code',
        'Commission on referred sales',
        'Payout dashboard',
      ],
    }
  }

  return null
}

/**
 * Verify B2B access (tier check)
 * @param userId - User ID
 * @param supabase - Supabase client
 * @returns True if user is B2B or admin
 */
export async function verifyB2BAccess(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const tier = await getUserTier(userId, supabase)
  return isB2BUser(tier)
}

/**
 * Get default tier (for new users)
 * @returns Default tier
 */
export function getDefaultTier(): UserTier {
  return 'b2c'
}
