/**
 * Hex-Diva Platform Settings
 * All operational parameters are defined here for dynamic configuration.
 * Settings-driven, DDD-compliant, easily overridable for A/B testing & market adaptation.
 */

// ============================================================================
// PAYMENT PROCESSING CONFIGURATION
// ============================================================================

/**
 * Payment processor configurations for transaction handling
 * Defines primary (Paymob) and fallback processors (Fawry, PayTabs), plus affiliate payout rail (InstaPay)
 * @remarks Supports COD, card, wallet methods with settlement cycles (T+1 to T+2); affiliate payout is manual weekly batch
 */
export const PAYMENT_SETTINGS = {
  // Primary payment processor for COD collection & card payments
  primary: {
    provider: 'paymob',
    name: 'Paymob',
    fees: {
      percentagePerTransaction: 2.75, // 2.75%
      fixedPerTransaction: 3, // 3 EGP
    },
    settlementCycle: {
      frequency: 'weekly', // 'daily' | 'twice-weekly' | 'weekly' | 'monthly'
      daysUntilSettlement: 1, // T+1 assumed, negotiate to 0
      cutoffTime: '18:00', // UTC, local time depends on TZ config
    },
    codSupport: true,
    cardSupport: true,
    walletSupport: true, // Vodafone Cash, etisalat cash, etc.
    instapayIntegration: false, // To be verified in vetting call
    shopifyIntegration: true,
    notes: 'Broadest local method coverage. Vet InstaPay native rail.',
  },

  // Fallback 1: High consumer trust, extensive cash network
  fallback1: {
    provider: 'fawry',
    name: 'Fawry',
    fees: {
      percentagePerTransaction: 3.5, // Estimate, vet directly
      fixedPerTransaction: 2,
    },
    settlementCycle: {
      frequency: 'weekly',
      daysUntilSettlement: 2, // T+2 assumed
      cutoffTime: '18:00',
    },
    codSupport: true,
    cardSupport: false, // Primarily cash/agent network
    walletSupport: true,
    cashAgentLocations: 225000, // Claimed coverage
    shopifyIntegration: false, // Requires API integration via middleware
    notes: 'Highest consumer trust. Traditional cash-first. Vet settlement SLA.',
  },

  // Fallback 2: Cross-border MENA consistency
  fallback2: {
    provider: 'paytabs',
    name: 'PayTabs Egypt',
    fees: {
      percentagePerTransaction: 3.0,
      fixedPerTransaction: 2,
    },
    settlementCycle: {
      frequency: 'weekly',
      daysUntilSettlement: 2,
      cutoffTime: '18:00',
    },
    codSupport: true,
    cardSupport: true,
    walletSupport: true,
    regionExpansion: true, // MENA-ready if scaling regionally
    shopifyIntegration: true,
    notes: 'Regional consistency if MENA expansion happens.',
  },

  // Affiliate payout rail (separate from COD collection)
  affiliatePayout: {
    primary: 'instapay', // 'instapay' | 'bank_transfer' | 'bank_batch'
    instapay: {
      network: 'Egypt Central Bank Instant Payment',
      liveDate: '2022-Q3',
      settlementSpeed: 'real-time',
      supportedBanks: 20, // 20+ banks as of 2024
      fee: 0, // Free or minimal, vet directly
      supportsBusinessBulk: null, // CRITICAL UNKNOWN: must verify with bank
    },
    bankTransfer: {
      settlementSpeed: '1-3 business days',
      fee: 'varies by bank',
      batchCapability: true,
    },
    fallback: 'bank_transfer',
    paymentMethod: 'manual_weekly_batch', // Not automated via PayPal/ACH
    workflow: 'affiliate_app_export_csv → bank_batch_file → instapay_or_transfer → mark_paid_in_app',
  },
};

// ============================================================================
// B2B PRICING TIERS (Shopify B2B Catalogs, max 3 on standard plan)
// ============================================================================

/**
 * B2B wholesale tier structure with three pricing levels
 * tier1: Entry (5+ units, 20% off), tier2: Sub-distributor (20+ units, 30% off), tier3: VIP (50+, custom pricing)
 * @remarks Payment terms are prepay; shipping via bulk pallet/priority fulfillment; returns window 7-14 days
 */
