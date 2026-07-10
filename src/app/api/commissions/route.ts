import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { getReferralStats } from '@/lib/referrals';

/**
 * GET /api/commissions
 * Get commission information for the current user
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get commissions
    const { data: commissions, error: commError } = await supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (commError) {
      throw commError;
    }

    // Get stats
    const stats = await getReferralStats(user.id);

    // Get payouts
    const { data: payouts, error: payoutError } = await supabaseAdmin
      .from('commission_payouts')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (payoutError) {
      throw payoutError;
    }

    return NextResponse.json({
      commissions: commissions || [],
      payouts: payouts || [],
      stats,
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
