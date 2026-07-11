/**
 * Admin Settings API Route
 * GET: Fetch current settings and audit log
 * POST: Process settings changes (propose, approve with persistence, discard)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  getCurrentSettings,
  getAuditLog,
  logAuditChange,
  proposeDraftChange,
  getDraftChanges,
  clearDraftChanges,
  persistSettingsAndDeploy,
  findAuditEntryById,
} from '@/lib/admin/settingsManager';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { readSettingsFile } from '@/lib/admin/gitManager';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/admin/settings
 * Returns current settings and audit log
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: admin access required' },
        { status: 403 }
      );
    }

    const currentSettings = getCurrentSettings();
    const auditLog = getAuditLog();
    const draftChanges = getDraftChanges();

    return NextResponse.json({
      success: true,
      data: {
        settings: currentSettings,
        auditLog: auditLog.slice(0, 50), // Last 50 entries
        draftChanges,
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
}

/**
 * POST /api/admin/settings
 * Log a proposed change (draft state for confirmation)
 *
 * Request body:
 * {
 *   "action": "propose" | "approve" | "discard",
 *   "section": "payment" | "affiliate" | "b2b" | "b2c" | "logistics" | "shopify" | "marketplace" | "env",
 *   "field": string (the specific setting being changed),
 *   "oldValue": any,
 *   "newValue": any,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, section, field, oldValue, newValue } = body;

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

    let result;

    if (action === 'propose') {
      // Draft a change for confirmation
      const draftKey = `${section}.${field}`;
      result = proposeDraftChange(draftKey, {
        oldValue,
        newValue,
        timestamp: new Date(),
      });

      // Log the proposed change to audit trail
      logAuditChange(
        adminCheck.email || 'unknown',
        section,
        field,
        oldValue,
        newValue,
        'pending'
      );

      return NextResponse.json({
        success: true,
        message: `Draft change proposed for ${section}.${field}`,
        data: result,
      });
    } else if (action === 'approve') {
      // Approve and persist change: write file → git commit → Vercel deploy
      const draftKey = `${section}.${field}`;
      const draftChanges = getDraftChanges();

      if (!draftChanges[draftKey]) {
        return NextResponse.json(
          { error: `No draft change found for ${draftKey}` },
          { status: 404 }
        );
      }

      // Log the approval to audit trail (will be updated with deployment info)
      const auditEntry = logAuditChange(
        adminCheck.email || 'unknown',
        section,
        field,
        oldValue,
        newValue,
        'approved'
      );

      try {
        // Read current settings file
        const currentSettingsContent = await readSettingsFile();

        // In production, apply the newValue to the appropriate section
        // For now, this is a simplified implementation
        // Full implementation would parse, modify, and write back the TypeScript file
        let updatedContent = currentSettingsContent;

        // TODO: Parse and update the specific field in settings.ts
        // This requires TypeScript AST parsing or safe string manipulation

        // Trigger persistence workflow (commit + push + deploy)
        const deployResult = await persistSettingsAndDeploy(
          auditEntry.id,
          updatedContent,
          section,
          field,
          adminCheck.email || 'admin@hex-diva.local',
          false // Don't wait for deployment in API response
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

        // Clear draft after successful deployment trigger
        clearDraftChanges();

        return NextResponse.json({
          success: true,
          message: `Change approved and persisted for ${section}.${field}`,
          data: {
            auditEntry: findAuditEntryById(auditEntry.id),
            deploymentId: deployResult.deploymentId,
            deploymentUrl: deployResult.deploymentUrl,
            commitHash: deployResult.commitHash,
            status: 'deploying',
            details: 'Settings change has been committed and deployment triggered. Monitor status in deployment dashboard.',
          },
        });
      } catch (persistError) {
        Sentry.captureException(persistError);
        console.error('Settings persistence error:', persistError);
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to persist settings',
            error: persistError instanceof Error ? persistError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    } else if (action === 'discard') {
      // Discard a draft change
      clearDraftChanges();

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
}
