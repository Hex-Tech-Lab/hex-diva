/**
 * Settings Audit System
 * Creates, updates, and manages audit trails in settings_audit table.
 */

import { getSupabaseAdmin } from '@/lib/db';

export interface SettingsAuditRecord {
  id: string;
  idempotency_key?: string;
  section: string;
  field: string;
  old_value: any;
  new_value: any;
  status: 'DRAFT' | 'APPROVED' | 'APPLIED' | 'FAILED' | 'DISCARDED';
  admin_email: string;
  approved_by?: string | null;
  failure_reason?: string | null;
  deployment_id?: string;
  commit_hash?: string;
  created_at: string;
  updated_at: string;
}

export class SettingsAuditRepository {
  /**
   * Log/propose a draft setting change
   */
  static async proposeDraft(params: {
    section: string;
    field: string;
    oldValue: any;
    newValue: any;
    adminEmail: string;
    idempotencyKey?: string;
  }): Promise<SettingsAuditRecord> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('settings_audit' as any)
      .insert({
        section: params.section,
        field: params.field,
        old_value: params.oldValue as any,
        new_value: params.newValue as any,
        status: 'DRAFT',
        admin_email: params.adminEmail,
        idempotency_key: params.idempotencyKey
      } as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create audit draft: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Transition draft to APPROVED status.
   * Records the approver in approved_by; admin_email keeps the proposer identity.
   */
  static async approveAudit(id: string, adminEmail: string): Promise<SettingsAuditRecord> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('settings_audit' as any)
      .update({
        status: 'APPROVED',
        approved_by: adminEmail,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .eq('status', 'DRAFT') // CAS transition DRAFT -> APPROVED
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to approve settings audit ${id}: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Update audit row after successful apply (APPLIED)
   */
  static async applyAudit(
    id: string,
    deploymentId?: string,
    commitHash?: string
  ): Promise<SettingsAuditRecord> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('settings_audit' as any)
      .update({
        status: 'APPLIED',
        deployment_id: deploymentId,
        commit_hash: commitHash,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to apply settings audit ${id}: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Update audit row after failure (FAILED), persisting the failure reason
   */
  static async failAudit(id: string, reason?: string): Promise<SettingsAuditRecord> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('settings_audit' as any)
      .update({
        status: 'FAILED',
        failure_reason: reason ?? null,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn(`[settingsAudit] failed to fail settings audit: reason=${reason}`);
      throw new Error(`Failed to fail settings audit ${id}: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Discard a pending audit entry.
   * CAS transition: only DRAFT or APPROVED rows can move to DISCARDED.
   */
  static async discardAudit(id: string): Promise<SettingsAuditRecord> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('settings_audit' as any)
      .update({
        status: 'DISCARDED',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .in('status', ['DRAFT', 'APPROVED']) // CAS transition DRAFT/APPROVED -> DISCARDED
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to discard settings audit ${id}: ${error.message}`);
    }

    return data as any;
  }

  /**
   * Get a single audit row by ID (returns null when not found)
   */
  static async getAuditById(id: string): Promise<SettingsAuditRecord | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('settings_audit' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get settings audit ${id}: ${error.message}`);
    }

    return (data as any) ?? null;
  }

  /**
   * Get all audits ordered by created_at desc
   */
  static async getAudits(section?: string): Promise<SettingsAuditRecord[]> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('settings_audit' as any).select('*').order('created_at', { ascending: false });
    
    if (section) {
      query = (query as any).eq('section', section);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get settings audits: ${error.message}`);
    }

    return data as any;
  }
}
