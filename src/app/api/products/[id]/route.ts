import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import type {
  ProductRecord,
  ProductCollectionRecord,
} from '@/types/database.types';
import { getCachedProduct, setCachedProduct } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]
 * Get product details with variants and related products
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    // Check cache first
    const cached = await getCachedProduct(productId);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single<ProductRecord>();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId);

    // Fetch collections
    const { data: productCollections } = await supabase
      .from('product_collections')
      .select('collection_id')
      .eq('product_id', productId);

    const collectionIds = productCollections?.map((pc: ProductCollectionRecord) => pc.collection_id) || [];

    // Fetch related products (same collection, different product)
    interface RelatedProduct { id: string; title: string; price: number; image_url: string | null }
    let relatedProducts: RelatedProduct[] = [];
    if (collectionIds.length > 0) {
      const { data: related } = await supabase
        .from('product_collections')
        .select('product_id')
        .in('collection_id', collectionIds)
        .neq('product_id', productId)
        .limit(4);

      if (related) {
        const relatedIds = related.map((r: ProductCollectionRecord) => r.product_id);
        const { data: relatedProds } = await supabase
          .from('products')
          .select('id, title, price, image_url')
          .in('id', relatedIds);
        relatedProducts = (relatedProds as RelatedProduct[]) || [];
      }
    }

    const response = {
      product: {
        ...product,
        variants: variants || [],
        relatedProducts,
      },
    };

    // Cache for 1 hour
    await setCachedProduct(productId, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
