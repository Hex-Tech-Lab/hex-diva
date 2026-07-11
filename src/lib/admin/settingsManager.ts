/**
 * Settings Manager
 * Orchestrates settings persistence: file → git → deploy workflow
 * Phase 2: Full persistence via git commits and Vercel deployment
 *
 * LAW #2: Request-Scoped Supabase Client
 * - All database operations use getSupabaseAdmin() for request-scoped lifecycle
 * - No global mutable state (auditLog migrated to admin_audit_logs table)
 * - Each request gets fresh database connection with RLS context
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
import {
  persistSettingsChange,
} from './githubManager';
import {
  deployAndMonitor,
} from './vercelManager';
import {
  getSupabaseAdmin,
} from '@/lib/db';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  changedBy: string;
  section: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'deployed';
  deploymentId?: string;
  deploymentStatus?: 'pending' | 'building' | 'ready' | 'failed';
  deployedAt?: Date;
  commitHash?: string;
}

export interface DeploymentResult {
  success: boolean;
  commitHash?: string;
  deploymentId?: string;
  deploymentUrl?: string;
  message?: string;
  error?: string;
}

/**
 * Draft changes pending deployment (UI state for confirmation dialogs)
 * Note: This is temporary session state and is acceptable to be global
 */
const draftChanges: Map<string, unknown> = new Map();

/**
 * Get current settings snapshot across all configuration domains
 * Returns in-memory settings loaded from src/config/settings.ts at startup
 * @returns {Object} Object with payment (primary/fallback), affiliate (commission/payout), b2b, b2c, logistics, shopify, marketplace, and env settings
 * @remarks This is a point-in-time snapshot; changes made via settings API are not reflected until deployment completes
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
 * Get payment processor configurations formatted for admin UI display
 * @returns Array of payment processor objects with fees, settlement, and method support details
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
 * Get affiliate commission tiers formatted for admin UI display with IDs
 * @returns Array of commission tier objects indexed with tier_0, tier_1, etc.
 */
export function getCommissionTiersForDisplay() {
  return AFFILIATE_SETTINGS.commissioning.tiers.map((tier, idx) => ({
    id: `tier_${idx}`,
    ...tier,
  }));
}

/**
 * Log a settings change to audit trail in Supabase
 * Persists to admin_audit_logs table with admin email, change details, and deployment tracking
 * @param changedBy - Admin email address making the change
 * @param section - Settings section (e.g., 'payment', 'affiliate', 'b2b')
 * @param field - Field within section being changed
 * @param oldValue - Previous value before change
 * @param newValue - New value after change
 * @param action - Action type: 'propose' (pending), 'approve', or 'discard'
 * @returns AuditLogEntry with ID, timestamp, and deployment tracking info
 * @throws Error if database operation fails
 */
export async function logAuditChange(
  changedBy: string,
  section: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  action: 'propose' | 'approve' | 'discard' = 'propose'
): Promise<AuditLogEntry> {
  try {
    const supabase = getSupabaseAdmin();

    // Serialize values to JSON strings for storage
    const oldValueStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
    const newValueStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);

    const { data, error } = await (supabase
      .from('admin_audit_logs' as any)
      .insert({
        section,
        field,
        old_value: oldValueStr,
        new_value: newValueStr,
        admin_email: changedBy,
        action,
      })
      .select()
      .single() as any);

    if (error) {
      console.error('[SettingsManager] Failed to log audit change:', error);
      throw error;
    }

    // Map database record to AuditLogEntry interface
    const entry: AuditLogEntry = {
      id: data.id,
      timestamp: new Date(data.created_at),
      changedBy,
      section,
      field,
      oldValue,
      newValue,
      status: action === 'propose' ? 'pending' : action === 'approve' ? 'approved' : 'rejected',
      deploymentId: data.deployment_id || undefined,
      deploymentStatus: data.deployment_status as any,
      deployedAt: data.deployed_at ? new Date(data.deployed_at) : undefined,
      commitHash: data.commit_hash || undefined,
    };

    console.log(
      `[AUDIT] ${entry.timestamp.toISOString()} | ${changedBy} | ${section}.${field}`,
      { oldValue, newValue, action }
    );

    return entry;
  } catch (error) {
    console.error('[SettingsManager] Audit logging failed:', error);
    throw error;
  }
}

/**
 * Fetch audit log entries from Supabase, optionally filtered by section
 * @param section - Optional settings section to filter by (e.g., 'payment', 'affiliate')
 * @returns Array of AuditLogEntry objects ordered by most recent first
 * @throws Error if database query fails
 */
export async function getAuditLog(section?: string): Promise<AuditLogEntry[]> {
  try {
    const supabase = getSupabaseAdmin();

    let query = (supabase
      .from('admin_audit_logs' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any);

    if (section) {
      query = query.eq('section', section);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SettingsManager] Failed to fetch audit log:', error);
      throw error;
    }

    // Map database records to AuditLogEntry interface
    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.created_at),
      changedBy: row.admin_email,
      section: row.section,
      field: row.field,
      oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
      newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
      status: mapActionToStatus(row.action),
      deploymentId: row.deployment_id || undefined,
      deploymentStatus: row.deployment_status as any,
      deployedAt: row.deployed_at ? new Date(row.deployed_at) : undefined,
      commitHash: row.commit_hash || undefined,
    }));
  } catch (error) {
    console.error('[SettingsManager] Audit log fetch failed:', error);
    throw error;
  }
}

