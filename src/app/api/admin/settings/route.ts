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
      const deployResult = await persistSettingsAndDeploy(
        auditEntry.id,
        newValue,
        section,
        field,
        adminCheck.email || 'admin@hex-diva.local',
        false
      );

      if (!deployResult.success) {
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

      await SettingsAuditRepository.failAudit(auditId, 'Discarded by admin');

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
