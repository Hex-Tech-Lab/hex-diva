import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
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

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Token refreshed successfully',
      session: data.session,
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
