import { NextRequest, NextResponse } from 'next/server';
import { trackReferralClick } from '@/lib/referrals';

/**
 * POST /api/referrals/track
 * Track a referral link click
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralToken, sessionId } = body;

    if (!referralToken || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: referralToken, sessionId' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Track the click asynchronously (don't wait for completion)
    trackReferralClick(referralToken, sessionId, ipAddress, userAgent).catch(
      (error) => {
        console.error('Error tracking referral click:', error);
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking referral click:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
