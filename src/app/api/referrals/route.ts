import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import {
  getReferralCode,
  getReferralStats,
  updateReferralStats,
} from '@/lib/referrals';

/**
 * GET /api/referrals
 * Get referral information for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user ID from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get referral code
    const referralCode = await getReferralCode(user.id);

    // Get referral stats
    const stats = await getReferralStats(user.id);

    return NextResponse.json({
      referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}?ref=${referralCode}`,
      stats,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referrals
 * Create or initialize referral for a user
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create referral code
    const referralCode = await getReferralCode(user.id);

    // Update stats
    await updateReferralStats(user.id);

    return NextResponse.json({
      referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}?ref=${referralCode}`,
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
