import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { verifyPayTabsSignature } from '@/lib/paytabs/webhook';
import { PayTabsNotConfiguredError } from '@/lib/paytabs/client';
import { decrementInventory, restoreInventory } from '@/lib/inventory/manager';
import { checkIdempotency, markWebhookProcessed, releaseIdempotencyKey } from '@/lib/webhooks/idempotencyManager';
import * as Sentry from '@sentry/nextjs';
import type { PayTabsWebhookPayload } from '@/lib/paytabs/types';

/**
 * PayTabs IPN response_status codes: A=Authorized/success, D=Declined,
 * E=Error, P=Pending (e.g. cash-based methods awaiting settlement),
 * V=Voided.
 */
async function handlePaymentSucceeded(payload: PayTabsWebhookPayload): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', payload.cart_id)
    .single();

  if (orderError || !order) {
    console.error('Order not found for PayTabs cart_id:', payload.cart_id);
    throw new Error('Order not found');
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (itemsError || !orderItems) {
    console.error('Order items not found:', order.id);
    throw new Error('Order items not found');
  }

  const inventoryDecrementSuccess = await decrementInventory(orderItems);

  if (!inventoryDecrementSuccess) {
    await supabase
      .from('orders')
      .update({ status: 'pending', payment_status: 'failed' })
      .eq('id', order.id);
    throw new Error('Failed to decrement inventory');
  }

  await supabase
    .from('orders')
    .update({
      status: 'processing',
      payment_status: 'succeeded',
      provider_transaction_ref: payload.tran_ref,
      tracked_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  await supabase.from('orders_audit').insert({
    order_id: order.id,
    user_id: order.user_id,
    action: 'payment_succeeded',
    previous_state: JSON.stringify({ status: 'pending', payment_status: 'pending' }),
    new_state: JSON.stringify({ status: 'processing', payment_status: 'succeeded' }),
    metadata: JSON.stringify({
      payment_provider: 'paytabs',
      tran_ref: payload.tran_ref,
      amount: payload.cart_amount,
    }),
  });
}

async function handlePaymentFailed(payload: PayTabsWebhookPayload): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', payload.cart_id)
    .single();

  if (!order) {
    return;
  }

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (orderItems && order.payment_status === 'succeeded') {
    // Only restore inventory if it was previously decremented (a genuine
    // reversal, e.g. Voided after Authorized) -- not on a first Declined.
    await restoreInventory(orderItems);
  }

  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'failed',
      provider_transaction_ref: payload.tran_ref,
    })
    .eq('id', order.id);

  await supabase.from('orders_audit').insert({
    order_id: order.id,
    user_id: order.user_id,
    action: 'payment_failed',
    metadata: JSON.stringify({
      payment_provider: 'paytabs',
      tran_ref: payload.tran_ref,
      response_code: payload.payment_result?.response_code,
      response_message: payload.payment_result?.response_message,
    }),
  });

  console.error('PayTabs payment failed for order:', order.id, payload.payment_result?.response_message);
}

/**
 * POST /api/webhooks/paytabs
 * Handle PayTabs IPN (Instant Payment Notification) callbacks.
 *
 * Verifies HMAC-SHA256 signature, then routes on payment_result.response_status.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('signature');

    let payload: PayTabsWebhookPayload;
    try {
      const isValid = verifyPayTabsSignature(rawBody, signature);
      if (!isValid) {
        console.error('PayTabs webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      payload = JSON.parse(rawBody) as PayTabsWebhookPayload;
    } catch (err) {
      if (err instanceof PayTabsNotConfiguredError) {
        // PayTabs never sends webhooks to an endpoint it doesn't know
        // about, so this only fires if something hits the route directly.
        return NextResponse.json(
          { error: 'Payment processing is not currently available' },
          { status: 503 }
        );
      }
      throw err;
    }

    // Idempotency gate: PayTabs (like Stripe) may redeliver IPNs, and with
    // no dedup here a redelivered success notification would call
    // decrementInventory a second time for the same order. tran_ref is
    // PayTabs' stable per-transaction reference, constant across retries.
    const { isDuplicate, ownerToken } = await checkIdempotency('paytabs', payload.tran_ref);

    if (isDuplicate) {
      console.log(`Duplicate PayTabs webhook ignored: ${payload.tran_ref}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    const status = payload.payment_result?.response_status;

    try {
      if (status === 'A') {
        await handlePaymentSucceeded(payload);
      } else if (status === 'D' || status === 'E' || status === 'V') {
        await handlePaymentFailed(payload);
      } else {
        console.log(`Unhandled PayTabs response_status: ${status}`);
      }
    } catch (handlerError) {
      // Don't cache failed attempts -- release the reservation so a
      // PayTabs retry can reprocess this event.
      await releaseIdempotencyKey('paytabs', payload.tran_ref, ownerToken);
      throw handlerError;
    }

    await markWebhookProcessed('paytabs', payload.tran_ref, {
      success: true,
      message: `Processed response_status=${status}`,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.captureException(error);
    console.error('PayTabs webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