/**
 * Map action type to status enum
 * Converts audit log action strings to normalized status values
 * @param {string} action - Action from audit log ('propose', 'approve', 'discard', 'deployed')
 * @returns {'pending' | 'approved' | 'rejected' | 'deployed'} Normalized status value; defaults to 'pending'
 * @remarks Internal helper used by audit log queries
 */
function mapActionToStatus(action: string): 'pending' | 'approved' | 'rejected' | 'deployed' {
  switch (action) {
    case 'propose':
      return 'pending';
    case 'approve':
      return 'approved';
    case 'discard':
      return 'rejected';
    case 'deployed':
      return 'deployed';
    default:
      return 'pending';
  }
}

/**
 * Propose a draft settings change for admin confirmation before deployment
 * Stores change in temporary session state (Map); not persisted to database until approved
 * @param {string} key - Unique key for the draft change (e.g., 'payment.fees.percentage')
 * @param {unknown} value - New value being proposed (any serializable type)
 * @returns {{key: string; value: unknown; allDrafts: Object}} Object with key, value, and map of all current draft changes
 * @remarks Draft changes are session-scoped and cleared on restart; used by admin UI for multi-step change workflows
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
 * Get all draft settings changes pending admin approval
 * Retrieves current session-scoped draft changes
 * @returns {Object} Object mapping change keys to their proposed values; empty object if no drafts
 * @remarks Used by admin UI to display pending changes for review before approval
 */
export function getDraftChanges() {
  return Object.fromEntries(draftChanges);
}

/**
 * Clear all pending draft changes from session state
 * Empties the draftChanges Map
 * @returns {void} No return value
 * @remarks Called after successful deployment to reset UI state; can be called manually to discard drafts
 */
export function clearDraftChanges() {
  draftChanges.clear();
}

/**
 * Validate affiliate commission tier configuration for valid ranges
 * Checks commission rate (0-100%) and minimum revenue (non-negative)
 * @param {Object} tier - Commission tier object with optional fields
 * @param {number} [tier.commissionValue] - Commission percentage (0-100)
 * @param {number} [tier.minMonthlyRevenue] - Minimum monthly revenue threshold
 * @returns {{valid: boolean; errors: string[]}} Validation result with boolean flag and array of error messages
 * @remarks Used by admin API to validate tier changes before persistence
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
 * Validate payment processor fee configuration for valid ranges
 * Checks percentage fee (0-100%) and fixed fee (non-negative)
 * @param {Object} fees - Fee object with optional fields
 * @param {number} [fees.percentagePerTransaction] - Percentage fee per transaction (0-100)
 * @param {number} [fees.fixedPerTransaction] - Fixed fee per transaction (currency units)
 * @returns {{valid: boolean; errors: string[]}} Validation result with boolean flag and array of error messages
 * @remarks Used by admin API to validate payment processor fee changes
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
 * Format numeric value as currency string for display
 * Formats with 2 decimal places and appends currency code
 * @param {number} value - Numeric value to format
 * @param {string} [currency='EGP'] - ISO currency code (e.g., 'EGP', 'USD')
 * @returns {string} Formatted string with 2 decimal places and currency code (e.g., '100.00 EGP')
 * @remarks Used by admin UI to display monetary values consistently
 */
export function formatCurrency(value: number, currency: string = 'EGP'): string {
  return `${value.toFixed(2)} ${currency}`;
}

/**
 * Format numeric value as percentage string for display
 * Formats with 1 decimal place and appends % symbol
 * @param {number} value - Numeric value (0-100) representing percentage
 * @returns {string} Formatted string with 1 decimal place and % symbol (e.g., '15.5%')
 * @remarks Used by admin UI to display percentage values consistently
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Find a specific audit log entry by ID from Supabase
 * @param id - Audit log entry ID
 * @returns AuditLogEntry if found, undefined otherwise
 * @throws Error if database query fails
 */
export async function findAuditEntryById(id: string): Promise<AuditLogEntry | undefined> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await (supabase
      .from('admin_audit_logs' as any)
      .select('*')
      .eq('id', id)
      .single() as any);

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[SettingsManager] Failed to find audit entry:', error);
      throw error;
    }

    if (!data) {
      return undefined;
    }

    return {
      id: data.id,
      timestamp: new Date(data.created_at),
      changedBy: data.admin_email,
      section: data.section,
      field: data.field,
      oldValue: data.old_value ? JSON.parse(data.old_value) : undefined,
      newValue: data.new_value ? JSON.parse(data.new_value) : undefined,
      status: mapActionToStatus(data.action),
      deploymentId: data.deployment_id || undefined,
      deploymentStatus: data.deployment_status as any,
      deployedAt: data.deployed_at ? new Date(data.deployed_at) : undefined,
      commitHash: data.commit_hash || undefined,
    };
  } catch (error) {
    console.error('[SettingsManager] Audit entry lookup failed:', error);
    throw error;
  }
}

