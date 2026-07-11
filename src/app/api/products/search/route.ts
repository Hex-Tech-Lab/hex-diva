import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { searchCache } from '@/lib/cache';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 20 } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const safeLimit = Math.min(limit, 100);
    const searchQuery = query.toLowerCase();

    // Check cache first
    const cached = await searchCache.getResults(searchQuery);
    if (cached) {
      return NextResponse.json({
        data: cached,
        cached: true,
      });
    }

    // Full-text search with name and description
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      .limit(safeLimit);

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Cache results
    await searchCache.setResults(searchQuery, data || []);

    return NextResponse.json({
      data,
      cached: false,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
