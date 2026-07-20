import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabase, getSupabaseAdmin } from '@/lib/db';
import { getCached } from '@/lib/cache';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { StripeNotConfiguredError } from '@/lib/stripe/client';
import { checkInventory } from '@/lib/inventory/manager';
import * as Sentry from '@sentry/nextjs';
import { v4 as uuidv4 } from 'uuid';
import type { OrderLineItem } from '@/lib/stripe/types';

export async function POST(request: NextRequest) {
  try {
    // Request-scoped Supabase client, hydrated from the incoming request's
    // auth cookies (mirrors src/app/api/auth/me/route.ts). getSupabase() with
    // no session context has no way to authenticate the caller.
    const supabase = getSupabase({
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const supabaseAdmin = getSupabaseAdmin();

    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } catch (sessionError) {
        console.error('Failed to restore session from cookies');
      }
    }

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

    // Derive the idempotency key from the user + cart contents (not a
    // freshly generated id) so that retries/double-clicks of the same
    // logical checkout attempt collide instead of creating duplicate
    // orders/order_items and duplicate Stripe sessions.
    const cartFingerprint = createHash('sha256')
      .update(
        JSON.stringify(
          [...cartData.items]
            .map((item) => ({ productId: item.productId, quantity: item.quantity }))
            .sort((a, b) => a.productId.localeCompare(b.productId))
        )
      )
      .digest('hex');
    const idempotencyKey = `${user.id}-${cartFingerprint}`;

    // Look up a still-pending order from a prior attempt with the same
    // idempotency key and reuse it instead of minting a new one. This is
    // what makes the flow retry-safe: a double-click or client timeout that
    // already created the order (and possibly a Stripe session) won't leave
    // behind an orphaned duplicate.
    const { data: existingOrder, error: existingOrderLookupError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('checkout_idempotency_key', idempotencyKey)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingOrderLookupError) {
      Sentry.captureException(existingOrderLookupError);
    }

    const orderId = existingOrder?.id ?? uuidv4();

    if (!existingOrder) {
      // Create order record in database (status: pending). Uses the
      // user-scoped client -- RLS policy "Users can insert their own orders"
      // (migration 016) enforces user_id = auth.uid() at the DB layer, on
      // top of the server-side validation already done above.
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: user.id,
          order_number: `ORD-${Date.now()}`,
          subtotal: cartData.subtotal,
          tax: cartData.tax,
          shipping: cartData.shipping,
          total: cartData.total,
          status: 'pending',
          payment_status: 'pending',
          checkout_idempotency_key: idempotencyKey,
        });

      if (orderError) {
        Sentry.captureException(orderError);
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        );
      }

      // Insert order items. Uses the admin client -- migration 016
      // intentionally has no user-facing INSERT policy for order_items
      // (client-controlled price/quantity would bypass the server-side
      // validation already performed above), so order_items writes stay on
      // the service-role path.
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
    }

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let session;
    try {
      session = await createCheckoutSession({
        cart: cartData,
        successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/checkout/cancel`,
        userId: user.id,
        customerEmail: user.email || undefined,
        idempotencyKey,
        orderId,
      });
    } catch (sessionCreationError) {
      // Don't leave an orphaned pending order behind if session creation
      // fails -- only clean up when we created it in this call, not when we
      // reused an order left over from a prior attempt.
      if (!existingOrder) {
        await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
      }
      throw sessionCreationError;
    }

    // Only persist the Stripe session ID here. `session.payment_intent` is
    // not reliably populated at session-creation time -- the PaymentIntent
    // is finalized once the customer actually pays. Persisting a null/stale
    // payment_intent_id now would let a later webhook-driven update race
    // against this one. `stripe_payment_intent_id` is populated by the
    // webhook handlers instead (see src/app/api/webhooks/stripe/route.ts).
    // Uses the admin client -- migration 016 intentionally has no
    // user-facing UPDATE policy for orders (an ownership-only clause would
    // let a client PATCH payment/status fields via Supabase REST).
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        stripe_session_id: session.id,
      })
      .eq('id', orderId);

    if (updateError) {
      Sentry.captureException(updateError);
      if (!existingOrder) {
        await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
      }
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
    if (error instanceof StripeNotConfiguredError) {
      // Stripe is intentionally unconfigured (not accessible in Egypt --
      // see src/lib/stripe/client.ts). Not an application error.
      return NextResponse.json(
        { error: 'Payment processing is not currently available' },
        { status: 503 }
      );
    }
    Sentry.captureException(error);
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
