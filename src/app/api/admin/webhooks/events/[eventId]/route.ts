/**
 * GET /api/admin/webhooks/events/[eventId]
 *
 * Retrieves detailed information about a specific webhook event
 * Includes: original event data, duplicates, replay history, and forensics
 *
 * @param params.eventId - UUID of the webhook event to retrieve
 * @returns {Object} Event details with duplicates array, original event (if duplicate), and replays array
 * @requires Admin authentication
 * @throws {404} If event not found
 * @throws {403} If not admin
 * @throws {500} On database or processing errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';
import * as Sentry from '@sentry/nextjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: admin access required' },
        { status: 403 }
      );
    }

    const { eventId } = await params;

    // Get comprehensive event details
    const eventDetails = await webhookEventInspector.getEventDetails(eventId);

    if (!eventDetails) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    Sentry.addBreadcrumb({
      category: 'webhook_monitoring',
      message: 'Retrieved webhook event details',
      level: 'info',
      data: {
        event_id: eventId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: eventDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[WebhookEventDetails API] Error:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'webhook_event_details_api',
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event details',
      },
      { status: 500 }
    );
  }
}
