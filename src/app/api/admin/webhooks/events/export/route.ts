/**
 * GET /api/admin/webhooks/events/export
 * Export webhook events as CSV
 * Requires: Admin authentication
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
