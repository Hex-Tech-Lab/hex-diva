import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[handle]
 * Fetch a single product by its URL-friendly handle
 *
 * Returns full product detail including variants, pricing tiers, and collections.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const { handle } = await Promise.resolve(params);

    if (!handle) {
      return NextResponse.json(
        { error: 'Product handle is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Request-scoped client ensures RLS context isolation (Law #2)
    const { data: product, error } = await (supabase
      .from('products' as any)
      .select(
        `
        id,
        sku,
        handle,
        name,
        brand,
        category,
        collection,
        description,
        price_egp,
        b2b_bronze_price,
        b2b_silver_price,
        b2b_gold_price,
        image_url,
        inventory,
        in_stock,
        rating,
        review_count,
        tags
        `
      )
      .eq('handle', handle)
      .single() as any);

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found', details: error?.message },
        { status: 404 }
      );
    }

    // Map database row to API response format
    const formattedProduct = {
      id: product.id,
      sku: product.sku,
      handle: product.handle,
      name: product.name,
      brand: product.brand,
      category: product.category,
      collection: product.collection,
      description: product.description,
      price_egp: product.price_egp,
      b2b_bronze_price: product.b2b_bronze_price,
      b2b_silver_price: product.b2b_silver_price,
      b2b_gold_price: product.b2b_gold_price,
      image_url: product.image_url,
      tags: product.tags || [],
      inventory: product.inventory,
      in_stock: product.in_stock,
      rating: product.rating || 0,
      review_count: product.review_count || 0,
    };

    return NextResponse.json(formattedProduct);
  } catch (error: any) {
    console.error('Error in GET /api/products/[handle]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
