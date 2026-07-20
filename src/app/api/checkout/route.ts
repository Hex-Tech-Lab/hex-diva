import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getSupabaseAdmin } from '@/lib/db';
import { getCached } from '@/lib/cache';
import { createPayTabsCheckoutSession } from '@/lib/paytabs/checkout';
import { PayTabsNotConfiguredError } from '@/lib/paytabs/client';
import { checkInventory } from '@/lib/inventory/manager';
import * as Sentry from '@sentry/nextjs';
import { v4 as uuidv4 } from 'uuid';
import type { OrderLineItem } from '@/lib/stripe/types';

/**
 * POST /api/checkout
 * Create a PayTabs Hosted Payment Page session for the authenticated user.
 *
 * PayTabs is the active/primary payment provider (see
 * src/lib/paytabs/client.ts and docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md
 * for why Stripe/MoR don't fit this business). Stripe's integration
 * remains in the codebase but dormant/unused -- see src/lib/stripe/.
 *
 * Validates cart, checks inventory, persists pending order, creates
 * payment session. Returns the PayTabs redirect URL for client redirect.
 */
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

    // Create order record in database (status: pending). Uses the
    // user-scoped client -- RLS policy "Users can insert their own orders"
    // (migration 016) enforces user_id = auth.uid() at the DB layer, on
    // top of the server-side validation already done above.
    const orderId = uuidv4();
    const { error: orderError } = await supabase
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

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      Sentry.captureException(itemsError);
      // Clean up order if items insert fails
      await supabase.from('orders').delete().eq('id', orderId);
      return NextResponse.json(
        { error: 'Failed to add order items' },
        { status: 500 }
      );
    }

    // Look up the user's default shipping address for PayTabs' required
    // customer_details. Not fatal if missing -- PayTabs' hosted payment
    // page prompts the customer for any missing/invalid billing details
    // itself, so a first-time buyer with no saved address still works.
    const { data: address } = await supabase
      .from('addresses')
      .select('full_name, email, phone, street, city, state, postal_code, country')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await createPayTabsCheckoutSession({
      orderId,
      cartAmount: cartData.total,
      cartCurrency: 'EGP',
      cartDescription: `Order ${orderId} (${lineItems.length} item${lineItems.length === 1 ? '' : 's'})`,
      customer: {
        name: address?.full_name || user.email || 'Customer',
        email: address?.email || user.email || '',
        phone: address?.phone || '',
        street1: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        country: address?.country || 'EG',
        zip: address?.postal_code,
      },
      returnUrl: `${appUrl}/checkout/success?order_id=${orderId}`,
      callbackUrl: `${appUrl}/api/webhooks/paytabs`,
    });

    // Persist the provider reference so the webhook can find this order by
    // cart_id (which we set to orderId) -- provider_transaction_ref is set
    // here for visibility even before the webhook confirms payment.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_provider: 'paytabs',
        provider_transaction_ref: session.tran_ref,
      })
      .eq('id', orderId);

    if (updateError) {
      Sentry.captureException(updateError);
      return NextResponse.json(
        { error: 'Failed to link payment session' },
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
        payment_provider: 'paytabs',
        provider_transaction_ref: session.tran_ref,
        total: cartData.total,
      }),
    });

    return NextResponse.json({
      redirectUrl: session.redirect_url,
      orderId,
    });
  } catch (error) {
    if (error instanceof PayTabsNotConfiguredError) {
      // PayTabs credentials not yet provisioned. Not an application error.
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
