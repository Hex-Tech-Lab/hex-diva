import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Retrieve cookies to populate session state
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    // Call signOut with global scope to invalidate session in Supabase DB
    const { error } = await supabase.auth.signOut({ scope: 'global' });

    if (error) {
      Sentry.captureException(error);
      const errorResponse = NextResponse.json(
        { error: 'Logout failed' },
        { status: 400 }
      );
      errorResponse.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
      errorResponse.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 });
      return errorResponse;
    }

    const response = NextResponse.json({ message: 'Logout successful' });

    // Clear session cookies using explicit path
    response.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
    response.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 });

    return response;
  } catch (error) {
    Sentry.captureException(error);
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
