import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { redis, isCacheAvailable } from '@/lib/cache';

export async function GET(_request: NextRequest) {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        api: 'ok',
        database: 'checking',
        cache: 'checking',
      },
    };

    // Check database
    try {
      const { error } = await supabase.from('users').select('count').limit(1);
      checks.services.database = error ? 'error' : 'ok';
    } catch (error) {
      checks.services.database = 'error';
    }

    // Check cache
    if (isCacheAvailable()) {
      try {
        await redis?.ping();
        checks.services.cache = 'ok';
      } catch (error) {
        checks.services.cache = 'error';
      }
    } else {
      checks.services.cache = 'unavailable';
    }

    // Overall status
    const hasErrors =
      checks.services.database === 'error' ||
      (checks.services.cache === 'error' && isCacheAvailable());

    if (hasErrors) {
      checks.status = 'degraded';
    }

    return NextResponse.json(checks, {
      status: checks.status === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
