import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { setAuthCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Login failed - no session created' },
        { status: 500 }
      );
    }

    // Set session cookies for persistence across requests
    const response = NextResponse.json({
      message: 'Login successful',
      session: {
        access_token: data.session.access_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    // Set httpOnly cookies for secure session persistence
    setAuthCookies(
      response.cookies,
      data.session.access_token,
      data.session.refresh_token,
      data.session.expires_in
    );

    return response;
  } catch (error) {
    Sentry.captureException(error);
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
