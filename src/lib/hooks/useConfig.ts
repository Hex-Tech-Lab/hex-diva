/**
 * useConfig Hook
 *
 * Type-safe configuration access for React components.
 * All config accessors are memoized to prevent unnecessary re-renders.
 *
 * Usage:
 *   const { b2b, affiliate } = useConfig();
 *   const tier1Discount = b2b.tier1.discountValue;
 *
 * Payment settings are DB-backed (CAS/audit pipeline), not static, so they
 * aren't exposed here — use getPaymentSettings() from '@/lib/config' server-side.
 */

'use client';

import { useMemo } from 'react';
import {
  getAllB2BTiers,
  getAffiliateCommissionTiers,
  get3PLVendor,
  getMarketplaceConfig,
  isFeatureEnabled,
  config,
} from '@/lib/config';

export function useConfig() {
  return useMemo(
    () => ({
      // B2B tiers
      b2b: getAllB2BTiers(),

      // Affiliate commissions
      affiliate: {
        commissioning: getAffiliateCommissionTiers(),
        platform: config.affiliate.platform,
        payoutRail: config.affiliate.payoutRail,
      },

      // 3PL vendors
      logistics: {
        flavor1Primary: get3PLVendor('flavor1'),
        flavor2Primary: get3PLVendor('flavor2'),
        config: config.logistics,
      },

      // Feature flags
      features: {
        b2bEnabled: isFeatureEnabled('b2bEnabled'),
        b2cEnabled: isFeatureEnabled('b2cEnabled'),
        affiliateEnabled: isFeatureEnabled('affiliateEnabled'),
        amazonIntegration: isFeatureEnabled('amazonIntegration'),
        noonIntegration: isFeatureEnabled('noonIntegration'),
        jumiaIntegration: isFeatureEnabled('jumiaIntegration'),
      },

      // Marketplace configuration
      marketplace: {
        phase1: getMarketplaceConfig('phase1'),
        phase2: getMarketplaceConfig('phase2'),
      },

      // Raw config object (for advanced use cases)
      raw: config,
    }),
    []
  );
}

/**
 * Hook specifically for B2B configuration
 */
export function useB2BConfig() {
  return useMemo(() => getAllB2BTiers(), []);
}

/**
 * Hook specifically for affiliate configuration
 */
export function useAffiliateConfig() {
  return useMemo(
    () => ({
      commissioning: getAffiliateCommissionTiers(),
      platform: config.affiliate.platform,
      payoutRail: config.affiliate.payoutRail,
      recruitment: config.affiliate.recruitment,
    }),
    []
  );
}

/**
 * Hook to check if specific feature is enabled
 */
export function useFeatureFlag(featureName: string): boolean {
  return useMemo(() => isFeatureEnabled(featureName), [featureName]);
}
