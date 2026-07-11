import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      if (!error && !data.session) {
        Sentry.captureException(new Error('Token refresh: no error but no session'));
      }
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Token refreshed successfully',
      session: {
        access_token: data.session.access_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: 'Bearer',
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
