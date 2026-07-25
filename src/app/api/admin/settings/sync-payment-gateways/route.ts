/**
 * POST /api/admin/settings/sync-payment-gateways
 *
 * Triggers a one-shot sync of Shopify's legacy REST payment_gateways.json
 * endpoint onto the payment settings section, through the existing
 * propose/approve/persist audit path (see shopifyPaymentGatewaySync.ts for
 * the category-mapping rationale and why the deprecated endpoint is used
 * defensively rather than assumed to always work).
 *
 * Wired to run on-demand from the admin UI today. To run it on a schedule,
 * add an entry to vercel.json's `crons` array, e.g.:
 *
 *   { "path": "/api/admin/settings/sync-payment-gateways", "schedule": "0 3 * * *" }
 *
 * NOTE: Vercel cron invocations are unauthenticated GETs by default and this
 * route is a POST gated by withAdminAuth (admin session required), so wiring
 * a cron entry as-is would 401. Before adding the cron entry, either (a)
 * relax this route to also accept a `x-vercel-cron` presence check the way
 * Vercel's own docs describe, or (b) add a small internal POST-only cron
 * shim under /api/cron/* (mirroring the /api/cron/sync-inventory pattern
 * already referenced in vercel.json) that calls `syncShopifyPaymentGateways()`
 * directly and is protected by a CRON_SECRET bearer check, matching the
 * pattern in src/app/api/commissions/approve/route.ts. Left as a follow-up
 * since no such cron secret plumbing exists yet in this repo.
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { withAdminAuth, type AdminHandler } from '@/middleware/withAdminAuth';
import { syncShopifyPaymentGateways } from '@/lib/admin/shopifyPaymentGatewaySync';

export const runtime = 'nodejs';
export const maxDuration = 30;

const postHandler: AdminHandler = async (_request, adminCheck) => {
  try {
    const result = await syncShopifyPaymentGateways();

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          notFound: result.notFound,
          skippedReason: result.skippedReason,
        },
        { status: result.notFound ? 200 : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      touchedSlots: result.touchedSlots,
      skippedReason: result.skippedReason,
      triggeredBy: adminCheck.email,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('[sync-payment-gateways] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync Shopify payment gateways' },
      { status: 500 }
    );
  }
};

export const POST = withAdminAuth(postHandler);
