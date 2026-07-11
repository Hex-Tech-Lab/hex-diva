/**
 * GET /api/admin/webhooks/events/export
 *
 * Exports webhook events as CSV for compliance, analysis, and record-keeping
 *
 * Query parameters:
 * - `provider` (optional): Filter by provider
 * - `status` (optional): Filter by status
 * - `timeRange` (optional): Time window filter
 * - `startDate` (optional): ISO date string
 * - `endDate` (optional): ISO date string
 *
 * Returns CSV with columns:
 * id, webhook_id, provider, event_type, status, latency_ms, is_idempotent, original_event_id, error_message, created_at
 *
 * @requires Admin authentication
 * @returns CSV file with UTF-8 encoding
 * @throws {403} If not admin
 * @throws {500} On export or serialization errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters: any = {};

    if (provider && provider !== 'all') {
      filters.provider = provider;
    }

    if (status && status !== 'all') {
      filters.status = status;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    // Export as CSV
    const csv = await webhookEventInspector.exportEventsAsCSV(filters);

    // Log export
    Sentry.addBreadcrumb({
      category: 'webhook_monitoring',
      message: 'Exported webhook events as CSV',
      level: 'info',
      data: {
        filters,
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="webhook-events-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[WebhookExport API] Error:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'webhook_export_api',
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export events',
      },
      { status: 500 }
    );
  }
}
