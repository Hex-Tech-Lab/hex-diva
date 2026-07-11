import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/db';
import { userCache } from '@/lib/cache';
import * as Sentry from '@sentry/nextjs';
import type { ProductRecord } from '@/types/database.types';

interface CartItem {
  productId: string
  quantity: number
  price: number
}

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
      .select('id, price, inventory_quantity')
      .eq('id', productId)
      .single<ProductRecord>();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.inventory_quantity < quantity) {
      return NextResponse.json(
        { error: 'Insufficient inventory' },
        { status: 400 }
      );
    }

    // Get or create cart (session-based or stored in cache)
    const cartCacheKey = `cart:${user.id}`;
    let cartData = await userCache.get(cartCacheKey) as {
      items: CartItem[]
      subtotal: number
      tax: number
      total: number
    } | null;

    if (!cartData) {
      cartData = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      };
    }

    const items = cartData.items || [];
    const existingItem = items.find((item: CartItem) => item.productId === productId);

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
      (sum: number, item: CartItem) => sum + item.price * item.quantity,
      0
    );

    cartData = {
      items,
      subtotal,
      tax: subtotal * 0.1,
      total: subtotal + subtotal * 0.1,
    };

    // Cache cart
    await userCache.set(cartCacheKey, cartData, 86400); // 24 hour TTL

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
