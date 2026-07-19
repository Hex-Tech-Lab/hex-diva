import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { z } from 'zod';
import { extractSessionId } from '@/lib/cart/session';
import { computeCartTotals } from '@/lib/cart/totals';

export const dynamic = 'force-dynamic';

const AddToCartSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  session_id: z.string().optional(),
});

/**
 * POST /api/cart/items
 * Add an item to the shopping cart
 *
 * Validates product exists, fetches current price, and updates cart.
 * Uses atomic operations to prevent race conditions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = AddToCartSchema.parse(body);

    const supabase = getSupabase();

    // Fetch product details to validate and get pricing
    const { data: product, error: productError } = await (supabase
      .from('products' as any)
      .select('id, sku, name, price_egp, image_url, inventory, in_stock')
      .eq('id', payload.product_id)
      .single() as any);

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check inventory
    if (!product.in_stock || product.inventory < payload.quantity) {
      return NextResponse.json(
        { error: 'Insufficient inventory', available: product.inventory },
        { status: 409 }
      );
    }

    // Get session ID from request or payload
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionId = payload.session_id || extractSessionId(cookieHeader);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Fetch or create cart
    let { data: cart } = await (supabase
      .from('carts' as any)
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle() as any);

    if (!cart) {
      const { data: newCart, error: createError } = await (supabase
        .from('carts' as any)
        .insert({
          session_id: sessionId,
          items: [],
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
        })
        .select()
        .single() as any);

      if (createError || !newCart) {
        console.error('Error creating cart:', createError);
        return NextResponse.json(
          { error: 'Failed to create cart' },
          { status: 500 }
        );
      }

      cart = newCart;
    }

    // Optimistic-concurrency read-modify-write loop: guard the update on the
    // `updated_at` value we just read so a concurrent writer can't clobber
    // our change. Retry a bounded number of times on conflict.
    const MAX_ATTEMPTS = 3;
    let updatedCart: any = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        // Re-read the latest cart state before retrying
        const { data: latestCart } = await (supabase
          .from('carts' as any)
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle() as any);

        if (!latestCart) {
          return NextResponse.json(
            { error: 'Cart not found' },
            { status: 404 }
          );
        }

        cart = latestCart;
      }

      const previousUpdatedAt = cart.updated_at;

      // Parse existing items (JSONB array)
      const items = Array.isArray(cart.items) ? [...cart.items] : [];

      // Check if product already in cart
      const existingItemIndex = items.findIndex(
        (item: any) => item.product_id === payload.product_id
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        items[existingItemIndex] = {
          ...items[existingItemIndex],
          quantity: items[existingItemIndex].quantity + payload.quantity,
        };
      } else {
        // Add new item
        items.push({
          product_id: payload.product_id,
          quantity: payload.quantity,
          price_at_purchase: product.price_egp,
          added_at: new Date().toISOString(),
        });
      }

      const { subtotal, shipping, tax, total } = computeCartTotals(items);

      // Update cart, guarded on the updated_at we read to detect concurrent writes
      let updateQuery = supabase
        .from('carts' as any)
        .update({
          items,
          subtotal,
          shipping,
          tax,
          total,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      updateQuery = previousUpdatedAt
        ? updateQuery.eq('updated_at', previousUpdatedAt)
        : updateQuery.is('updated_at', null);

      const { data: result, error: updateError } = await (updateQuery
        .select()
        .maybeSingle() as any);

      if (updateError) {
        console.error('Error updating cart:', updateError);
        return NextResponse.json(
          { error: 'Failed to add item to cart' },
          { status: 500 }
        );
      }

      if (result) {
        updatedCart = result;
        break;
      }

      // 0 rows affected: the cart changed between read and write. Loop and retry.
    }

    if (!updatedCart) {
      return NextResponse.json(
        { error: 'Conflict: cart was modified concurrently, please retry' },
        { status: 409 }
      );
    }

    return NextResponse.json(updatedCart);
  } catch (error: any) {
    console.error('Error in POST /api/cart/items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
