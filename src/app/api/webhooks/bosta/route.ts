import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { checkIdempotency, markWebhookProcessed, releaseIdempotencyKey } from '@/lib/webhooks/idempotencyManager';
import * as Sentry from '@sentry/nextjs';
import type { ShipmentStatus } from '@/lib/fulfillment/types';

/**
 * POST /api/webhooks/bosta
 * Handle Bosta delivery status update callbacks.
 *
 * SIGNATURE VERIFICATION NOT IMPLEMENTED -- Bosta's webhook signing scheme
 * (if any) is unconfirmed, same gap as the REST endpoint details (see
 * src/lib/fulfillment/bosta/client.ts). Every other webhook route in this
 * codebase verifies a signature before trusting the payload; this one
 * cannot yet, and must not be treated as production-ready until that's
 * fixed. Do not point a real Bosta webhook at this route before then.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as {
      deliveryId: string;
      businessReference?: string;
      state?: string;
      codAmount?: number;
      codCollected?: boolean;
    };

    if (!payload.deliveryId) {
      return NextResponse.json({ error: 'Missing deliveryId' }, { status: 400 });
    }

    const { isDuplicate, ownerToken } = await checkIdempotency('bosta', payload.deliveryId);

    if (isDuplicate) {
      console.log(`Duplicate Bosta webhook ignored: ${payload.deliveryId}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
      const supabase = getSupabaseAdmin();
      const status = mapBostaState(payload.state);

      const { data: shipment, error } = await supabase
        .from('shipments')
        .update({
          status,
          cod_collected_at: payload.codCollected ? new Date().toISOString() : undefined,
        })
        .eq('provider_shipment_ref', payload.deliveryId)
        .select('order_id, orders(user_id)')
        .single();

      if (error || !shipment) {
        console.error('Shipment not found for Bosta delivery:', payload.deliveryId, error);
        throw new Error('Shipment not found');
      }

      if (status === 'delivered' || status === 'returned') {
        await supabase.from('orders_audit').insert({
          order_id: shipment.order_id,
          user_id: (shipment.orders as unknown as { user_id: string }).user_id,
          action: status === 'delivered' ? 'shipped' : 'cancelled',
          metadata: JSON.stringify({
            fulfillment_provider: 'bosta',
            provider_shipment_ref: payload.deliveryId,
            status,
          }),
        });
      }
    } catch (handlerError) {
      await releaseIdempotencyKey('bosta', payload.deliveryId, ownerToken);
      throw handlerError;
    }

    await markWebhookProcessed('bosta', payload.deliveryId, {
      success: true,
      message: 'Processed Bosta delivery status update',
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Bosta webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapBostaState(bostaState: unknown): ShipmentStatus {
  const state = String(bostaState || '').toLowerCase();
  if (state.includes('deliver')) return 'delivered';
  if (state.includes('transit') || state.includes('picked')) return 'in_transit';
  if (state.includes('out for delivery')) return 'out_for_delivery';
  if (state.includes('return')) return 'returned';
  if (state.includes('cancel')) return 'cancelled';
  if (state.includes('fail')) return 'failed_delivery';
  return 'created';
}
