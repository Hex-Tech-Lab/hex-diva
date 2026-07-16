import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import type { UserProfileInsert } from '@/types/database.types';
import * as Sentry from '@sentry/nextjs';
import { setAuthCookies, getAppUrl } from '@/lib/auth';

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

    const supabase = getSupabase();

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (error) {
      if (error.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Signup failed. Please try again.' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Signup failed - user not created' },
        { status: 500 }
      );
    }

    // Attempt to create user profile (best effort - doesn't block signup)
    try {
      const profileData: UserProfileInsert = {
        user_id: data.user.id,
        tier: 'b2c',
        monthly_spend: 0,
        is_b2b: false,
        affiliate_tier: 'starter',
        affiliate_status: 'inactive',
      };
      await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();
    } catch (profileError) {
      Sentry.captureException(profileError);
      console.error('Warning: Failed to create user profile for:', data.user.id, profileError);
    }

    const response = NextResponse.json({
      message: 'Sign up successful. Please check your email to confirm.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    // Set session cookies if signup created a session (auto-confirm disabled)
    if (data.session) {
      setAuthCookies(
        response.cookies,
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_in
      );
    }

    return response;
  } catch (error) {
    Sentry.captureException(error);
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
