/**
 * Settings Manager Rebuild
 * Backed by platform_settings table and settings_audit table.
 */

import { SettingsRepository } from './settingsRepository';
import { SettingsAuditRepository, type SettingsAuditRecord } from './settingsAudit';
import { isVercelConfigured, triggerDeployment, waitForDeployment } from './vercelManager';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  changedBy: string;
  section: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'deployed' | 'failed' | 'applied';
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
 * Get current settings snapshot across all configuration domains.
 * Reads directly from cache or DB.
 */
export async function getCurrentSettings() {
  return SettingsRepository.getAllSettings();
}

/**
 * Get payment processor configurations formatted for admin UI display
 */
export async function getPaymentProcessorsForDisplay() {
  const payment = await SettingsRepository.getSetting('payment');
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
 */
export async function getCommissionTiersForDisplay() {
  const affiliate = await SettingsRepository.getSetting('affiliate');
  return affiliate.commissioning.tiers.map((tier, idx) => ({
    id: `tier_${idx}`,
    ...tier,
  }));
}

/**
 * Log a settings change to audit trail in Supabase
 */
export async function logAuditChange(
  changedBy: string,
  section: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  action: 'propose' | 'approve' | 'discard' = 'propose',
  auditId?: string
): Promise<AuditLogEntry> {
  let record: SettingsAuditRecord;

  if (action === 'propose') {
    record = await SettingsAuditRepository.proposeDraft({
      section,
      field,
      oldValue,
      newValue,
      adminEmail: changedBy,
    });
  } else if (action === 'approve' && auditId) {
    record = await SettingsAuditRepository.approveAudit(auditId, changedBy);
  } else {
    // If discard or any other action, update status to FAILED or similar
    if (auditId) {
      record = await SettingsAuditRepository.failAudit(auditId, 'Discarded by admin');
    } else {
      throw new Error('Audit ID required for non-propose actions');
    }
  }

  return mapAuditRecordToEntry(record);
}

/**
 * Fetch audit log entries from Supabase
 */
export async function getAuditLog(section?: string): Promise<AuditLogEntry[]> {
  const records = await SettingsAuditRepository.getAudits(section);
  return records.map(mapAuditRecordToEntry);
}

function mapAuditRecordToEntry(row: SettingsAuditRecord): AuditLogEntry {
  let status: AuditLogEntry['status'] = 'pending';
  if (row.status === 'APPROVED') status = 'approved';
  if (row.status === 'APPLIED') status = 'applied';
  if (row.status === 'FAILED') status = 'failed';

  return {
    id: row.id,
    timestamp: new Date(row.created_at),
    changedBy: row.admin_email,
    section: row.section,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    status,
    deploymentId: row.deployment_id || undefined,
    commitHash: row.commit_hash || undefined,
  };
}

/**
 * Draft changes pending deployment (UI helper only - no module state)
 */
export function proposeDraftChange(key: string, value: unknown) {
  return {
    key,
    value,
    allDrafts: {},
  };
}

export function getDraftChanges() {
  return {};
}

export function clearDraftChanges() {}

export function validateCommissionTier(tier: {
  commissionValue?: number;
  minMonthlyRevenue?: number;
}) {
  const errors: string[] = [];
  if (tier.commissionValue !== undefined && (tier.commissionValue < 0 || tier.commissionValue > 100)) {
    errors.push('Commission rate must be between 0 and 100%');
  }
  if (tier.minMonthlyRevenue !== undefined && tier.minMonthlyRevenue < 0) {
    errors.push('Minimum monthly revenue cannot be negative');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePaymentFees(fees: {
  percentagePerTransaction?: number;
  fixedPerTransaction?: number;
}) {
  const errors: string[] = [];
  if (fees.percentagePerTransaction !== undefined && (fees.percentagePerTransaction < 0 || fees.percentagePerTransaction > 100)) {
    errors.push('Percentage fee must be between 0 and 100%');
  }
  if (fees.fixedPerTransaction !== undefined && fees.fixedPerTransaction < 0) {
    errors.push('Fixed fee cannot be negative');
  }
  return { valid: errors.length === 0, errors };
}

export function formatCurrency(value: number, currency: string = 'EGP'): string {
  return `${value.toFixed(2)} ${currency}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export async function findAuditEntryById(id: string): Promise<AuditLogEntry | undefined> {
  const audits = await SettingsAuditRepository.getAudits();
  const found = audits.find(a => a.id === id);
  return found ? mapAuditRecordToEntry(found) : undefined;
}

/**
 * Apply the settings change directly to the database and trigger a deployment.
 */
export async function persistSettingsAndDeploy(
  auditEntryId: string,
  newSettingsValue: any,
  section: string,
  field: string,
  adminEmail: string,
  waitForDeploymentTrigger: boolean = false
): Promise<DeploymentResult> {
  try {
    // 1. Update setting in the database
    const currentSectionValue = await SettingsRepository.getSetting(section as any);
    
    const updatedSectionValue = { ...currentSectionValue };
    
    // Safety check path parsing:
    const pathParts = (field || '').split('.');
    let currentObj: any = updatedSectionValue;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part) {
        if (!currentObj[part]) {
          currentObj[part] = {};
        }
        currentObj = currentObj[part];
      }
    }
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      currentObj[lastPart] = newSettingsValue;
    }

    // Save to DB
    await SettingsRepository.updateSetting(section as any, updatedSectionValue, adminEmail);

    // 2. Trigger deployment
    let commitHash = 'db-update';
    let deploymentId = 'db-deploy';
    let deploymentUrl = '';

    if (isVercelConfigured()) {
      const deployResult = await triggerDeployment();
      if (deployResult.success && deployResult.deploymentId) {
        deploymentId = deployResult.deploymentId;
        deploymentUrl = deployResult.deploymentUrl || '';
        
        if (waitForDeploymentTrigger) {
          await waitForDeployment(deploymentId);
        }
      }
    }

    // 3. Mark applied in audit log
    await SettingsAuditRepository.applyAudit(auditEntryId, deploymentId, commitHash);

    return {
      success: true,
      commitHash,
      deploymentId,
      deploymentUrl,
    };
  } catch (error) {
    console.error('[SettingsManager] Failed to apply settings and deploy:', error);
    await SettingsAuditRepository.failAudit(auditEntryId, error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
