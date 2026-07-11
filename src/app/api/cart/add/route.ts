import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/db';
import { userCache } from '@/lib/cache';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity } = await request.json();

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Product ID and valid quantity are required' },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check product exists and has inventory
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, price, inventory')
      .eq('id', productId)
      .single() as any;

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if ((product as any).inventory < quantity) {
      return NextResponse.json(
        { error: 'Insufficient inventory' },
        { status: 400 }
      );
    }

    // Get or create cart
    let { data: cart } = await supabaseAdmin
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .single() as any;

    const items = (cart as any)?.items || [];
    const existingItem = items.find((item: any) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      items.push({
        productId,
        quantity,
        price: product.price,
      });
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    const cartData = {
      user_id: user.id,
      items,
      subtotal,
      tax: subtotal * 0.1,
      total: subtotal + subtotal * 0.1,
    };

    if (cart) {
      await (supabaseAdmin as any)
        .from('carts')
        .update(cartData)
        .eq('id', (cart as any).id);
    } else {
      await (supabaseAdmin as any).from('carts').insert(cartData);
    }

    // Invalidate cache
    await userCache.delete(user.id);

    return NextResponse.json({
      message: 'Item added to cart',
      cart: cartData,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
