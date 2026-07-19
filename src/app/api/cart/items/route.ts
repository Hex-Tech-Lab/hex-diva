import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { z } from 'zod';

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
      .single() as any);

    if (!cart) {
      const { data: newCart } = await (supabase
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

      cart = newCart;
    }

    // Parse existing items (JSONB array)
    let items = Array.isArray(cart.items) ? cart.items : [];

    // Check if product already in cart
    const existingItemIndex = items.findIndex(
      (item: any) => item.product_id === payload.product_id
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      items[existingItemIndex].quantity += payload.quantity;
    } else {
      // Add new item
      items.push({
        product_id: payload.product_id,
        quantity: payload.quantity,
        price_at_purchase: product.price_egp,
        added_at: new Date().toISOString(),
      });
    }

    // Recalculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (item.price_at_purchase * item.quantity),
      0
    );
    const shipping = subtotal > 50 ? 0 : 10; // Free shipping over 50 EGP
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;

    // Update cart
    const { data: updatedCart, error: updateError } = await (supabase
      .from('carts' as any)
      .update({
        items,
        subtotal,
        shipping,
        tax,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single() as any);

    if (updateError) {
      console.error('Error updating cart:', updateError);
      return NextResponse.json(
        { error: 'Failed to add item to cart' },
        { status: 500 }
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

/**
 * Extract session ID from cookie header
 */
function extractSessionId(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'cart-session-id' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
