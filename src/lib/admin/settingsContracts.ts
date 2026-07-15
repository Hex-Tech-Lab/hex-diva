import { z } from 'zod';

export const PaymentProcessorFeesSchema = z.object({
  percentagePerTransaction: z.number().min(0).max(100),
  fixedPerTransaction: z.number().min(0),
});

export const SettlementCycleSchema = z.object({
  frequency: z.enum(['daily', 'twice-weekly', 'weekly', 'monthly']),
  daysUntilSettlement: z.number().min(0),
  cutoffTime: z.string(),
});

export const PaymentProcessorSchema = z.object({
  provider: z.string(),
  name: z.string(),
  fees: PaymentProcessorFeesSchema,
  settlementCycle: SettlementCycleSchema,
  codSupport: z.boolean(),
  cardSupport: z.boolean(),
  walletSupport: z.boolean(),
  instapayIntegration: z.boolean().optional(),
  shopifyIntegration: z.boolean(),
  notes: z.string().optional(),
  cashAgentLocations: z.number().optional(),
  regionExpansion: z.boolean().optional(),
});

export const AffiliatePayoutInstapaySchema = z.object({
  network: z.string(),
  liveDate: z.string(),
  settlementSpeed: z.string(),
  supportedBanks: z.number(),
  fee: z.number(),
  supportsBusinessBulk: z.boolean().nullable(),
});

export const AffiliatePayoutBankTransferSchema = z.object({
  settlementSpeed: z.string(),
  fee: z.string(),
  batchCapability: z.boolean(),
});

export const AffiliatePayoutSchema = z.object({
  primary: z.string(),
  instapay: AffiliatePayoutInstapaySchema,
  bankTransfer: AffiliatePayoutBankTransferSchema,
  fallback: z.string(),
  paymentMethod: z.string(),
  workflow: z.string(),
});

export const PaymentSettingsSchema = z.object({
  primary: PaymentProcessorSchema,
  fallback1: PaymentProcessorSchema,
  fallback2: PaymentProcessorSchema,
  affiliatePayout: AffiliatePayoutSchema,
});

export const B2BWholesaleTierSchema = z.object({
  name: z.string(),
  description: z.string(),
  discountType: z.enum(['percentage', 'fixed_price_list', 'cost_plus']),
  discountValue: z.number().min(0).max(100).nullable(),
  minimumOrderQuantity: z.number().min(0),
  minimumOrderValue: z.number().min(0),
  paymentTerms: z.string(),
  invoiceRequired: z.boolean(),
  shippingPolicy: z.string(),
  returnsWindow: z.number().min(0),
  targetAudience: z.string(),
  regionOverride: z.boolean().optional(),
  dedicatedAccountManager: z.boolean().optional(),
});

export const B2BTiersSchema = z.object({
  tier1: B2BWholesaleTierSchema,
  tier2: B2BWholesaleTierSchema,
  tier3: B2BWholesaleTierSchema,
  phase2Trigger: z.string(),
  phase2Action: z.string(),
  phase2Cost: z.number(),
});

export const B2CFirstTimeBuyerSchema = z.object({
  tag: z.string(),
  discountType: z.string(),
  discountValue: z.number().min(0).max(100),
  applicableOnce: z.boolean(),
  condition: z.string(),
});

export const B2CLoyaltyTierSchema = z.object({
  name: z.string(),
  tag: z.string(),
  condition: z.string(),
  discountValue: z.number().min(0).max(100),
});

export const B2CInfluencerReferredSchema = z.object({
  tag: z.string(),
  discountType: z.string(),
  discountValue: z.number().min(0).max(100),
  applicableOnce: z.boolean(),
});

export const B2CRegionBasedSchema = z.object({
  enabled: z.boolean(),
  zones: z.record(z.object({ discount: z.number() })),
});

export const B2CCampaignTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  discountType: z.string(),
  discountValue: z.number(),
  validFrom: z.string(),
  validTo: z.string(),
  maxUsesPerCustomer: z.number(),
  applicableProductTags: z.array(z.string()),
});

