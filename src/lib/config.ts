/**
 * Configuration Loader & Validator
 *
 * Provides type-safe, validated access to platform settings with support for:
 * - Runtime overrides via environment variables
 * - Validation with clear error messages
 * - Default fallbacks
 * - Per-module configuration exports
 *
 * Usage:
 *   import { config, getPaymentConfig, getB2BConfig } from '@/lib/config';
 *   const paymentGateway = config.payment.primary;
 *   const b2bTier = getB2BConfig('tier1');
 */

import SETTINGS from '@/config/settings';

// ============================================================================
// TYPE DEFINITIONS (ensuring type-safe config access)
// ============================================================================

export interface PaymentConfig {
  provider: string;
  name: string;
  fees: { percentagePerTransaction: number; fixedPerTransaction: number };
  settlementCycle: { frequency: string; daysUntilSettlement: number; cutoffTime: string };
  codSupport: boolean;
  cardSupport: boolean;
  walletSupport: boolean;
  shopifyIntegration: boolean;
}

export interface B2BTier {
  name: string;
  description: string;
  discountType: string;
  discountValue: number | null;
  minimumOrderQuantity: number;
  minimumOrderValue: number;
  paymentTerms: string;
  invoiceRequired: boolean;
  shippingPolicy: string;
  returnsWindow: number;
  targetAudience: string;
}

export interface B2CSegment {
  tag?: string;
  discountType?: string;
  discountValue: number;
  applicableOnce?: boolean;
  condition?: string;
}

export interface AffiliateCommissionTier {
  name: string;
  minMonthlyRevenue: number;
  commissionType: string;
  commissionValue: number | null;
  payoutFrequency: string;
}

export interface LogisticProvider {
  vendor: string;
  name: string;
  coverage: string;
  deliveryTime: string;
  codSupport: boolean;
  shopifyIntegration: boolean;
}

// ============================================================================
// CONFIGURATION ACCESSORS (per-module exports)
// ============================================================================

/**
 * Get primary payment configuration
 */
export function getPaymentConfig(type: 'primary' | 'fallback1' | 'fallback2' = 'primary'): PaymentConfig {
  const config = SETTINGS.payment[type as keyof typeof SETTINGS.payment];
  if (!config) {
    throw new Error(`Payment configuration not found for type: ${type}`);
  }
  return config as PaymentConfig;
}

/**
 * Get affiliate payout configuration
 */
export function getAffiliatePayoutConfig() {
  return SETTINGS.payment.affiliatePayout;
}

/**
 * Get B2B tier by tier key
 */
export function getB2BConfig(tier: 'tier1' | 'tier2' | 'tier3'): B2BTier {
  const tierConfig = SETTINGS.b2b[tier as keyof typeof SETTINGS.b2b];
  if (!tierConfig) {
    throw new Error(`B2B tier configuration not found for: ${tier}`);
  }
  return tierConfig as B2BTier;
}

/**
 * Get all B2B tiers
 */
export function getAllB2BTiers(): Record<string, B2BTier> {
  return {
    tier1: SETTINGS.b2b.tier1 as B2BTier,
    tier2: SETTINGS.b2b.tier2 as B2BTier,
    tier3: SETTINGS.b2b.tier3 as B2BTier,
  };
}

/**
 * Get B2C segment by name
 */
export function getB2CSegment(segment: 'firstTimeBuyer' | 'influencerReferred') {
  const segmentConfig = SETTINGS.b2c[segment as keyof typeof SETTINGS.b2c];
  if (!segmentConfig) {
    throw new Error(`B2C segment not found: ${segment}`);
  }
  return segmentConfig;
}

/**
 * Get loyalty tiers
 */
export function getLoyaltyTiers(): AffiliateCommissionTier[] {
  const loyalty = SETTINGS.b2c.loyalty as any;
  return loyalty.tiers || [];
}

/**
 * Get affiliate commission tiers
 */
export function getAffiliateCommissionTiers(): AffiliateCommissionTier[] {
  const affiliate = SETTINGS.affiliate.commissioning as any;
  return affiliate.tiers || [];
}

/**
 * Get affiliate tier by name
 */
export function getAffiliateCommissionTier(tierName: string): AffiliateCommissionTier | null {
  const tiers = getAffiliateCommissionTiers();
  return tiers.find((t: AffiliateCommissionTier) => t.name === tierName) || null;
}

