import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { referralCache } from '@/lib/cache';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check cache
    const cached = await referralCache.getCommissions(user.id);
    if (cached) {
      return NextResponse.json({
        data: cached,
        cached: true,
      });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('commissions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const pageData = {
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    };

    // Cache results
    await referralCache.setCommissions(user.id, pageData);

    return NextResponse.json({
      ...pageData,
      cached: false,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Commissions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