export const B2B_TIERS = {
  // Tier 1: Standard wholesale (>5-10 units)
  tier1: {
    name: 'B2B Wholesale',
    description: 'Standard bulk orders, 5+ units',
    discountType: 'percentage', // 'percentage' | 'fixed_price_list' | 'cost_plus'
    discountValue: 20, // 20% off retail
    minimumOrderQuantity: 5,
    minimumOrderValue: 0, // EGP
    paymentTerms: 'prepay', // 'prepay' | 'net-15' | 'net-30' | 'net-60'
    invoiceRequired: true,
    shippingPolicy: 'standard_3pl', // bulk box, 1-2 day delivery
    returnsWindow: 14, // days
    targetAudience: 'medium_retailers', // Small shop owners, resellers
  },

  // Tier 2: Sub-distributor / Regional (>20 units, specific regions)
  tier2: {
    name: 'B2B Sub-Distributor',
    description: 'Regional distributors, 20+ units or region-specific pricing',
    discountType: 'percentage',
    discountValue: 30, // 30% off retail
    minimumOrderQuantity: 20,
    minimumOrderValue: 5000, // EGP
    paymentTerms: 'prepay', // Safer for cash-flow intensive model
    invoiceRequired: true,
    shippingPolicy: 'bulk_pallet', // Full pallet, 1-2 day delivery
    returnsWindow: 14,
    targetAudience: 'regional_distributors', // City/governorate-level operators
    regionOverride: true, // Can have region-specific pricing on top of tier discount
  },

  // Tier 3: VIP / Negotiated (high volume, custom terms)
  tier3: {
    name: 'B2B VIP',
    description: 'VIP partners, 50+ units or custom arrangements',
    discountType: 'fixed_price_list', // Custom per-partner pricing
    discountValue: null, // Per-partner, not formula-based
    minimumOrderQuantity: 50,
    minimumOrderValue: 15000,
    paymentTerms: 'prepay', // Or net-15 if relationship warrants
    invoiceRequired: true,
    shippingPolicy: 'priority_bulk', // Expedited pallet, same-day or next-day
    returnsWindow: 7, // Shorter for VIPs (lower churn expected)
    targetAudience: 'vip_partners',
    dedicatedAccountManager: true,
  },

  // Phase-2 trigger: if need >3 tiers, upgrade Shopify to Plus
  phase2Trigger: 'tier_count > 3',
  phase2Action: 'upgrade_to_shopify_plus',
  phase2Cost: 2300, // USD/month
};

// ============================================================================
// B2C DISCOUNT TIERS & SEGMENTATION (Shopify Functions + Customer Tags)
// ============================================================================

/**
 * B2C customer segments with targeted promotions and loyalty rewards
 * Includes: first-time buyer (10% off), loyalty tiers (Bronze/Silver/Gold 5-15%), influencer referral (7%), campaigns
 * @remarks Conditions evaluated at checkout via Shopify Functions; loyalty tiers based on lifetime spend; campaigns are active/seasonal
 */
export const B2C_SEGMENTS = {
  // Segment 1: First-time buyers
  firstTimeBuyer: {
    tag: 'first_time_buyer',
    discountType: 'percentage',
    discountValue: 10, // 10% first-purchase discount
    applicableOnce: true,
    condition: 'account_age < 1_day && order_count === 0',
  },

  // Segment 2: Loyalty tier (repeat customers)
  loyalty: {
    tiers: [
      {
        name: 'Bronze',
        tag: 'loyalty_bronze',
        condition: 'lifetime_spend >= 500 && lifetime_spend < 2000', // EGP
        discountValue: 5,
      },
      {
        name: 'Silver',
        tag: 'loyalty_silver',
        condition: 'lifetime_spend >= 2000 && lifetime_spend < 5000',
        discountValue: 10,
      },
      {
        name: 'Gold',
        tag: 'loyalty_gold',
        condition: 'lifetime_spend >= 5000',
        discountValue: 15,
      },
    ],
  },

  // Segment 3: Influencer referral (referred by affiliate)
  influencerReferred: {
    tag: 'referred_by_influencer',
    discountType: 'percentage',
    discountValue: 7, // 7% perk for influencer-brought customers
    applicableOnce: false, // Ongoing
  },

  // Segment 4: Regional/delivery zone pricing (future phase)
  regionBased: {
    enabled: false, // Phase 2 if regional delivery zones differentiate pricing
    zones: {
      cairoCentral: { discount: 0 },
      cairoPeriphery: { discount: 2 },
      nile: { discount: 3 },
      desert: { discount: 5 }, // Remote areas, higher delivery cost
    },
  },

  // Segment 5: Campaign-specific (seasonal, promotional)
  campaigns: {
    enabled: true,
    active: [], // Array of campaign IDs
    template: {
      id: 'campaign_id',
      name: 'Campaign Name',
      discountType: 'percentage',
      discountValue: 15,
      validFrom: '2026-08-01',
      validTo: '2026-08-31',
      maxUsesPerCustomer: 1,
      applicableProductTags: [], // Empty = all products
    },
  },
};

