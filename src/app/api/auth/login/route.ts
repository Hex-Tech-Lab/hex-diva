import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

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

    // Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 401 }
      );
    }

    // Return session data
    return NextResponse.json({
      message: 'Login successful',
      session: data.session,
      user: data.user,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
