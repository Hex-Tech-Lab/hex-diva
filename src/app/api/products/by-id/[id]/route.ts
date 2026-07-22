import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/by-id/[id]
 * Fetch a single product by its UUID (used by the cart, which stores
 * product_id, not handle -- /api/products/[handle] is handle-keyed and
 * can't serve this lookup).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = getSupabase();

    const { data: product, error } = await supabase
      .from('products')
      .select('id, handle, title, featured_image_url')
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found', details: error?.message },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error in GET /api/products/by-id/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
