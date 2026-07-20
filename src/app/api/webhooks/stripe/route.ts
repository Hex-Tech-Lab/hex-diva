import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getSupabaseAdmin } from '@/lib/db';
import { decrementInventory, restoreInventory } from '@/lib/inventory/manager';
import { checkIdempotency, markWebhookProcessed, releaseIdempotencyKey } from '@/lib/webhooks/idempotencyManager';
import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';

// STRIPE_WEBHOOK_SECRET is intentionally NOT checked at module load. Stripe
// is not accessible in Egypt (the primary market) and this integration is
// kept dormant/archived until Stripe or a replacement provider is usable
// there. A module-load throw here would crash the entire Next.js build the
// moment this file is imported, even though the route is never invoked
// without real Stripe webhook configuration on Stripe's side pointing at
// it. See src/lib/stripe/client.ts for the same lazy-init pattern.

/**
 * Handle payment_intent.created
 *
 * This is the earliest reliable point at which a PaymentIntent exists for an
 * order. Stripe creates the PaymentIntent as soon as a Checkout Session in
 * `mode: 'payment'` is created, and this event typically fires before the
 * customer has entered payment details -- i.e. before any
 * payment_intent.payment_failed could occur. We stamp `order_id` into the
 * PaymentIntent's metadata at session-creation time (see
 * src/lib/stripe/checkout.ts) specifically so this handler can look the
 * order up directly, without depending on checkout.session.completed (which
 * only fires on success and may arrive after a failure).
 */
async function handlePaymentIntentCreated(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) {
    console.warn('payment_intent.created missing order_id metadata:', paymentIntent.id);
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to link payment intent to order:', orderId, error);
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find order by Stripe session ID
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', session.id)
    .single();

  if (orderError || !order) {
    console.error('Order not found for session:', session.id);
    throw new Error('Order not found');
  }

  // Guard against double-processing: the event.id idempotency gate in POST()
  // only protects against Stripe redelivering the exact same event. It does
  // NOT protect against this handler running twice for the same order via a
  // different path -- e.g. the order update at the bottom of this function
  // fails after inventory has already been decremented, which releases the
  // idempotency key and lets Stripe's retry call decrementInventory a
  // second time. Once the order is no longer 'pending' its inventory has
  // already been accounted for, so treat re-delivery as a no-op success.
  if (order.status !== 'pending') {
    console.log(
      `Skipping inventory decrement for order ${order.id}: status is already '${order.status}'`
    );
    return;
  }

  // Belt-and-suspenders: ensure stripe_payment_intent_id is populated even
  // if the payment_intent.created event was missed/out of order. This is
  // now populated once payment succeeds, matching Stripe's guarantee that
  // session.payment_intent is set on checkout.session.completed.
  if (session.payment_intent && !order.stripe_payment_intent_id) {
    await supabase
      .from('orders')
      .update({
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id,
      })
      .eq('id', order.id);
  }

  // Get order items
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (itemsError || !orderItems) {
    console.error('Order items not found:', order.id);
    throw new Error('Order items not found');
  }

  // Decrement inventory
  const inventoryDecrementSuccess = await decrementInventory(orderItems);

  if (!inventoryDecrementSuccess) {
    // Restore order to pending if inventory decrement fails
    await supabase
      .from('orders')
      .update({
        status: 'pending',
        payment_status: 'failed',
      })
      .eq('id', order.id);

    throw new Error('Failed to decrement inventory');
  }

  // Update order status to completed
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'processing',
      payment_status: 'succeeded',
      tracked_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (updateError) {
    throw new Error('Failed to update order status');
  }

  // Log audit event
  await supabase.from('orders_audit').insert({
    order_id: order.id,
    user_id: order.user_id,
    action: 'payment_succeeded',
    previous_state: JSON.stringify({
      status: 'pending',
      payment_status: 'pending',
    }),
    new_state: JSON.stringify({
      status: 'processing',
      payment_status: 'succeeded',
    }),
    metadata: JSON.stringify({
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      amount: session.amount_total,
    }),
  });

  // TODO: Send confirmation email via SendGrid or Resend
  console.log('Order confirmed:', order.id, 'Payment Intent:', session.payment_intent);
}

async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', session.id)
    .single();

  if (!order) {
    return;
  }

  // Update order status to cancelled
  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'cancelled',
    })
    .eq('id', order.id);

  // Log audit event
  await supabase.from('orders_audit').insert({
    order_id: order.id,
    user_id: order.user_id,
    action: 'cancelled',
    new_state: JSON.stringify({
      status: 'cancelled',
      payment_status: 'cancelled',
    }),
  });
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find order by payment intent ID
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!order) {
    return;
  }

  // Only restore inventory when this order actually had stock decremented.
  // decrementInventory only ever runs from handleCheckoutSessionCompleted,
  // and only while the order was still 'pending' (see the status guard
  // there); once that succeeds the order moves to 'processing'. Restoring
  // based solely on order_items existing (as before) would incorrectly add
  // stock back for orders whose payment simply failed before ever reaching
  // checkout.session.completed -- inventory was never taken for those.
  // Checking status === 'processing' also makes this idempotent: after the
  // first failed-payment restoration the order moves to 'cancelled', so a
  // duplicate/retried payment_intent.payment_failed event for the same
  // order will see 'cancelled' and skip restoring a second time.
  if (order.status === 'processing') {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (orderItems) {
      await restoreInventory(orderItems);
    }
  } else {
    console.log(
      `Skipping inventory restore for order ${order.id}: status is '${order.status}' (inventory was never decremented or already restored)`
    );
  }

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'failed',
    })
    .eq('id', order.id);

  // Log audit event
  await supabase.from('orders_audit').insert({
    order_id: order.id,
    user_id: order.user_id,
    action: 'payment_failed',
    metadata: JSON.stringify({
      failure_reason: paymentIntent.last_payment_error?.message,
    }),
  });

  console.error('Payment failed for order:', order.id, paymentIntent.last_payment_error?.message);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      // Stripe is intentionally unconfigured (see comment above imports).
      // Stripe never sends webhooks to an endpoint it doesn't know about,
      // so this only fires if something hits the route directly -- respond
      // gracefully instead of crashing.
      return NextResponse.json(
        { error: 'Payment processing is not currently available' },
        { status: 503 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify Stripe webhook signature
    let event: Stripe.Event;
    try {
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Idempotency gate: Stripe redelivers webhooks on any non-2xx response
    // (and can occasionally deliver the same event twice regardless), and
    // with no dedup here a redelivered checkout.session.completed would
    // call decrementInventory a second time for the same order. event.id
    // is Stripe's own stable identifier for this exact event, guaranteed
    // constant across redeliveries.
    const { isDuplicate, ownerToken } = await checkIdempotency('stripe', event.id);

    if (isDuplicate) {
      console.log(`Duplicate Stripe webhook ignored: ${event.id} (${event.type})`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
      // Handle specific event types
      switch (event.type) {
        case 'payment_intent.created': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentCreated(paymentIntent);
          break;
        }

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.payment_status === 'paid') {
            await handleCheckoutSessionCompleted(session);
          }
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionExpired(session);
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentFailed(paymentIntent);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (handlerError) {
      // Do not cache failed attempts -- release the reservation so a
      // Stripe retry can reprocess this event instead of being treated as
      // a false-duplicate of a run that never actually succeeded.
      await releaseIdempotencyKey('stripe', event.id, ownerToken);
      throw handlerError;
    }

    await markWebhookProcessed('stripe', event.id, {
      success: true,
      message: `Processed ${event.type}`,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
