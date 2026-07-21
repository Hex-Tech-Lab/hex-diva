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

    // Fetch commission payouts with user information
    const { data: payouts, error } = await supabase
      .from('commission_payouts')
      .select('id, referrer_id, amount, status, created_at, payout_date, users(email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to include user email
    const transformedPayouts = (payouts || []).map((payout: any) => ({
      id: payout.id,
      referrer_id: payout.referrer_id,
      referrer_email: payout.users?.email || 'Unknown',
      amount: payout.amount,
      status: payout.status,
      created_at: payout.created_at,
      payout_date: payout.payout_date,
    }));

    return NextResponse.json({
      success: true,
      data: {
        payouts: transformedPayouts,
      },
    });
  } catch (error) {
    console.error('Payouts API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payouts',
      },
      { status: 500 }
    );
  }
}
