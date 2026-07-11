/**
 * POST /api/admin/webhooks/events/[eventId]/replay
 * Initiate replay of a webhook event
 * Requires: Admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';
import * as Sentry from '@sentry/nextjs';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Initiate replay
    const result = await webhookEventInspector.initiateEventReplay(
      eventId,
      reason || 'Manual replay via admin dashboard',
      undefined // userId would come from authenticated session
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message,
        },
        { status: 400 }
      );
    }

    // Log replay initiation
    Sentry.addBreadcrumb({
      category: 'webhook_monitoring',
      message: 'Webhook event replay initiated',
      level: 'info',
      data: {
        event_id: eventId,
        reason,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        eventId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[WebhookReplay API] Error:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'webhook_replay_api',
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate replay',
      },
      { status: 500 }
    );
  }
}
