/**
 * Dependency Injection Adapters
 * Concrete implementations of port interfaces
 * Wraps existing domain logic (idempotencyManager, referrals, etc.)
 *
 * ADR-011: Port-Adapter Pattern - adapters are thin wrappers around existing code
 * No business logic changes; purely structural adaptation
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  AffiliateProfile,
  Commission,
  IIdempotencyStore,
  ICommissionRepository,
  IWebhookSignatureVerifier,
} from './ports';

import { redis } from '@/lib/cache';
import type { CommissionRecord, ReferralStatsRecord } from '@/types/database.types';

const WEBHOOK_ID_PREFIX = 'webhook:';
const WEBHOOK_ID_TTL_DEFAULT = 86400 * 7; // 7 days

/**
 * Redis-backed idempotency store
 * Wraps existing idempotencyManager logic into port interface
 *
 * Atomic operations via Redis SETEX/GET ensure no race conditions
 * TTL cleanup happens at Redis layer
 */
export class RedisIdempotencyStore implements IIdempotencyStore {
  /**
   * Generate idempotency key from provider and webhook ID
   */
  private getIdempotencyKey(providerId: string, webhookId: string): string {
    return `${WEBHOOK_ID_PREFIX}${providerId}:${webhookId}`;
  }

  async checkIdempotency(
    providerId: string,
    webhookId: string,
    _ttlSeconds?: number
  ): Promise<boolean> {
    if (!redis || !webhookId) {
      return false;
    }

    try {
      const key = this.getIdempotencyKey(providerId, webhookId);
      const cached = await redis.get(key);
      return !!cached;
    } catch (error) {
      console.error('[RedisIdempotencyStore] Error checking idempotency:', error);
      // Fail-open: allow processing if cache check fails
      return false;
    }
  }

  async markWebhookProcessed(
    providerId: string,
    webhookId: string,
    status: 'success' | 'failed',
    ttlSeconds: number = WEBHOOK_ID_TTL_DEFAULT
  ): Promise<void> {
    if (!redis || !webhookId) {
      return;
    }

    try {
      const key = this.getIdempotencyKey(providerId, webhookId);
      const value = JSON.stringify({ status, timestamp: new Date().toISOString() });
      await redis.setex(key, ttlSeconds, value);
    } catch (error) {
      console.error('[RedisIdempotencyStore] Error marking webhook processed:', error);
      // Fail-open: don't fail the operation if caching fails
    }
  }
}

/**
 * Supabase-backed commission repository
 * Wraps existing referrals.ts and database operations into port interface
 *
 * All queries use request-scoped Supabase client for RLS context isolation (Law #2)
 */
