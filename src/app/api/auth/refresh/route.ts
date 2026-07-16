import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

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
      const errorResponse = NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      );
      clearAuthCookies(errorResponse.cookies);
      return errorResponse;
    }

    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      session: {
        access_token: data.session.access_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: 'Bearer',
      },
    });

    // Update session cookies
    setAuthCookies(
      response.cookies,
      data.session.access_token,
      data.session.refresh_token,
      data.session.expires_in
    );

    return response;
  } catch (error) {
    Sentry.captureException(error);
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