/**
 * Get 3PL primary vendor by flavor
 */
export function get3PLVendor(flavor: 'flavor1' | 'flavor2') {
  const logisticsConfig = SETTINGS.logistics[flavor as keyof typeof SETTINGS.logistics];
  if (!logisticsConfig) {
    throw new Error(`3PL flavor not found: ${flavor}`);
  }
  return (logisticsConfig as any).primary;
}

/**
 * Get 3PL vendor by flavor and type (primary, fallback1, fallback2)
 */
export function get3PLVendorConfig(flavor: 'flavor1' | 'flavor2', type: 'primary' | 'fallback1' | 'fallback2') {
  const logisticsConfig = SETTINGS.logistics[flavor as keyof typeof SETTINGS.logistics];
  if (!logisticsConfig) {
    throw new Error(`3PL flavor not found: ${flavor}`);
  }
  const vendorConfig = (logisticsConfig as any)[type];
  if (!vendorConfig) {
    throw new Error(`3PL vendor not found for ${flavor} - ${type}`);
  }
  return vendorConfig;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  const flags = SETTINGS.env.featureFlags as Record<string, boolean>;
  return flags[featureName] ?? false;
}

/**
 * Get marketplace configuration for phase
 */
export function getMarketplaceConfig(phase: 'phase1' | 'phase2') {
  return SETTINGS.marketplace[phase as keyof typeof SETTINGS.marketplace];
}

// ============================================================================
// VALIDATION & RUNTIME CHECKS
// ============================================================================

/**
 * Validate payment configuration before using
 */
export function validatePaymentConfig(config: PaymentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.provider) errors.push('Payment provider is required');
  if (!config.name) errors.push('Payment provider name is required');
  if (config.fees.percentagePerTransaction < 0) errors.push('Percentage fee cannot be negative');
  if (config.fees.fixedPerTransaction < 0) errors.push('Fixed fee cannot be negative');
  if (!config.settlementCycle.frequency) errors.push('Settlement frequency is required');
  if (config.settlementCycle.daysUntilSettlement < 0) errors.push('Settlement days cannot be negative');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate B2B tier configuration
 */
export function validateB2BTier(tier: B2BTier): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tier.name) errors.push('Tier name is required');
  if (tier.minimumOrderQuantity < 0) errors.push('Minimum order quantity cannot be negative');
  if (tier.minimumOrderValue < 0) errors.push('Minimum order value cannot be negative');
  if (tier.discountValue !== null && tier.discountValue < 0) errors.push('Discount value cannot be negative');
  if (tier.returnsWindow < 0) errors.push('Returns window cannot be negative');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate affiliate commission tier
 */
export function validateAffiliateCommissionTier(tier: AffiliateCommissionTier): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tier.name) errors.push('Tier name is required');
  if (tier.minMonthlyRevenue < 0) errors.push('Minimum monthly revenue cannot be negative');
  if (tier.commissionValue !== null && tier.commissionValue < 0) errors.push('Commission value cannot be negative');
  if (!tier.payoutFrequency) errors.push('Payout frequency is required');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Runtime validation of all critical configurations
 * Call this on app startup or in a health-check endpoint
 */
export function validateAllConfigs(): { valid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  // Validate payment configs
  const paymentValidation = validatePaymentConfig(getPaymentConfig('primary'));
  if (!paymentValidation.valid) {
    errors['payment.primary'] = paymentValidation.errors;
  }

  // Validate B2B tiers
  ['tier1', 'tier2', 'tier3'].forEach((tier) => {
    const b2bValidation = validateB2BTier(getB2BConfig(tier as 'tier1' | 'tier2' | 'tier3'));
    if (!b2bValidation.valid) {
      errors[`b2b.${tier}`] = b2bValidation.errors;
    }
  });

  // Validate affiliate commission tiers
  const affiliateTiers = getAffiliateCommissionTiers();
  affiliateTiers.forEach((tier) => {
    const tierValidation = validateAffiliateCommissionTier(tier);
    if (!tierValidation.valid) {
      errors[`affiliate.commission.${tier.name}`] = tierValidation.errors;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// EXPORT MAIN CONFIG
// ============================================================================

/**
 * Main configuration object for direct access
 * Prefer using typed accessors above, but this provides escape hatch for edge cases
 */
export const config = SETTINGS;

export default config;
