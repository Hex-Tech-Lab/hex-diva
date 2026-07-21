import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 * List products with filtering and pagination (Shopify API-aligned response format)
 * Shopify reference: https://shopify.dev/docs/api/admin-graphql/2026-01/queries/products
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - category: string (filter by category)
 * - search: string (search in title/description)
 * - minPrice: number (minimum price in store currency)
 * - maxPrice: number (maximum price in store currency)
 * - status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' (default: ACTIVE)
 * - sort: string (sortBy field, default: 'created_at')
 * - order: 'asc' | 'desc' (default: 'desc')
 * - tier: 'b2c' | 'bronze' | 'silver' | 'gold' (for B2B pricing)
 *
 * Response format: Shopify Product/ProductVariant field names (100% aligned)
 * - title (Shopify: Product.title)
 * - handle (Shopify: Product.handle)
 * - description (Shopify: Product.description)
 * - price (Shopify: ProductVariant.price, in store currency)
 * - currencyCode (Shopify: Money.currencyCode, default: EGP)
 * - featured_image (Shopify: Product.featuredImage.url)
 * - images (Shopify: Product.images[])
 * - total_inventory (Shopify: Product.totalInventory)
 * - available_for_sale (Shopify: ProductVariant.availableForSale)
 * - vendor (Shopify: Product.vendor)
 * - status (Shopify: Product.status)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search');
    const tier = searchParams.get('tier') || 'b2c';
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;

    const offset = (page - 1) * limit;

    const supabase = getSupabase();

    // Build query with Shopify API-aligned field names
    let query = supabase
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
        review_count,
        created_at,
        updated_at
        `,
        { count: 'exact' }
      );

    // Apply filters (Shopify API naming)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (minPrice !== null) {
      query = query.gte('price', minPrice);
    }

    if (maxPrice !== null) {
      query = query.lte('price', maxPrice);
    }

    // Filter by status (Shopify Product.status)
    const statusFilter = searchParams.get('status') || 'ACTIVE';
    if (statusFilter && ['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error.message },
        { status: 500 }
      );
    }

    // Apply B2B tier pricing override; otherwise return the row as-is
    // (already shaped to the Shopify-aligned field names selected above).
    const formattedData = data.map((product) => {
      let price = product.price;

      if (tier === 'bronze') {
        price = product.b2b_bronze_price ?? product.price;
      } else if (tier === 'silver') {
        price = product.b2b_silver_price ?? product.price;
      } else if (tier === 'gold') {
        price = product.b2b_gold_price ?? product.price;
      }

      return {
        ...product,
        price,
        tags: product.tags || [],
        rating: product.rating || 0,
        review_count: product.review_count || 0,
      };
    });

    const response = {
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
