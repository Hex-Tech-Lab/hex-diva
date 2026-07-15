/**
 * Dependency Injection Port Interfaces
 * Define contracts for critical infrastructure components
 * Implementation-agnostic: adapters fulfill these interfaces
 *
 * ADR-011: Port-Adapter Pattern for testability and loose coupling
 */

import type {
  CommissionRecord,
} from '@/types/database.types';

/**
 * Affiliate Profile aggregated from referral_stats + user_profiles
 * Single source of truth for affiliate data at query time
 */
export interface AffiliateProfile {
  userId: string;
  referralCode: string | null;
  affiliateStatus: string;
  affiliateTier: string;
  customCommissionRate: number | null;
  totalReferrals: number;
  activeReferrals: number;
  totalClicks: number;
  totalConversions: number;
  totalCommissionEarned: number;
  totalPaid: number;
  currentTier: string;
  volumeYtd: number;
  volumeMonth: number;
  volumeMonthResetAt: string;
  uppromoteAffiliateId: string | null;
  uppromoteSyncedAt: string | null;
  updatedAt: string;
}

/**
 * Commission with derived fields for payout processing
 */
export interface Commission extends CommissionRecord {
  referrerTier: string;
  referrerRate: number;
  isEligibleForPayout: boolean;
}

/**
 * Idempotency Store Port
 * Prevents duplicate webhook processing using atomic operations
 *
 * Invariants:
 * 1. checkIdempotency + markWebhookProcessed are atomic
 * 2. TTL is enforced at storage layer (Redis)
 * 3. Fail-open: if store is down, allow processing (don't reject)
 * 4. Only successful webhooks are cached (failed attempts bypass for retry)
 */
export interface IIdempotencyStore {
  /**
   * Check if webhook has already been processed
   * @param providerId - Webhook provider (shopify, uppromote, orders, stripe)
   * @param webhookId - Unique webhook ID from provider headers
   * @param ttlSeconds - Optional TTL override (default: 604800 = 7 days)
   * @returns true if duplicate detected, false if first occurrence
   */
  checkIdempotency(
    providerId: string,
    webhookId: string,
    ttlSeconds?: number
  ): Promise<boolean>;

  /**
   * Mark webhook as processed with optional result caching
   * @param providerId - Webhook provider identifier
   * @param webhookId - Webhook ID for deduplication
   * @param status - Terminal status (success or failed)
   * @param ttlSeconds - Optional TTL (default: 604800)
   * @returns Promise resolves when marked (fail-open if store unavailable)
   *
   * Contract: Only call for successful terminal outcomes.
   * Failed webhooks MUST NOT be cached to allow provider retries.
   */
  markWebhookProcessed(
    providerId: string,
    webhookId: string,
    status: 'success' | 'failed',
    ttlSeconds?: number
  ): Promise<void>;

  /**
   * Release idempotency lock/key if processing failed, so retries can occur
   * @param providerId - Webhook provider identifier
   * @param webhookId - Unique webhook identifier
   * @returns True if successfully released, false otherwise
   */
  releaseIdempotencyKey(providerId: string, webhookId: string): Promise<boolean>;
}

/**
 * Commission Repository Port
 * Handles affiliate profile retrieval and commission/volume tracking
 *
 * Invariants:
 * 1. updateVolume is idempotent: can be called multiple times safely
 * 2. resetMonthlyVolume preserves YTD volume and tier
 * 3. updateCommission creates commission record if not exists
 * 4. All operations are scoped to request-level Supabase client (RLS context)
 */
export interface ICommissionRepository {
  /**
   * Get affiliate profile by user ID
   * @param userId - User to fetch profile for
   * @returns AffiliateProfile with current stats, or null if not an affiliate
   */
  getAffiliateProfile(userId: string): Promise<AffiliateProfile | null>;

  /**
   * Update volume totals (YTD + optionally monthly)
   * @param userId - Affiliate user ID
   * @param amount - Amount to add to volume
   * @param isMonthly - If true, increment volume_month; always increment volume_ytd
   * @returns Promise when update completes
   *
   * Contract: Idempotent. Multiple calls with same amount are safe.
   */
  updateVolume(
    userId: string,
    amount: number,
    isMonthly: boolean
  ): Promise<void>;

  /**
   * Reset monthly volume to 0, preserving YTD and tier
   * Typically called monthly via cron job
   * @param userId - Affiliate user ID
   * @returns Promise when reset completes
   */
  resetMonthlyVolume(userId: string): Promise<void>;

  /**
   * Create or update commission record for an order
   * @param userId - Referrer user ID
   * @param amount - Commission amount
   * @param orderId - Order ID for idempotency key
   * @returns Promise when commission is recorded
   *
   * Contract: Idempotent on (userId, orderId) key.
   * Returns existing commission if already processed.
   */
  updateCommission(
    userId: string,
    amount: number,
    orderId: string
  ): Promise<void>;

  /**
   * Get single commission record with tier + rate (for payout validation)
   * @param commissionId - Commission record ID
   * @returns Commission with derived fields, or null if not found
   */
  getCommissionForPayout(commissionId: string): Promise<Commission | null>;
}

/**
 * Webhook Signature Verifier Port
 * Validates webhook requests using timing-safe comparison
 *
 * Invariants:
 * 1. MUST use timing-safe comparison (constant-time) to prevent timing attacks
 * 2. MUST reject invalid signatures with HTTP 401 (not 400)
 * 3. MUST NOT expose which part of signature mismatched
 */
export interface IWebhookSignatureVerifier {
  /**
   * Verify webhook signature using provider's secret
   * @param payload - Raw request body as string
   * @param signature - Signature from request header
   * @param secret - Webhook secret for provider
   * @returns true if signature valid, false otherwise
   *
   * Contract: Uses timing-safe comparison. Returns boolean (never throws).
   */
  verify(payload: string, signature: string, secret: string): Promise<boolean>;
}