// ============================================================================
// AFFILIATE / INFLUENCER COMMISSION STRUCTURE
// ============================================================================

/**
 * Affiliate and influencer commission configuration with auto-tiering
 * Defines commission tiers (Starter 7% → Elite 12%), payout rail (InstaPay), and performance-based rules
 * @remarks Primary platform: uPromote; payout method: manual weekly batch via InstaPay; minimum payout threshold: 50 EGP
 */
export const AFFILIATE_SETTINGS = {
  platform: {
    primary: 'uPromote',
    fallback1: 'goaffpro',
    fallback2: 'refersion',
  },

  commissioning: {
    // Default commission rules (can be overridden per influencer)
    defaults: {
      type: 'percentage', // 'percentage' | 'flat_per_order' | 'flat_per_item'
      value: 10, // 10% of sale
      minimumPayout: 50, // EGP, don't payout below this
    },

    // Influencer tiers (auto-upgrade based on performance)
    tiers: [
      {
        name: 'Starter',
        minMonthlyRevenue: 0,
        commissionType: 'percentage',
        commissionValue: 7,
        payoutFrequency: 'monthly',
      },
      {
        name: 'Growth',
        minMonthlyRevenue: 5000,
        commissionType: 'percentage',
        commissionValue: 10,
        payoutFrequency: 'weekly',
      },
      {
        name: 'Elite',
        minMonthlyRevenue: 20000,
        commissionType: 'percentage',
        commissionValue: 12,
        payoutFrequency: 'weekly',
      },
      {
        name: 'VIP',
        minMonthlyRevenue: 50000,
        commissionType: 'custom',
        commissionValue: null, // Custom negotiated per partner
        payoutFrequency: 'twice_weekly',
      },
    ],

    // Special rules (some get flat, some get %, some have targets)
    customRules: {
      enabled: true,
      perInfluencerOverride: true, // Each influencer can have custom commission
      targetBased: {
        enabled: true, // Optional performance targets
        template: {
          influencerId: 'uuid',
          monthlyTarget: 10000, // EGP
          baseCommission: 10, // % if below target
          bonusCommission: 15, // % if above target
        },
      },
      mlmCapable: true, // Multi-tier affiliate structure (influencer can recruit sub-affiliates)
    },
  },

  payoutRail: {
    method: 'manual_batch_instapay',
    frequency: 'weekly', // 'weekly' | 'twice_weekly' | 'monthly'
    payoutDay: 'friday', // Specific day for payout batch
    payoutTime: '10:00', // UTC
    exportFormat: 'csv', // From UpPromote → manual processing
    fallbackMethod: 'bank_transfer',
    minimumPayoutThreshold: 50, // EGP
    instapayVerified: false, // Will be set to true after bank vetting
  },

  reporting: {
    affiliateDashboard: true, // Self-serve portal with clicks, conversions, earnings
    emailNotifications: true,
    paymentStatusUpdate: 'immediate', // Mark paid in app same day as payout
    reportingFrequency: 'weekly', // Dashboard updates
  },

  recruitment: {
    discoveryMarketplace: true, // UpPromote's affiliate marketplace for discovery
    manualInvite: true,
    referralBonus: {
      enabled: false, // Affiliates can't refer other affiliates at launch
      phase2: true,
    },
  },
};

// ============================================================================
// 3PL CONFIGURATION & VENDOR SELECTION
// ============================================================================

