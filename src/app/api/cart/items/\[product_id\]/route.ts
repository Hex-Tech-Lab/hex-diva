import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  session_id: z.string().optional(),
});

/**
 * PATCH /api/cart/items/[product_id]
 * Update quantity of an item in the cart
 *
 * quantity = 0 removes the item
 * quantity > 0 updates the quantity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { product_id: string } }
) {
  try {
    const { product_id } = await Promise.resolve(params);
    const body = await request.json();
    const payload = UpdateCartItemSchema.parse(body);

    const supabase = getSupabase();

    // Get session ID
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionId = payload.session_id || extractSessionId(cookieHeader);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Fetch cart
    const { data: cart } = await (supabase
      .from('carts' as any)
      .select('*')
      .eq('session_id', sessionId)
      .single() as any);

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Parse items
    let items = Array.isArray(cart.items) ? cart.items : [];

    // Find and update item
    const itemIndex = items.findIndex((item: any) => item.product_id === product_id);

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found in cart' },
        { status: 404 }
      );
    }

    if (payload.quantity === 0) {
      // Remove item
      items = items.filter((_: any, idx: number) => idx !== itemIndex);
    } else {
      // Update quantity
      items[itemIndex].quantity = payload.quantity;
    }

    // Recalculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (item.price_at_purchase * item.quantity),
      0
    );
    const shipping = subtotal > 50 ? 0 : 10;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    // Update cart
    const { data: updatedCart, error } = await (supabase
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

    if (error) {
      console.error('Error updating cart item:', error);
      return NextResponse.json(
        { error: 'Failed to update cart' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedCart);
  } catch (error: any) {
    console.error('Error in PATCH /api/cart/items/[product_id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart/items/[product_id]
 * Remove an item from the cart
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { product_id: string } }
) {
  try {
    const { product_id } = await Promise.resolve(params);

    const supabase = getSupabase();

    // Get session ID
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionId = extractSessionId(cookieHeader);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Fetch cart
    const { data: cart } = await (supabase
      .from('carts' as any)
      .select('*')
      .eq('session_id', sessionId)
      .single() as any);

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Remove item
    let items = Array.isArray(cart.items) ? cart.items : [];
    items = items.filter((item: any) => item.product_id !== product_id);

    // Recalculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (item.price_at_purchase * item.quantity),
      0
    );
    const shipping = subtotal > 50 ? 0 : 10;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    // Update cart
    const { data: updatedCart, error } = await (supabase
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

    if (error) {
      console.error('Error deleting cart item:', error);
      return NextResponse.json(
        { error: 'Failed to remove item' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedCart);
  } catch (error: any) {
    console.error('Error in DELETE /api/cart/items/[product_id]:', error);
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
