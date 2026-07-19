import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getSupabaseAdmin } from '@/lib/db';
import { decrementInventory, restoreInventory } from '@/lib/inventory/manager';
import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

  // Get order items for inventory restoration
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (orderItems) {
    // Restore inventory
    await restoreInventory(orderItems);
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
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

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
