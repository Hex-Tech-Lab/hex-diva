import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { captureError } from '@/lib/sentry';

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    captureError(error, { endpoint: '/api/auth/me' });
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