/**
 * 3PL (third-party logistics) vendor configuration with two flavors for different use cases
 * flavor1: Standard B2C (Bosta primary, Mylerz/Aramex fallback, 1-2 day delivery)
 * flavor2: Premium sub-4hr dark-store (Flextock/ShipBlu/Bosta Fulfillment, same-day/next-day)
 * @remarks Returns logistics tracked separately; native webhook integration replaces AfterShip; AfterShip fallback for Aramex international only
 */
export const LOGISTICS_3PL = {
  flavor1: {
    type: 'pickup_plus_lastmile',
    use_case: 'standard_b2c_delivery',
    primary: {
      vendor: 'bosta',
      name: 'Bosta',
      coverage: 'National (20+ distribution hubs)',
      deliveryTime: '1-2 days',
      codSupport: true,
      cashSettlement: 'next_day',
      shopifyIntegration: true,
      awbGeneration: true,
      tracking: 'branded_page_via_webhook',
    },
    fallback1: {
      vendor: 'mylerz',
      name: 'Mylerz',
      coverage: 'Egypt + MENA regional',
      deliveryTime: '1-2 days',
      codSupport: true,
      cashSettlement: 'not_published', // Vet directly
      shopifyIntegration: true,
      awbGeneration: true,
      regionExpansion: true,
    },
    fallback2: {
      vendor: 'aramex_egypt',
      name: 'Aramex Egypt',
      coverage: 'International + domestic',
      deliveryTime: '2-3 days',
      codSupport: true,
      cashSettlement: 'weekly',
      shopifyIntegration: false, // Via 3rd party or AfterShip
      trustSignal: 'premium/international',
    },
  },

  flavor2: {
    type: 'onpremise_stock_darkstore',
    use_case: 'premium_sub4hour_delivery_usp',
    primary: {
      vendor: 'flextock',
      name: 'Flextock',
      model: 'On-demand warehousing + fulfillment',
      cities: 28,
      pricing: 'variable_cost',
      codIncluded: true,
      returnsIncluded: true,
      codSettlement: 'bundled_with_logistics',
      shopifyApiSupport: 'to_be_verified',
      sub4hourCapability: 'vet_directly',
    },
    fallback1: {
      vendor: 'shipblu',
      name: 'ShipBlu',
      model: 'AI-driven AutoPilot fulfillment + warehousing + last-mile',
      automation: 'high', // AI-driven ops
      codSettlement: 'next_day_automated',
      tracking: 'whatsapp_plus_web',
      shopifyIntegration: true,
      reviewVolume: 'thin_2_reviews_32_stars', // Data gap to close
      launchDate: 'Dec_2021',
      notes: 'Automation-first candidate. Verify SLA before committing.',
    },
    fallback2: {
      vendor: 'bosta_fulfillment',
      name: 'Bosta Fulfillment',
      model: 'Bolt-on to Bosta courier',
      integrationFriction: 'lowest',
      singleVendorBenefit: true,
    },
  },

  returnsLogistics: {
    // NEW: explicitly tracked as separate dimension (v3 feedback)
    scoringCriteria: [
      'reverse_pickup_sla_days',
      'restock_qc_turnaround_days',
      'cod_refusal_attribution', // Who bears cost: you or courier?
      'return_rate_impact_on_metrics',
    ],
    vettingQuestions: [
      'What is your reverse-pickup SLA from customer address to warehouse?',
      'What is your standard restock/QC turnaround before unit is sellable again?',
      'If customer refuses COD at door, who bears the return shipping cost?',
      'Does your system track return reasons? Can we integrate refund attribution?',
    ],
  },

  trackingLayer: {
    aftershipStrategy: 'do_not_use', // AfterShip doesn't support Bosta/Mylerz/Flextock
    alternative: 'native_3pl_webhook_to_branded_page',
    fallback: 'aftership_for_aramex_international_only',
  },
};

// ============================================================================
// SHOPIFY CHECKOUT & FULFILLMENT EXTENSIONS
// ============================================================================

/**
 * Shopify native capabilities and required app extensions for checkout experience
 * Native: split shipping, bundling, promos via Functions; Phase 2 apps: multi-address, COD partial deposit
 * @remarks Custom Functions for free delivery thresholds (500-1000 EGP based on region); invoicing bundled with 3PL app
 */
