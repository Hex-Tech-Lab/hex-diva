import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[handle]
 * Fetch a single product by its URL-friendly handle (Shopify-aligned)
 *
 * Returns full product detail including variants, pricing tiers, inventory, and collections.
 * Uses Shopify Product/ProductVariant field names for 100% API alignment.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    if (!handle) {
      return NextResponse.json(
        { error: 'Product handle is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Request-scoped client ensures RLS context isolation (Law #2)
    const { data: product, error } = await supabase
      .from('products')
      .select(
        `
        id,
        handle,
        title,
        description,
        sku,
        barcode,
        category,
        tags,
        vendor,
        status,
        price,
        currency_code,
        compare_at_price,
        b2b_bronze_price,
        b2b_silver_price,
        b2b_gold_price,
        featured_image_url,
        images,
        total_inventory,
        available_for_sale,
        rating,
        review_count
        `
      )
      .eq('handle', handle)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found', details: error?.message },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error in GET /api/products/[handle]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
