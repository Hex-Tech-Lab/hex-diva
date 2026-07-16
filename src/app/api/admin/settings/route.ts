/**
 * Admin Settings API Route (Rebuilt for DB-backed & contract-validated settings)
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  getCurrentSettings,
  getAuditLog,
  logAuditChange,
  persistSettingsAndDeploy,
  findAuditEntryById,
} from '@/lib/admin/settingsManager';
import { withAdminAuth, type AdminHandler } from '@/middleware/withAdminAuth';
import { SettingsAuditRepository } from '@/lib/admin/settingsAudit';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Key-order-insensitive stringify for deep equality of JSONB payloads
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(',')}}`;
}

function deepEquals(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/**
 * GET /api/admin/settings
 */
const getHandler: AdminHandler = async (_request, adminCheck) => {
  try {
    const currentSettings = await getCurrentSettings();
    const auditLog = await getAuditLog();

    return NextResponse.json({
      success: true,
      data: {
        settings: currentSettings,
        auditLog: auditLog.slice(0, 50),
        draftChanges: {},
        admin: {
          email: adminCheck.email,
          verifiedAt: adminCheck.verifiedAt,
        },
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
};

export const GET = withAdminAuth(getHandler);

/**
 * POST /api/admin/settings
 */
const postHandler: AdminHandler = async (request, adminCheck) => {
  try {
    const body = await request.json();
    const { action, section, field, oldValue, newValue, auditId } = body;

    // Validate request
    if (!action || !section || !field) {
      return NextResponse.json(
        { error: 'Missing required fields: action, section, field' },
        { status: 400 }
      );
    }

    const validSections = [
      'payment',
      'affiliate',
      'b2b',
      'b2c',
      'logistics',
      'shopify',
      'marketplace',
      'env',
      'system',
    ];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section: ${section}` },
        { status: 400 }
      );
    }

    if (action === 'propose') {
      const auditEntry = await logAuditChange(
        adminCheck.email || 'unknown',
        section,
        field,
        oldValue,
        newValue,
        'propose'
      );

      return NextResponse.json({
        success: true,
        message: `Draft change proposed for ${section}.${field}`,
        data: {
          auditEntry,
        },
      });
    } else if (action === 'approve') {
      if (!auditId) {
        return NextResponse.json(
          { error: 'auditId required to approve a change' },
          { status: 400 }
        );
      }

      // Approve-binding: the audit row must match the request payload exactly
      const auditRow = await SettingsAuditRepository.getAuditById(auditId);
      if (!auditRow) {
        return NextResponse.json(
          { error: `Audit entry ${auditId} not found` },
          { status: 404 }
        );
      }
      if (
        auditRow.section !== section ||
        auditRow.field !== field ||
        !deepEquals(auditRow.new_value, newValue)
      ) {
        return NextResponse.json(
          {
            error:
              'Audit entry does not match the request payload (section, field, or newValue differ). Refusing to approve.',
          },
          { status: 409 }
        );
      }

      // Log the approval and transition status (will throw if not DRAFT)
      const auditEntry = await logAuditChange(
        adminCheck.email || 'unknown',
        section,
        field,
        oldValue,
        newValue,
        'approve',
        auditId
      );

      // Trigger settings persist (update in DB) and deployment workflow
      let deployResult = await persistSettingsAndDeploy(
        auditEntry.id,
        newValue,
        section,
        field,
        adminCheck.email || 'admin@hex-diva.local',
        false
      );

      // CAS conflict: retry exactly once against the fresh section state
      if (!deployResult.success && deployResult.conflict) {
        deployResult = await persistSettingsAndDeploy(
          auditEntry.id,
          newValue,
          section,
          field,
          adminCheck.email || 'admin@hex-diva.local',
          false
        );
      }

      if (!deployResult.success) {
        if (deployResult.conflict) {
          await SettingsAuditRepository.failAudit(auditEntry.id, deployResult.error);
          return NextResponse.json(
            {
              success: false,
              message: `Concurrent settings modification: ${deployResult.error}`,
              error: deployResult.error,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            message: `Failed to persist changes: ${deployResult.error}`,
            error: deployResult.error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Change approved and persisted for ${section}.${field}`,
        data: {
          auditEntry: await findAuditEntryById(auditEntry.id),
          deploymentId: deployResult.deploymentId,
          deploymentUrl: deployResult.deploymentUrl,
          commitHash: deployResult.commitHash,
          status: 'applied',
        },
      });
    } else if (action === 'discard') {
      if (!auditId) {
        return NextResponse.json(
          { error: 'auditId required to discard a change' },
          { status: 400 }
        );
      }

      // CAS transition DRAFT/APPROVED -> DISCARDED (recorded as a discard, not a failure)
      await SettingsAuditRepository.discardAudit(auditId);

      return NextResponse.json({
        success: true,
        message: `Draft change for ${section}.${field} discarded`,
      });
    } else {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Use "propose", "approve", or "discard".` },
        { status: 400 }
      );
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error('Settings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process settings change' },
      { status: 500 }
    );
  }
};

export const POST = withAdminAuth(postHandler);
