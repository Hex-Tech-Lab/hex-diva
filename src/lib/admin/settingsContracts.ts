/**
 * Settings Contracts
 * Declares domain settings schemas using Zod.
 */

import { z } from 'zod';

export const CommissionTierSchema = z.object({
  commissionValue: z.number().min(0).max(100),
  minMonthlyRevenue: z.number().nonnegative(),
});

export const AffiliateSettingsSchema = z.object({
  commissioning: z.object({
    defaultRate: z.number().min(0).max(100).default(10),
    tiers: z.array(CommissionTierSchema).default([]),
  }),
});

export const B2BRegionBasedSchema = z.object({
  region: z.string(),
  discount: z.number().min(0).max(100),
});

export const B2BSettingsSchema = z.object({
  pricing: z.object({
    defaultDiscount: z.number().min(0).max(100).default(20),
    regionBased: z.array(B2BRegionBasedSchema).default([]),
  }),
});

export const B2CRegionBasedSchema = z.object({
  enabled: z.boolean().default(false),
  zones: z.record(z.string(), z.object({ discount: z.number() })).default({}),
});

export const B2CCampaignTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  discount: z.number().min(0).max(100),
});

export const B2CSettingsSchema = z.object({
  pricing: z.object({
    defaultDiscount: z.number().min(0).max(100).default(0),
    regionBased: B2CRegionBasedSchema.default({ enabled: false, zones: {} }),
  }),
  influencerCampaigns: z.object({
    templates: z.array(B2CCampaignTemplateSchema).default([]),
  }),
});

export const PaymentProviderSchema = z.object({
  name: z.string(),
  fees: z.object({
    percentagePerTransaction: z.number().min(0).max(100),
    fixedPerTransaction: z.number().nonnegative(),
  }),
  settlementCycle: z.string(),
  codSupport: z.boolean(),
  cardSupport: z.boolean(),
  walletSupport: z.boolean(),
  shopifyIntegration: z.boolean(),
  cashAgentLocations: z.array(z.string()).optional(),
});

const defaultPrimaryPayment = {
  name: 'Paymob',
  fees: { percentagePerTransaction: 2.75, fixedPerTransaction: 3.0 },
  settlementCycle: 'T+3',
  codSupport: false,
  cardSupport: true,
  walletSupport: true,
  shopifyIntegration: true,
};

const defaultFallback1Payment = {
  name: 'Fawry',
  fees: { percentagePerTransaction: 2.0, fixedPerTransaction: 2.0 },
  settlementCycle: 'T+1',
  codSupport: true,
  cardSupport: false,
  walletSupport: true,
  shopifyIntegration: true,
  cashAgentLocations: [],
};

const defaultFallback2Payment = {
  name: 'Paytabs',
  fees: { percentagePerTransaction: 3.0, fixedPerTransaction: 0 },
  settlementCycle: 'T+5',
  codSupport: false,
  cardSupport: true,
  walletSupport: false,
  shopifyIntegration: true,
};

export const PaymentSettingsSchema = z.object({
  primary: PaymentProviderSchema.default(defaultPrimaryPayment),
  fallback1: PaymentProviderSchema.default(defaultFallback1Payment),
  fallback2: PaymentProviderSchema.default(defaultFallback2Payment),
});

const defaultSystemFlags = {};
const defaultSystemIPs: string[] = [];

export const SystemSettingsSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  allowedIPs: z.array(z.string()).default(defaultSystemIPs),
  featureFlags: z.record(z.string(), z.boolean()).default(defaultSystemFlags),
});

export const FullSettingsSchema = z.object({
  affiliate: AffiliateSettingsSchema.default({ commissioning: { defaultRate: 10, tiers: [] } }),
  b2b: B2BSettingsSchema.default({ pricing: { defaultDiscount: 20, regionBased: [] } }),
  b2c: B2CSettingsSchema.default({ pricing: { defaultDiscount: 0, regionBased: { enabled: false, zones: {} } }, influencerCampaigns: { templates: [] } }),
  payment: PaymentSettingsSchema.default({
    primary: defaultPrimaryPayment,
    fallback1: defaultFallback1Payment,
    fallback2: defaultFallback2Payment,
  }),
  system: SystemSettingsSchema.default({
    maintenanceMode: false,
    allowedIPs: defaultSystemIPs,
    featureFlags: defaultSystemFlags,
  }),
});

export type CommissionTier = z.infer<typeof CommissionTierSchema>;
export type AffiliateSettings = z.infer<typeof AffiliateSettingsSchema>;
export type B2BSettings = z.infer<typeof B2BSettingsSchema>;
export type B2CSettings = z.infer<typeof B2CSettingsSchema>;
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;
export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
export type FullSettings = z.infer<typeof FullSettingsSchema>;
