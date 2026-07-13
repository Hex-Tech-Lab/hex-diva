import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin/auth';
import type { CommissionRecord } from '@/types/database.types';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (checks Bearer token or session cookie)
    const adminCheck = await verifyAdminAccess(request);

    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: adminCheck.error || 'Forbidden' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const tier = url.searchParams.get('tier');

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('commissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);

    const { data: commissions, count } = await query.range(offset, offset + limit - 1);

    const { data: allCommissions } = await supabaseAdmin
      .from('commissions')
      .select('amount, status, referrer_id');

    interface CommissionSummary { amount: number; status: string; referrer_id: string }

    const stats = {
      totalCommissions: allCommissions?.reduce((sum: number, c: CommissionSummary) => sum + (c.amount || 0), 0) || 0,
      pendingAmount: allCommissions?.filter((c: CommissionSummary) => c.status === 'pending').reduce((sum: number, c: CommissionSummary) => sum + (c.amount || 0), 0) || 0,
      approvedAmount: allCommissions?.filter((c: CommissionSummary) => c.status === 'approved').reduce((sum: number, c: CommissionSummary) => sum + (c.amount || 0), 0) || 0,
      paidAmount: allCommissions?.filter((c: CommissionSummary) => c.status === 'paid').reduce((sum: number, c: CommissionSummary) => sum + (c.amount || 0), 0) || 0,
      totalReferrers: commissions ? new Set(commissions.map((c: CommissionRecord) => c.referrer_id)).size : 0,
    };

    return NextResponse.json({
      commissions: commissions || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
      stats,
    });
  } catch (error) {
    console.error('Admin commissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