/**
 * Update audit log entry with deployment status from Vercel
 * @param id - Audit log entry ID to update
 * @param deploymentId - Vercel deployment ID
 * @param deploymentStatus - Deployment status ('pending', 'building', 'ready', 'failed', or 'created')
 * @param commitHash - Optional git commit hash for the deployment
 * @returns Updated AuditLogEntry if found, undefined otherwise
 * @throws Error if database update fails
 */
export async function updateAuditEntryDeployment(
  id: string,
  deploymentId: string,
  deploymentStatus: 'pending' | 'building' | 'ready' | 'failed' | 'created',
  commitHash?: string
): Promise<AuditLogEntry | undefined> {
  try {
    const supabase = getSupabaseAdmin();

    // Normalize 'created' to 'pending'
    const normalizedStatus = deploymentStatus === 'created' ? 'pending' : deploymentStatus;

    const updateData: any = {
      deployment_id: deploymentId,
      deployment_status: normalizedStatus,
    };

    if (commitHash) {
      updateData.commit_hash = commitHash;
    }

    if (deploymentStatus === 'ready') {
      updateData.deployed_at = new Date().toISOString();
    }

    const { data, error } = await (supabase
      .from('admin_audit_logs' as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as any);

    if (error) {
      console.error('[SettingsManager] Failed to update audit entry deployment:', error);
      throw error;
    }

    if (!data) {
      return undefined;
    }

    const entry: AuditLogEntry = {
      id: data.id,
      timestamp: new Date(data.created_at),
      changedBy: data.admin_email,
      section: data.section,
      field: data.field,
      oldValue: data.old_value ? JSON.parse(data.old_value) : undefined,
      newValue: data.new_value ? JSON.parse(data.new_value) : undefined,
      status: deploymentStatus === 'ready' ? 'deployed' : mapActionToStatus(data.action),
      deploymentId: data.deployment_id || undefined,
      deploymentStatus: data.deployment_status as any,
      deployedAt: data.deployed_at ? new Date(data.deployed_at) : undefined,
      commitHash: data.commit_hash || undefined,
    };

    console.log(`[AuditLog] Updated deployment status for ${id}:`, {
      deploymentId,
      deploymentStatus: normalizedStatus,
      commitHash,
    });

    return entry;
  } catch (error) {
    console.error('[SettingsManager] Audit entry deployment update failed:', error);
    throw error;
  }
}

/**
 * Persist settings change through git → Vercel deployment workflow
 * Atomic operation: writes config file, commits to git, triggers Vercel deployment
 * @param auditEntryId - Audit log entry ID to link deployment tracking to
 * @param newSettingsContent - New settings JSON content to persist
 * @param section - Settings section being changed
 * @param field - Field within section being changed
 * @param adminEmail - Admin email making the change (for commit message)
 * @param waitForDeployment - If true, wait for Vercel deployment to complete (default: false)
 * @returns DeploymentResult with success status, commit hash, deployment ID, and URL
 */
export async function persistSettingsAndDeploy(
  auditEntryId: string,
  newSettingsContent: string,
  section: string,
  field: string,
  adminEmail: string,
  waitForDeployment: boolean = false
): Promise<DeploymentResult> {
  try {
    // Step 1: Persist to git
    const gitResult = await persistSettingsChange(
      newSettingsContent,
      section,
      field,
      adminEmail
    );

    if (!gitResult.success) {
      return {
        success: false,
        error: gitResult.error,
      };
    }

    // Step 2: Update audit log with commit hash (await async operation)
    await updateAuditEntryDeployment(
      auditEntryId,
      'pending', // Will be updated after deployment starts
      'pending',
      gitResult.commitHash
    );

    // Step 3: Trigger deployment
    const deploymentMessage = `Admin: update ${section}.${field} by ${adminEmail}`;
    const deployResult = await deployAndMonitor(
      deploymentMessage,
      waitForDeployment,
      300 // 5 minute timeout
    );

    if (!deployResult.success) {
      return {
        success: false,
        commitHash: gitResult.commitHash,
        error: deployResult.error,
      };
    }

    // Step 4: Update audit log with deployment info (await async operation)
    if (deployResult.deploymentId) {
      await updateAuditEntryDeployment(
        auditEntryId,
        deployResult.deploymentId,
        deployResult.status || 'pending',
        gitResult.commitHash
      );
    }

    return {
      success: true,
      commitHash: gitResult.commitHash,
      deploymentId: deployResult.deploymentId,
      deploymentUrl: deployResult.deploymentUrl,
      message: deployResult.message,
    };
  } catch (error) {
    console.error('[SettingsManager] Persistence workflow failed:', error);
    return {
      success: false,
      error: `Persistence failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
