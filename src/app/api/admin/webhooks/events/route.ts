/**
 * GET /api/admin/webhooks/events
 * Retrieve webhook events with filtering and statistics
 * Requires: Admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { webhookEventLogger } from '@/lib/webhooks/eventLog';
import { latencyTracker } from '@/lib/webhooks/latencyTracker';
import * as Sentry from '@sentry/nextjs';

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

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || undefined;
    const status = searchParams.get('status') || undefined;
    const eventType = searchParams.get('event_type') || undefined;
    const timeRange = searchParams.get('timeRange') || '24h';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Calculate date range
    let startDate: Date | undefined;
    const endDate = new Date();

    switch (timeRange) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Fetch events
    const { events, total } = await webhookEventLogger.getEvents({
      provider: provider as any,
      status: status as any,
      eventType,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Get summary statistics
    const stats = await webhookEventLogger.getSummaryStats(
      timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '7d' ? 168 : 24
    );

    // Add latency metrics from tracker
    const latencyMetrics = latencyTracker.getSLAReport();

    Sentry.addBreadcrumb({
      category: 'webhook_monitoring',
      message: 'Fetched webhook events',
      level: 'info',
      data: {
        event_count: events.length,
        time_range: timeRange,
        provider,
        status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        events,
        total,
        stats,
        latencyMetrics,
        pagination: {
          limit,
          offset,
          total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[WebhookEvents API] Error:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'webhook_events_api',
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/webhooks/events
 * Not implemented - events are created via webhook handlers
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'POST not implemented. Events are created automatically by webhook handlers.',
    },
    { status: 405 }
  );
}
