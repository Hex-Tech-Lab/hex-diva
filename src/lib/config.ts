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

/**
 * Payment processor configuration for transaction handling
 * Defines fees, settlement terms, and payment method support for a single payment gateway
 * @remarks Used by checkout & payout flows; each processor provides COD/card/wallet capabilities
 */
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

/**
 * B2B wholesale tier configuration for bulk orders
 * Defines pricing, minimum order thresholds, payment terms, and shipping policies per tier
 * @remarks Three tiers: tier1 (5+ units, 20% off), tier2 (20+ units, 30% off), tier3 (50+, custom)
 */
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

/**
 * B2C customer segment with targeted discount rules
 * Defines segments (first-time buyer, influencer-referred, loyalty tiers) and discount eligibility
 * @remarks Applied via Shopify Functions or customer tags; conditions evaluated at checkout
 */
export interface B2CSegment {
  tag?: string;
  discountType?: string;
  discountValue: number;
  applicableOnce?: boolean;
  condition?: string;
}

/**
 * Affiliate/influencer commission tier with auto-upgrade thresholds
 * Defines commission rate, payout frequency, and performance thresholds for tier progression
 * @remarks Tiers: Starter (0 EGP/mo), Growth (5K+), Elite (20K+), VIP (50K+); rates 7-12% base
 */
export interface AffiliateCommissionTier {
  name: string;
  minMonthlyRevenue: number;
  commissionType: string;
  commissionValue: number | null;
  payoutFrequency: string;
}

/**
 * 3PL (third-party logistics) vendor configuration for shipping & fulfillment
 * Defines carrier capabilities, coverage area, delivery SLA, and payment method support
 * @remarks Used for selecting primary/fallback vendors; supports COD settlement and Shopify webhooks
 */
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
 * Get payment processor configuration by type
 * @param type - Payment processor type: 'primary' (Paymob), 'fallback1' (Fawry), 'fallback2' (PayTabs)
 * @returns PaymentConfig with fees, settlement, and method support details
 * @throws Error if configuration not found for the requested type
 */
export function getPaymentConfig(type: 'primary' | 'fallback1' | 'fallback2' = 'primary'): PaymentConfig {
  const config = SETTINGS.payment[type as keyof typeof SETTINGS.payment];
  if (!config) {
    throw new Error(`Payment configuration not found for type: ${type}`);
  }
  return config as PaymentConfig;
}

/**
 * Get affiliate payout configuration and settlement details
 * @returns Affiliate payout object with processor, fees, and settlement terms
 */
export function getAffiliatePayoutConfig() {
  return SETTINGS.payment.affiliatePayout;
}

/**
 * Get B2B tier configuration by tier level
 * @param tier - B2B tier: 'tier1' (entry), 'tier2' (established), 'tier3' (premium)
 * @returns B2BTier with discount, minimum order, payment terms, and service details
 * @throws Error if configuration not found for the requested tier
 */
export function getB2BConfig(tier: 'tier1' | 'tier2' | 'tier3'): B2BTier {
  const tierConfig = SETTINGS.b2b[tier as keyof typeof SETTINGS.b2b];
  if (!tierConfig) {
    throw new Error(`B2B tier configuration not found for: ${tier}`);
  }
  return tierConfig as B2BTier;
}

/**
 * Get all B2B tier configurations as a map
 * @returns Object mapping tier keys to B2BTier configuration objects
 */
export function getAllB2BTiers(): Record<string, B2BTier> {
  return {
    tier1: SETTINGS.b2b.tier1 as B2BTier,
    tier2: SETTINGS.b2b.tier2 as B2BTier,
    tier3: SETTINGS.b2b.tier3 as B2BTier,
  };
}

/**
 * Get B2C customer segment configuration by name
 * @param segment - Segment type: 'firstTimeBuyer' or 'influencerReferred'
 * @returns B2CSegment with applicable discounts and conditions
 * @throws Error if segment configuration not found
 */
export function getB2CSegment(segment: 'firstTimeBuyer' | 'influencerReferred') {
  const segmentConfig = SETTINGS.b2c[segment as keyof typeof SETTINGS.b2c];
  if (!segmentConfig) {
    throw new Error(`B2C segment not found: ${segment}`);
  }
  return segmentConfig;
}