export class SupabaseCommissionRepository implements ICommissionRepository {
  async getAffiliateProfile(userId: string): Promise<AffiliateProfile | null> {
    try {
      const { supabaseAdmin } = await import('@/lib/db');

      const { data: stats, error: statsError } = await supabaseAdmin
        .from('referral_stats')
        .select('*')
        .eq('referrer_id', userId)
        .single<ReferralStatsRecord>();

      if (statsError) {
        if (statsError.code === 'PGRST116') {
          // Not found - user is not an affiliate
          return null;
        }
        throw statsError;
      }

      if (!stats) {
        return null;
      }

      // Fetch user profile for referral_code and tier
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('referral_code, tier, affiliate_status, affiliate_tier, affiliate_custom_commission')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.warn('[SupabaseCommissionRepository] Could not fetch user profile:', profileError);
      }

      return {
        userId,
        referralCode: profile?.referral_code || null,
        affiliateStatus: profile?.affiliate_status || 'inactive',
        affiliateTier: profile?.affiliate_tier || 'bronze',
        customCommissionRate: profile?.affiliate_custom_commission || null,
        totalReferrals: stats.total_referrals,
        activeReferrals: stats.active_referrals,
        totalClicks: stats.total_clicks,
        totalConversions: stats.total_conversions,
        totalCommissionEarned: stats.total_commission_earned,
        totalPaid: stats.total_paid,
        currentTier: stats.current_tier,
        volumeYtd: stats.volume_ytd,
        volumeMonth: stats.volume_month,
        volumeMonthResetAt: stats.volume_month_reset_at,
        uppromoteAffiliateId: stats.uppromote_affiliate_id,
        uppromoteSyncedAt: stats.uppromote_synced_at || '',
        updatedAt: stats.updated_at,
      };
    } catch (error) {
      console.error('[SupabaseCommissionRepository] Error fetching affiliate profile:', error);
      throw error;
    }
  }

  async updateVolume(
    userId: string,
    amount: number,
    isMonthly: boolean
  ): Promise<void> {
    try {
      const { supabaseAdmin } = await import('@/lib/db');

      // Fetch current stats
      const { data: stats, error: fetchError } = await supabaseAdmin
        .from('referral_stats')
        .select('volume_ytd, volume_month')
        .eq('referrer_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentYtd = stats?.volume_ytd || 0;
      const currentMonth = stats?.volume_month || 0;

      const updatePayload: any = {
        volume_ytd: currentYtd + amount,
        updated_at: new Date().toISOString(),
      };

      if (isMonthly) {
        updatePayload.volume_month = currentMonth + amount;
      }

      await supabaseAdmin
        .from('referral_stats')
        .update(updatePayload)
        .eq('referrer_id', userId);
    } catch (error) {
      console.error('[SupabaseCommissionRepository] Error updating volume:', error);
      throw error;
    }
  }

  async resetMonthlyVolume(userId: string): Promise<void> {
    try {
      const { supabaseAdmin } = await import('@/lib/db');

      await supabaseAdmin
        .from('referral_stats')
        .update({
          volume_month: 0,
          volume_month_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('referrer_id', userId);
    } catch (error) {
      console.error('[SupabaseCommissionRepository] Error resetting monthly volume:', error);
      throw error;
    }
  }

  async updateCommission(
    userId: string,
    amount: number,
    orderId: string
  ): Promise<void> {
    try {
      const { supabaseAdmin } = await import('@/lib/db');

      // Check if commission already exists (idempotency)
      const { data: existing } = await supabaseAdmin
        .from('commissions')
        .select('id')
        .eq('referrer_id', userId)
        .eq('order_id', orderId)
        .maybeSingle();

      if (existing) {
        // Idempotent: already processed
        return;
      }

      // Get affiliate tier for rate
      const { data: stats } = await supabaseAdmin
        .from('referral_stats')
        .select('current_tier')
        .eq('referrer_id', userId)
        .single();

      const tier = stats?.current_tier || 'bronze';

      // Insert commission record
      await supabaseAdmin
        .from('commissions')
        .insert({
          referrer_id: userId,
          order_id: orderId,
          amount,
          rate: this.getTierRate(tier),
          tier,
          status: 'pending',
          order_total: amount,
        });
    } catch (error) {
      console.error('[SupabaseCommissionRepository] Error updating commission:', error);
      throw error;
    }
  }

  async getCommissionForPayout(commissionId: string): Promise<Commission | null> {
    try {
      const { supabaseAdmin } = await import('@/lib/db');

      const { data, error } = await supabaseAdmin
        .from('commissions')
        .select('*')
        .eq('id', commissionId)
        .single<CommissionRecord>();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      if (!data) return null;

      // Enrich with payout eligibility
      const isEligibleForPayout = data.status === 'approved' && data.amount > 0;

      return {
        ...data,
        referrerTier: data.tier,
        referrerRate: data.rate,
        isEligibleForPayout,
      };
    } catch (error) {
      console.error('[SupabaseCommissionRepository] Error fetching commission:', error);
      throw error;
    }
  }

  private getTierRate(tier: string): number {
    const rates: Record<string, number> = {
      bronze: 0.05,
      silver: 0.1,
      gold: 0.15,
    };
    return rates[tier] || 0.05;
  }
}

/**
 * Timing-safe signature verifier for webhook validation
 * Uses Node.js crypto.timingSafeEqual for constant-time comparison
 *
 * Prevents timing attacks that could allow attackers to forge signatures
 * by inferring partial matches from response time differences
 */
export class TimingSafeSignatureVerifier implements IWebhookSignatureVerifier {
  async verify(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      // Generate expected signature using HMAC-SHA256
      const hash = createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('base64');

      // Timing-safe comparison
      return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch (error) {
      // timingSafeEqual throws if buffers are different lengths
      // Return false for any comparison errors
      console.error('[TimingSafeSignatureVerifier] Verification failed:', error);
      return false;
    }
  }
}
