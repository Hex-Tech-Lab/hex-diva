import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await (supabaseAdmin as any)
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const tier = url.searchParams.get('tier');

    const offset = (page - 1) * limit;

    let query = (supabaseAdmin as any)
      .from('commissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);

    const { data: commissions, count } = await query.range(offset, offset + limit - 1);

    const { data: allCommissions } = await (supabaseAdmin as any)
      .from('commissions')
      .select('commission_amount, status');

    const stats = {
      totalCommissions: allCommissions?.reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0) || 0,
      pendingAmount: allCommissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0) || 0,
      approvedAmount: allCommissions?.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0) || 0,
      paidAmount: allCommissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0) || 0,
      totalReferrers: commissions ? new Set(commissions.map((c: any) => c.referrer_id)).size : 0,
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
