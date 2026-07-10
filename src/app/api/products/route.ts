import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 * List products with filtering and pagination
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - category: string (filter by category)
 * - search: string (search in name/description)
 * - minPrice: number (minimum price)
 * - maxPrice: number (maximum price)
 * - inStock: boolean (only in-stock products)
 * - sort: string (sortBy field, default: 'created_at')
 * - order: 'asc' | 'desc' (default: 'desc')
 * - tier: 'b2c' | 'bronze' | 'silver' | 'gold' (for B2B pricing)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const tier = searchParams.get('tier') || 'b2c';
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const inStock = searchParams.get('inStock') === 'true';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('products')
      .select(
        `
        id,
        name,
        description,
        price,
        b2b_bronze_price,
        b2b_silver_price,
        b2b_gold_price,
        image_url,
        category,
        inventory,
        in_stock,
        tags,
        trending_on_tiktok,
        viral_score,
        rating,
        review_count,
        product_collections (
          collection:collections (
            id,
            title,
            handle
          )
        )
        `,
        { count: 'exact' }
      );

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (minPrice !== null) {
      query = query.gte('price', minPrice);
    }

    if (maxPrice !== null) {
      query = query.lte('price', maxPrice);
    }

    if (inStock) {
      query = query.eq('in_stock', true);
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

    // Format response with appropriate pricing tier
    const formattedData = data.map((product: any) => {
      let displayPrice = product.price;

      if (tier === 'bronze') {
        displayPrice = product.b2b_bronze_price || product.price;
      } else if (tier === 'silver') {
        displayPrice = product.b2b_silver_price || product.price;
      } else if (tier === 'gold') {
        displayPrice = product.b2b_gold_price || product.price;
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: displayPrice,
        originalPrice: product.price,
        image: product.image_url,
        category: product.category,
        inStock: product.in_stock && product.inventory > 0,
        inventory: product.inventory,
        tags: product.tags || [],
        rating: product.rating || 0,
        reviewCount: product.review_count || 0,
        trending: product.trending_on_tiktok || (product.viral_score || 0) > 7,
        viralScore: product.viral_score || 0,
        collections: product.product_collections?.map((pc: any) => ({
          id: pc.collection.id,
          title: pc.collection.title,
          handle: pc.collection.handle,
        })) || [],
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