export const B2CCampaignsSchema = z.object({
  enabled: z.boolean(),
  active: z.array(z.string()),
  template: B2CCampaignTemplateSchema,
});

export const B2CSegmentsSchema = z.object({
  firstTimeBuyer: B2CFirstTimeBuyerSchema,
  loyalty: z.object({
    tiers: z.array(B2CLoyaltyTierSchema),
  }),
  influencerReferred: B2CInfluencerReferredSchema,
  regionBased: B2CRegionBasedSchema,
  campaigns: B2CCampaignsSchema,
});

export const AffiliateDefaultsSchema = z.object({
  type: z.string(),
  value: z.number().min(0).max(100),
  minimumPayout: z.number().min(0),
});

export const AffiliateTierSchema = z.object({
  name: z.string(),
  minMonthlyRevenue: z.number().min(0),
  commissionType: z.string(),
  commissionValue: z.number().min(0).max(100).nullable(),
  payoutFrequency: z.string(),
});

export const AffiliateCustomRulesSchema = z.object({
  enabled: z.boolean(),
  perInfluencerOverride: z.boolean(),
  targetBased: z.object({
    enabled: z.boolean(),
    template: z.object({
      influencerId: z.string(),
      monthlyTarget: z.number(),
      baseCommission: z.number(),
      bonusCommission: z.number(),
    }),
  }),
  mlmCapable: z.boolean(),
});

export const AffiliatePayoutRailSchema = z.object({
  method: z.string(),
  frequency: z.string(),
  payoutDay: z.string(),
  payoutTime: z.string(),
  exportFormat: z.string(),
  fallbackMethod: z.string(),
  minimumPayoutThreshold: z.number(),
  instapayVerified: z.boolean(),
});

export const AffiliateSettingsSchema = z.object({
  platform: z.object({
    primary: z.string(),
    fallback1: z.string(),
    fallback2: z.string(),
  }),
  commissioning: z.object({
    defaults: AffiliateDefaultsSchema,
    tiers: z.array(AffiliateTierSchema),
    customRules: AffiliateCustomRulesSchema,
  }),
  payoutRail: AffiliatePayoutRailSchema,
  reporting: z.object({
    affiliateDashboard: z.boolean(),
    emailNotifications: z.boolean(),
    paymentStatusUpdate: z.string(),
    reportingFrequency: z.string(),
  }),
  recruitment: z.object({
    discoveryMarketplace: z.boolean(),
    manualInvite: z.boolean(),
    referralBonus: z.object({
      enabled: z.boolean(),
      phase2: z.boolean(),
    }),
  }),
});

export const Logistics3PLFlavorSchema = z.object({
  type: z.string(),
  use_case: z.string(),
  primary: z.object({
    vendor: z.string(),
    name: z.string(),
    coverage: z.string(),
    deliveryTime: z.string(),
    codSupport: z.boolean(),
    cashSettlement: z.string(),
    shopifyIntegration: z.boolean(),
    awbGeneration: z.boolean(),
    tracking: z.string(),
  }),
  fallback1: z.object({
    vendor: z.string(),
    name: z.string(),
    coverage: z.string(),
    deliveryTime: z.string(),
    codSupport: z.boolean(),
    cashSettlement: z.string(),
    shopifyIntegration: z.boolean(),
    awbGeneration: z.boolean(),
    regionExpansion: z.boolean().optional(),
    automation: z.string().optional(),
    tracking: z.string().optional(),
    reviewVolume: z.string().optional(),
    launchDate: z.string().optional(),
    notes: z.string().optional(),
  }),
  fallback2: z.object({
    vendor: z.string(),
    name: z.string(),
    coverage: z.string().optional(),
    deliveryTime: z.string().optional(),
    codSupport: z.boolean().optional(),
    cashSettlement: z.string().optional(),
    shopifyIntegration: z.boolean().optional(),
    trustSignal: z.string().optional(),
    model: z.string().optional(),
    integrationFriction: z.string().optional(),
    singleVendorBenefit: z.boolean().optional(),
  }).optional(),
});

