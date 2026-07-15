import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    let refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body.refreshToken;
      } catch {
        // Ignore JSON parsing errors if cookie was expected
      }
    }

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
      errorResponse.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
      errorResponse.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 });
      return errorResponse;
    }

    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: 'Bearer',
      },
    });

    // Update access token cookie with explicit path
    response.cookies.set({
      name: 'sb-access-token',
      value: data.session.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.session.expires_in,
    });

    // Update refresh token cookie if provided with explicit path
    if (data.session.refresh_token) {
      response.cookies.set({
        name: 'sb-refresh-token',
        value: data.session.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

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
