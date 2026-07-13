import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get referral stats
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id);

    // Get commission totals
    const { data: commissions, error: commError } = await supabase
      .from('commissions')
      .select('*')
      .eq('referrer_id', user.id);

    if (refError || commError) {
      Sentry.captureException(refError || commError);
      return NextResponse.json(
        { error: 'Failed to fetch referral data' },
        { status: 400 }
      );
    }

    const stats = {
      totalReferrals: referrals?.length || 0,
      completedReferrals:
        referrals?.filter((r: any) => r.status === 'claimed' || r.status === 'active').length || 0,
      totalCommissions: commissions?.reduce(
        (sum: number, c: any) => sum + (c.amount || 0),
        0
      ) || 0,
      pendingCommissions: commissions?.reduce(
        (sum: number, c: any) => sum + (c.status === 'pending' ? c.amount : 0),
        0
      ) || 0,
      paidCommissions: commissions?.reduce(
        (sum: number, c: any) => sum + (c.status === 'paid' ? c.amount : 0),
        0
      ) || 0,
      referrals,
      commissions,
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Referrals fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
