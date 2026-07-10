import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    // Validate input
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password validation (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 400 }
      );
    }

    // Create user profile
    if (data.user) {
      try {
        await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            preferences: {},
          });
      } catch (profileError) {
        Sentry.captureException(profileError);
        console.error('Error creating user profile:', profileError);
        // Continue anyway - user is created even if profile creation fails
      }
    }

    return NextResponse.json({
      message: 'Sign up successful. Please check your email to confirm.',
      user: data.user,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