export const SHOPIFY_EXTENSIONS = {
  nativeCapabilities: {
    splitShipping: true, // Native, no app
    bundling: true, // Shopify Bundles or Functions
    promos: true, // Shopify Functions (custom dev)
    invoiceGeneration: false, // Bundled with 3PL app or custom
  },

  requiredApps: {
    multiAddress: {
      enabled: false, // Phase 2 if needed
      app: 'qe_multiship',
      purpose: 'Two separate delivery addresses in one order',
    },
    codPartialDeposit: {
      enabled: false, // Phase 2 if needed
      app: 'split2ship',
      purpose: 'Pay X now, rest on delivery',
    },
    invoicing: {
      enabled: true, // Bundled with Bosta/Mylerz or custom
      source: '3pl_app_or_custom',
    },
  },

  customFunctions: {
    regionBasedPricing: {
      enabled: false, // Phase 2
      implementation: 'shopify_function_cart_discount',
    },
    freeDeliveryThresholds: {
      enabled: true,
      thresholds: [
        { minSpend: 500, region: 'cairo_central', freeShipping: true },
        { minSpend: 750, region: 'cairo_periphery', freeShipping: true },
        { minSpend: 1000, region: 'nile_delta', freeShipping: true },
      ],
      implementation: 'shopify_function_shipping_discount',
    },
  },
};

// ============================================================================
// MARKETPLACE INTEGRATIONS (Phase 1: Own shop + Amazon; Phase 2: Noon + Jumia)
// ============================================================================

/**
 * Marketplace deployment strategy with phased rollout
 * Phase 1: Own Shopify shop (day 1) + Amazon.eg (by Sep 2026), top 100 SKUs, inventory synced from Shopify
 * Phase 2: Noon.com + Jumia.com.eg (Q4 2026); central inventory synced hourly from primary source
 * @remarks All marketplaces support COD; inventory reconciliation via hourly (primary) or daily (fallback) sync
 */
export const MARKETPLACE_CONFIG = {
  phase1: {
    ownShop: {
      platform: 'shopify',
      priority: 'primary',
      timeLine: 'go_live_day_1',
    },
    amazon: {
      platform: 'amazon.eg',
      priority: 'primary',
      timeLine: 'go_live_by_sep_2026',
      inventory: 'sync_from_shopify',
      codSupport: true,
      listing_strategy: 'top_100_skus',
    },
  },

  phase2: {
    noon: {
      platform: 'noon.com',
      priority: 'secondary',
      timeLine: 'q4_2026',
    },
    jumia: {
      platform: 'jumia.com.eg',
      priority: 'secondary',
      timeLine: 'q4_2026',
    },
  },

  centralInventory: {
    source: 'shopify',
    syncFrequency: 'hourly', // Near real-time
    fallback: 'daily',
  },
};

// ============================================================================
// ENVIRONMENT & DEPLOYMENT
// ============================================================================

/**
 * Environment and deployment configuration with feature flags
 * Current environment: development; staging via Vercel preview, production via Vercel main
 * @remarks Feature flags control B2B/B2C/affiliate availability and marketplace integrations (Amazon Phase 1, Noon/Jumia Phase 2)
 */
export const ENVIRONMENT_CONFIG = {
  current: 'development',
  deployment: {
    staging: 'vercel_preview',
    production: 'vercel_main',
  },

  featureFlags: {
    b2bEnabled: true,
    b2cEnabled: true,
    affiliateEnabled: true,
    amazonIntegration: false, // Enable on phase 1 launch
    noonIntegration: false, // Phase 2
    jumiaIntegration: false, // Phase 2
  },
};

// ============================================================================
// EXPORT FOR RUNTIME
// ============================================================================

/**
 * Main settings object aggregating all platform configurations
 * Provides root-level access to payment, B2B, B2C, affiliate, logistics, Shopify, marketplace, and environment settings
 * @remarks Used by lib/config.ts typed accessors; mutations validated and persisted via settingsManager.ts
 */
export const SETTINGS = {
  payment: PAYMENT_SETTINGS,
  b2b: B2B_TIERS,
  b2c: B2C_SEGMENTS,
  affiliate: AFFILIATE_SETTINGS,
  logistics: LOGISTICS_3PL,
  shopify: SHOPIFY_EXTENSIONS,
  marketplace: MARKETPLACE_CONFIG,
  env: ENVIRONMENT_CONFIG,
};

export default SETTINGS;
