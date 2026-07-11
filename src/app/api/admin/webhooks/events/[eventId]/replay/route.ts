/**
 * POST /api/admin/webhooks/events/[eventId]/replay
 *
 * Initiates replay of a previously received webhook event
 * Creates a new webhook_replays record and queues event for reprocessing
 * Used for manual recovery from transient failures or missed processing
 *
 * Request body:
 * ```json
 * { "reason": "Optional explanation for manual replay" }
 * ```
 *
 * @param params.eventId - UUID of the webhook event to replay
 * @returns {Object} Success confirmation with event ID
 * @requires Admin authentication
 * @throws {400} If event not found or replay initiation fails
 * @throws {500} On internal server errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookEventInspector } from '@/lib/webhooks/eventInspector';
import * as Sentry from '@sentry/nextjs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
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
      { error: 'Failed to initiate replay' },
      { status: 500 }
    );
  }
}
