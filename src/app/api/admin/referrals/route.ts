import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getSupabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Create request-scoped Supabase client
    const supabase = getSupabase();

    // Fetch referral stats with user information
    const { data: referralStats, error: statsError } = await supabase
      .from('referral_stats')
      .select('referrer_id, total_commission_earned')
      .order('total_commission_earned', { ascending: false })
      .limit(20);

    if (statsError) throw statsError;

    // Fetch corresponding user emails
    const referrerIds = (referralStats || []).map((s: any) => s.referrer_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .in('id', referrerIds);

    if (usersError) throw usersError;

    // Create a map of user data for quick lookup
    const userMap = new Map(
      (users || []).map((u: any) => [u.id, { email: u.email, name: u.display_name }])
    );

    // Fetch pending commissions (not yet paid)
    const { data: pendingCommissions, error: pendingError } = await supabase
      .from('commission_payouts')
      .select('referrer_id, amount, status')
      .in('referrer_id', referrerIds)
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // Create pending commission map
    const pendingMap = new Map<string, number>();
    (pendingCommissions || []).forEach((payout: any) => {
      const current = pendingMap.get(payout.referrer_id) || 0;
      pendingMap.set(payout.referrer_id, current + (payout.amount || 0));
    });

    // Combine data
    const result = (referralStats || []).map((stat: any) => {
      const user = userMap.get(stat.referrer_id);
      return {
        id: stat.referrer_id,
        referrer: user?.name || user?.email || 'Unknown',
        earned: stat.total_commission_earned || 0,
        pending: pendingMap.get(stat.referrer_id) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Referrals API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch referral data',
      },
      { status: 500 }
    );
  }
}