/**
 * Get B2C loyalty program tier configuration
 * @returns Array of loyalty tiers with commission details and thresholds
 */
export function getLoyaltyTiers(): AffiliateCommissionTier[] {
  const loyalty = SETTINGS.b2c?.loyalty as Record<string, unknown>;
  return (loyalty?.tiers as AffiliateCommissionTier[]) || [];
}

/**
 * Get all affiliate commission tier configurations
 * @returns Array of commission tiers with minimum revenue, rate, and payout frequency
 */
export function getAffiliateCommissionTiers(): AffiliateCommissionTier[] {
  const affiliate = SETTINGS.affiliate?.commissioning as Record<string, unknown>;
  return (affiliate?.tiers as AffiliateCommissionTier[]) || [];
}

/**
 * Get specific affiliate commission tier by name
 * @param tierName - Commission tier name (e.g., 'bronze', 'silver', 'gold')
 * @returns AffiliateCommissionTier object if found, null otherwise
 */
export function getAffiliateCommissionTier(tierName: string): AffiliateCommissionTier | null {
  const tiers = getAffiliateCommissionTiers();
  return tiers.find((t: AffiliateCommissionTier) => t.name === tierName) || null;
}

/**
 * Get primary 3PL (third-party logistics) vendor for a shipping flavor
 * @param flavor - Shipping flavor: 'flavor1' or 'flavor2' (region-based routing)
 * @returns Primary LogisticProvider with coverage, delivery time, and COD support
 * @throws Error if flavor configuration not found
 */
export function get3PLVendor(flavor: 'flavor1' | 'flavor2') {
  const logisticsConfig = SETTINGS.logistics[flavor as keyof typeof SETTINGS.logistics] as Record<string, unknown>;
  if (!logisticsConfig) {
    throw new Error(`3PL flavor not found: ${flavor}`);
  }
  return logisticsConfig.primary as LogisticProvider;
}

/**
 * Get 3PL vendor configuration by flavor and priority level
 * @param flavor - Shipping flavor: 'flavor1' or 'flavor2' (region-based routing)
 * @param type - Vendor priority: 'primary', 'fallback1', or 'fallback2'
 * @returns LogisticProvider with carrier details and capabilities
 * @throws Error if flavor or vendor configuration not found
 */
export function get3PLVendorConfig(flavor: 'flavor1' | 'flavor2', type: 'primary' | 'fallback1' | 'fallback2') {
  const logisticsConfig = SETTINGS.logistics[flavor as keyof typeof SETTINGS.logistics] as Record<string, unknown>;
  if (!logisticsConfig) {
    throw new Error(`3PL flavor not found: ${flavor}`);
  }
  const vendorConfig = logisticsConfig[type] as LogisticProvider;
  if (!vendorConfig) {
    throw new Error(`3PL vendor not found for ${flavor} - ${type}`);
  }
  return vendorConfig;
}

/**
 * Check if a feature flag is enabled
 * @param featureName - Feature flag name (e.g., 'enableB2B', 'enableReferrals')
 * @returns True if feature flag is enabled, false by default
 */
export function isFeatureEnabled(featureName: string): boolean {
  const flags = SETTINGS.env.featureFlags as Record<string, boolean>;
  return flags[featureName] ?? false;
}

/**
 * Get marketplace configuration for a deployment phase
 * @param phase - Deployment phase: 'phase1' (MVP) or 'phase2' (full platform)
 * @returns Marketplace configuration with feature set and rollout details
 */
export function getMarketplaceConfig(phase: 'phase1' | 'phase2') {
  return SETTINGS.marketplace[phase as keyof typeof SETTINGS.marketplace];
}

// ============================================================================
// VALIDATION & RUNTIME CHECKS
// ============================================================================

/**
 * Validate payment configuration for completeness and correctness
 * @param config - PaymentConfig object to validate
 * @returns Validation result with boolean status and array of error messages
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
 * Validate B2B tier configuration for completeness and correctness
 * @param tier - B2BTier object to validate
 * @returns Validation result with boolean status and array of error messages
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
 * Validate affiliate commission tier configuration
 * @param tier - AffiliateCommissionTier object to validate
 * @returns Validation result with boolean status and array of error messages
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
 * Validate all critical platform configurations on startup
 * Checks payment processors, B2B tiers, and affiliate commissions for correctness
 * @returns Validation result with overall status and per-config error details
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
