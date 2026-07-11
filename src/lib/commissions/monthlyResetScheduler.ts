/**
 * Commission Tier Monthly Reset Scheduler
 * Handles monthly volume resets and tier recalculation for affiliates
 * Ensures tier changes are tracked and notifications are sent
 */

import { getSupabaseAdmin } from '@/lib/db'
import { determineTier, getTierConfig } from '@/lib/referrals'
import type { ReferralStatsRecord } from '@/types/database.types'

const supabaseAdmin = getSupabaseAdmin()

export interface ResetResult {
  referrerId: string;
  email?: string;
  previousTier: string;
  newTier: string;
  volumeMonth: number;
  volumeMonthResetAt: string;
  tierChanged: boolean;
  tierDowngrade: boolean;
}

/**
 * Check if an affiliate's monthly volume should be reset
 * Reset occurs if volume_month_reset_at is before the start of the current month
 * @param resetAt - Last reset timestamp
 * @returns Whether reset is needed
 */
export function shouldResetMonthlyVolume(resetAt: string | null): boolean {
  if (!resetAt) return true;

  const lastReset = new Date(resetAt);
  const now = new Date();

  // Get start of current month (00:00:00 on the 1st)
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return lastReset < startOfCurrentMonth;
}

/**
 * Reset monthly volumes and recalculate tiers for all affiliates
 * This is the main orchestration function that:
 * 1. Finds all affiliates where monthly volume needs to be reset
 * 2. Resets volume_month to 0
 * 3. Updates volume_month_reset_at to today
 * 4. Recalculates tier based on total_conversions
 * 5. Tracks tier changes for notifications
 *
 * @returns Array of reset results with tier change info
 */
export async function checkAndResetMonthlyVolumes(): Promise<ResetResult[]> {
  const results: ResetResult[] = [];

  try {
    // Query all affiliates with their current stats
    const { data: affiliates, error: queryError } = await supabaseAdmin
      .from('referral_stats')
      .select(
        `
        id,
        referrer_id,
        volume_month,
        volume_month_reset_at,
        total_conversions,
        current_tier,
        users!inner(email)
        `
      );

    if (queryError) {
      console.error('[MonthlyReset] Query error:', queryError);
      throw queryError;
    }

    if (!affiliates || affiliates.length === 0) {
      console.log('[MonthlyReset] No affiliates found');
      return results;
    }

    const now = new Date();
    const toResetAt = now.toISOString();

    // Process each affiliate
    for (const affiliate of affiliates) {
      const stats = affiliate as unknown as ReferralStatsRecord & { users?: { email?: string } };

      // Check if reset is needed
      if (!shouldResetMonthlyVolume(stats.volume_month_reset_at)) {
        continue;
      }

      const previousTier = stats.current_tier;
      // Recalculate tier based on total conversions
      const newTier = determineTier(stats.total_conversions);
      const tierChanged = previousTier !== newTier;
      const tierDowngrade = tierChanged && getTierConfig(newTier as 'bronze' | 'silver' | 'gold').rate <
        getTierConfig(previousTier as 'bronze' | 'silver' | 'gold').rate;

      // Log tier downgrade if it occurs (uncommitted commissions retain their original tier)
      if (tierDowngrade) {
        console.log(
          `[MonthlyReset] Tier downgrade for ${stats.referrer_id}: ${previousTier} → ${newTier}`
        );
      }

      // Update affiliate stats
      const { error: updateError } = await supabaseAdmin
        .from('referral_stats')
        .update({
          volume_month: 0,
          volume_month_reset_at: toResetAt,
          current_tier: newTier,
          updated_at: now.toISOString(),
        })
        .eq('referrer_id', stats.referrer_id);

      if (updateError) {
        console.error(`[MonthlyReset] Update error for ${stats.referrer_id}:`, updateError);
        throw updateError;
      }

      results.push({
        referrerId: stats.referrer_id,
        email: (stats.users as any)?.email,
        previousTier,
        newTier,
        volumeMonth: 0,
        volumeMonthResetAt: toResetAt,
        tierChanged,
        tierDowngrade,
      });

      console.log(
        `[MonthlyReset] Reset complete for ${stats.referrer_id}: volume_month=0, tier=${newTier}`
      );
    }

    console.log(`[MonthlyReset] Processed ${results.length} affiliates`);
    return results;
  } catch (error) {
    console.error('[MonthlyReset] Fatal error:', error);
    throw error;
  }
}

/**
 * Get the start of the current month in UTC
 * @returns Date object for start of current month at 00:00:00
 */
export function getStartOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Get the end of the current month in UTC
 * @returns Date object for end of current month at 23:59:59.999
 */
export function getEndOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/**
 * Create audit log entry for monthly reset
 * Tracks which affiliates were reset and any tier changes
 * @param results - Array of reset results
 */
export async function logMonthlyResetAudit(results: ResetResult[]): Promise<void> {
  if (results.length === 0) return;

  try {
    const tierDowngrades = results.filter((r) => r.tierDowngrade);
    const tierUpgrades = results.filter((r) => r.tierChanged && !r.tierDowngrade);

    const { error } = await supabaseAdmin.from('audit_log').insert({
      action: 'monthly_volume_reset',
      resource_type: 'referral_stats',
      changes: {
        total_affiliates: results.length,
        tier_downgrades: tierDowngrades.length,
        tier_upgrades: tierUpgrades.length,
        downgrades: tierDowngrades.map((r) => ({
          referrerId: r.referrerId,
          from: r.previousTier,
          to: r.newTier,
        })),
      },
      deployed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[MonthlyReset] Audit log error:', error);
    }
  } catch (error) {
    console.error('[MonthlyReset] Audit log creation failed:', error);
  }
}