export const Logistics3PLSchema = z.object({
  flavor1: Logistics3PLFlavorSchema,
  flavor2: z.object({
    type: z.string(),
    use_case: z.string(),
    primary: z.object({
      vendor: z.string(),
      name: z.string(),
      model: z.string(),
      cities: z.number(),
      pricing: z.string(),
      codIncluded: z.boolean(),
      returnsIncluded: z.boolean(),
      codSettlement: z.string(),
      shopifyApiSupport: z.string(),
      sub4hourCapability: z.string(),
    }),
    fallback1: z.object({
      vendor: z.string(),
      name: z.string(),
      model: z.string(),
      automation: z.string(),
      codSettlement: z.string(),
      tracking: z.string(),
      shopifyIntegration: z.boolean(),
      reviewVolume: z.string(),
      launchDate: z.string(),
      notes: z.string(),
    }),
    fallback2: z.object({
      vendor: z.string(),
      name: z.string(),
      model: z.string(),
      integrationFriction: z.string(),
      singleVendorBenefit: z.boolean(),
    }),
  }),
  returnsLogistics: z.object({
    scoringCriteria: z.array(z.string()),
    vettingQuestions: z.array(z.string()),
  }),
  trackingLayer: z.object({
    aftershipStrategy: z.string(),
    alternative: z.string(),
    fallback: z.string(),
  }),
});

export const ShopifyExtensionsSchema = z.object({
  nativeCapabilities: z.object({
    splitShipping: z.boolean(),
    bundling: z.boolean(),
    promos: z.boolean(),
    invoiceGeneration: z.boolean(),
  }),
  requiredApps: z.object({
    multiAddress: z.object({
      enabled: z.boolean(),
      app: z.string(),
      purpose: z.string(),
    }),
    codPartialDeposit: z.object({
      enabled: z.boolean(),
      app: z.string(),
      purpose: z.string(),
    }),
    invoicing: z.object({
      enabled: z.boolean(),
      source: z.string(),
    }),
  }),
  customFunctions: z.object({
    regionBasedPricing: z.object({
      enabled: z.boolean(),
      implementation: z.string(),
    }),
    freeDeliveryThresholds: z.object({
      enabled: z.boolean(),
      thresholds: z.array(
        z.object({
          minSpend: z.number(),
          region: z.string(),
          freeShipping: z.boolean(),
        })
      ),
      implementation: z.string(),
    }),
  }),
});

export const MarketplaceConfigSchema = z.object({
  phase1: z.object({
    ownShop: z.object({
      platform: z.string(),
      priority: z.string(),
      timeLine: z.string(),
    }),
    amazon: z.object({
      platform: z.string(),
      priority: z.string(),
      timeLine: z.string(),
      inventory: z.string(),
      codSupport: z.boolean(),
      listing_strategy: z.string(),
    }),
  }),
  phase2: z.object({
    noon: z.object({
      platform: z.string(),
      priority: z.string(),
      timeLine: z.string(),
    }),
    jumia: z.object({
      platform: z.string(),
      priority: z.string(),
      timeLine: z.string(),
    }),
  }),
  centralInventory: z.object({
    source: z.string(),
    syncFrequency: z.string(),
    fallback: z.string(),
  }),
});

export const EnvironmentConfigSchema = z.object({
  current: z.string(),
  deployment: z.object({
    staging: z.string(),
    production: z.string(),
  }),
  featureFlags: z.record(z.boolean()),
});

export const FullSettingsSchema = z.object({
  payment: PaymentSettingsSchema,
  b2b: B2BTiersSchema,
  b2c: B2CSegmentsSchema,
  affiliate: AffiliateSettingsSchema,
  logistics: Logistics3PLSchema,
  shopify: ShopifyExtensionsSchema,
  marketplace: MarketplaceConfigSchema,
  env: EnvironmentConfigSchema,
});

export type FullSettings = z.infer<typeof FullSettingsSchema>;
