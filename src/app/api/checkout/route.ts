import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getSupabaseAdmin } from '@/lib/db';
import { getCached } from '@/lib/cache';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { checkInventory } from '@/lib/inventory/manager';
import * as Sentry from '@sentry/nextjs';
import { v4 as uuidv4 } from 'uuid';
import type { OrderLineItem } from '@/lib/stripe/types';

/**
 * POST /api/checkout
 * Create Stripe checkout session for authenticated user
 *
 * Validates cart, checks inventory, persists pending order, creates payment session.
 * Returns Stripe session ID and payment URL for client redirect.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = getSupabase();
    const supabaseAdmin = getSupabaseAdmin();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cart from cache
    const cartCacheKey = `cart:${user.id}`;
    const cartData = await getCached<{
      items: Array<{ productId: string; quantity: number; price: number }>;
      subtotal: number;
      tax: number;
      shipping: number;
      total: number;
    }>(cartCacheKey);

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Convert cart items to order line items
    const lineItems: OrderLineItem[] = cartData.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    // Check inventory availability
    const inventoryCheck = await checkInventory(lineItems);
    if (!inventoryCheck.available) {
      return NextResponse.json(
        { error: 'Insufficient inventory' },
        { status: 400 }
      );
    }

    // Create order record in database (status: pending)
    const orderId = uuidv4();
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        user_id: user.id,
        order_number: `ORD-${Date.now()}`,
        subtotal: cartData.subtotal,
        tax: cartData.tax,
        shipping: cartData.total - cartData.subtotal - cartData.tax,
        total: cartData.total,
        status: 'pending',
        payment_status: 'pending',
      });

    if (orderError) {
      Sentry.captureException(orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Insert order items
    const orderItemsPayload = lineItems.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      Sentry.captureException(itemsError);
      // Clean up order if items insert fails
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      return NextResponse.json(
        { error: 'Failed to add order items' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const idempotencyKey = `${user.id}-${orderId}`;

    const session = await createCheckoutSession({
      cart: cartData,
      successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/checkout/cancel`,
      customerId: user.email || undefined,
      idempotencyKey,
    });

    // Update order with Stripe session ID
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string | undefined,
      })
      .eq('id', orderId);

    if (updateError) {
      Sentry.captureException(updateError);
      return NextResponse.json(
        { error: 'Failed to link Stripe session' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabaseAdmin.from('orders_audit').insert({
      order_id: orderId,
      user_id: user.id,
      action: 'created',
      new_state: JSON.stringify({
        status: 'pending',
        payment_status: 'pending',
        stripe_session_id: session.id,
        total: cartData.total,
      }),
    });

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      orderId,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
