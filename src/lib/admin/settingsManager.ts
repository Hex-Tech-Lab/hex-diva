/**
 * Settings Manager
 * Handles reading current settings and logging audit changes.
 * Phase 1 MVP: No DB persistence — changes logged to console/audit array for demo.
 * Phase 2: Will connect to database for persistence across deployments.
 */

import {
  PAYMENT_SETTINGS,
  AFFILIATE_SETTINGS,
  B2B_TIERS,
  B2C_SEGMENTS,
  LOGISTICS_3PL,
  SHOPIFY_EXTENSIONS,
  MARKETPLACE_CONFIG,
  ENVIRONMENT_CONFIG,
} from '@/config/settings';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  changedBy: string;
  section: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * In-memory audit log (MVP only — Phase 2 moves to database)
 */
const auditLog: AuditLogEntry[] = [];

/**
 * Draft changes pending deployment (UI state for confirmation dialogs)
 */
const draftChanges: Map<string, unknown> = new Map();

/**
 * Get current settings snapshot
 */
export function getCurrentSettings() {
  return {
    payment: {
      primary: PAYMENT_SETTINGS.primary,
      fallback1: PAYMENT_SETTINGS.fallback1,
      fallback2: PAYMENT_SETTINGS.fallback2,
      affiliatePayout: PAYMENT_SETTINGS.affiliatePayout,
    },
    affiliate: {
      commissioning: {
        defaults: AFFILIATE_SETTINGS.commissioning.defaults,
        tiers: AFFILIATE_SETTINGS.commissioning.tiers,
        customRules: AFFILIATE_SETTINGS.commissioning.customRules,
      },
      payoutRail: AFFILIATE_SETTINGS.payoutRail,
    },
    b2b: B2B_TIERS,
    b2c: B2C_SEGMENTS,
    logistics: LOGISTICS_3PL,
    shopify: SHOPIFY_EXTENSIONS,
    marketplace: MARKETPLACE_CONFIG,
    env: ENVIRONMENT_CONFIG,
  };
}

/**
 * Get payment processor details for display
 */
export function getPaymentProcessorsForDisplay() {
  const payment = PAYMENT_SETTINGS;
  return [
    {
      provider: 'paymob',
      name: payment.primary.name,
      type: 'primary',
      enabled: true,
      fees: payment.primary.fees,
      settlementCycle: payment.primary.settlementCycle,
      supportedMethods: {
        cod: payment.primary.codSupport,
        card: payment.primary.cardSupport,
        wallet: payment.primary.walletSupport,
      },
      shopifyIntegration: payment.primary.shopifyIntegration,
    },
    {
      provider: 'fawry',
      name: payment.fallback1.name,
      type: 'fallback1',
      enabled: true,
      fees: payment.fallback1.fees,
      settlementCycle: payment.fallback1.settlementCycle,
      supportedMethods: {
        cod: payment.fallback1.codSupport,
        card: payment.fallback1.cardSupport,
        wallet: payment.fallback1.walletSupport,
      },
      cashAgentLocations: payment.fallback1.cashAgentLocations,
      shopifyIntegration: payment.fallback1.shopifyIntegration,
    },
    {
      provider: 'paytabs',
      name: payment.fallback2.name,
      type: 'fallback2',
      enabled: true,
      fees: payment.fallback2.fees,
      settlementCycle: payment.fallback2.settlementCycle,
      supportedMethods: {
        cod: payment.fallback2.codSupport,
        card: payment.fallback2.cardSupport,
        wallet: payment.fallback2.walletSupport,
      },
      shopifyIntegration: payment.fallback2.shopifyIntegration,
    },
  ];
}

/**
 * Get commission tiers for display
 */
export function getCommissionTiersForDisplay() {
  return AFFILIATE_SETTINGS.commissioning.tiers.map((tier, idx) => ({
    id: `tier_${idx}`,
    ...tier,
  }));
}

/**
 * Log a change to audit trail (with admin email)
 */
export function logAuditChange(
  changedBy: string,
  section: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  status: 'pending' | 'approved' | 'rejected' = 'pending'
) {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    changedBy,
    section,
    field,
    oldValue,
    newValue,
    status,
  };

  auditLog.push(entry);

  // Log to console for MVP (Phase 2: send to database/monitoring service)
  console.log(
    `[AUDIT] ${entry.timestamp.toISOString()} | ${changedBy} | ${section}.${field}`,
    { oldValue, newValue }
  );

  return entry;
}

/**
 * Get audit log entries (optionally filtered by section)
 */
export function getAuditLog(section?: string): AuditLogEntry[] {
  if (!section) {
    return [...auditLog].reverse(); // Most recent first
  }
  return auditLog
    .filter((entry) => entry.section === section)
    .reverse();
}

/**
 * Propose a change (draft state for confirmation)
 */
export function proposeDraftChange(key: string, value: unknown) {
  draftChanges.set(key, value);
  return {
    key,
    value,
    allDrafts: Object.fromEntries(draftChanges),
  };
}

/**
 * Get all draft changes pending deployment
 */
export function getDraftChanges() {
  return Object.fromEntries(draftChanges);
}

/**
 * Clear draft changes
 */
export function clearDraftChanges() {
  draftChanges.clear();
}

/**
 * Validate commission tier input
 */
export function validateCommissionTier(tier: {
  commissionValue?: number;
  minMonthlyRevenue?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (tier.commissionValue !== undefined) {
    if (tier.commissionValue < 0 || tier.commissionValue > 100) {
      errors.push('Commission rate must be between 0 and 100%');
    }
  }

  if (tier.minMonthlyRevenue !== undefined) {
    if (tier.minMonthlyRevenue < 0) {
      errors.push('Minimum monthly revenue cannot be negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate payment processor fees
 */
export function validatePaymentFees(fees: {
  percentagePerTransaction?: number;
  fixedPerTransaction?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (fees.percentagePerTransaction !== undefined) {
    if (fees.percentagePerTransaction < 0 || fees.percentagePerTransaction > 100) {
      errors.push('Percentage fee must be between 0 and 100%');
    }
  }

  if (fees.fixedPerTransaction !== undefined) {
    if (fees.fixedPerTransaction < 0) {
      errors.push('Fixed fee cannot be negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency: string = 'EGP'): string {
  return `${value.toFixed(2)} ${currency}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
