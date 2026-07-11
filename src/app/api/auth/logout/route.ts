import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function POST(_request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ message: 'Logout successful' });

    // Clear session cookies
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

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
