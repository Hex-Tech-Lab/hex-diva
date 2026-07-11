/**
 * Admin Settings API Route
 *
 * Manages application settings with audit trail and deployment workflow:
 * - GET: Fetch current settings, audit log, and draft changes
 * - POST: Process settings changes (propose draft, approve + deploy, discard)
 *
 * @module api/admin/settings
 */

import { NextResponse } from 'next/server'
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
import { withAdminAuth, type AdminHandler } from '@/middleware/withAdminAuth';
import { readSettingsFile } from '@/lib/admin/githubManager';
import { mutateSettings } from '@/lib/admin/settingsMutator';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/admin/settings
 *
 * Fetches current settings, audit log, and any pending draft changes
 *
 * @returns {Object} Settings state including current values, audit trail (last 50 entries), drafts, and admin metadata
 * @throws {403} If request lacks admin authorization
 * @throws {500} On internal server errors
 */
const getHandler: AdminHandler = async (_request, adminCheck) => {
  try {
    const currentSettings = getCurrentSettings();
    const auditLog = await getAuditLog(); // Now async
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
};

export const GET = withAdminAuth(getHandler);

/**
 * POST /api/admin/settings
 *
 * Process settings changes through a three-step workflow:
 *
 * 1. **propose**: Creates a draft change for review (stored in-memory, audit logged)
 * 2. **approve**: Persists change to git, commits, and triggers Vercel deployment
 * 3. **discard**: Removes a draft change without deploying
 *
 * Request body schema:
 * ```json
 * {
 *   "action": "propose" | "approve" | "discard",
 *   "section": "payment" | "affiliate" | "b2b" | "b2c" | "logistics" | "shopify" | "marketplace" | "env",
 *   "field": "field.path.to.setting",
 *   "oldValue": "current value",
 *   "newValue": "proposed value"
 * }
 * ```
 *
 * @returns {Object} Success response with audit entry or deployment status
 * @throws {400} If section/field invalid or required fields missing
 * @throws {403} If request lacks admin authorization
 * @throws {500} On deployment or persistence failures
 */
const postHandler: AdminHandler = async (request, adminCheck) => {
  try {

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

      // Log the proposed change to audit trail (now async)
      await logAuditChange(
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

      // Log the approval to audit trail (will be updated with deployment info, now async)
      const auditEntry = await logAuditChange(
        adminCheck.email || 'unknown',
        section,
        field,
        oldValue,
        newValue,
        'approve'
      );

      try {
        // Mutate settings.ts file with the new value
        const mutationResult = await mutateSettings({
          section,
          field,
          oldValue,
          newValue,
        });

        if (!mutationResult.success) {
          return NextResponse.json(
            {
              success: false,
              message: `Failed to update settings file: ${mutationResult.error}`,
              error: mutationResult.error,
              backupPath: mutationResult.backupPath,
            },
            { status: 500 }
          );
        }

        console.log(
          `[AdminSettings] Successfully mutated ${field}: ${mutationResult.message} (backup: ${mutationResult.backupPath})`
        );

        // Read the updated settings file
        const updatedContent = await readSettingsFile();

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
            auditEntry: await findAuditEntryById(auditEntry.id), // Now async
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
};

export const POST = withAdminAuth(postHandler);
