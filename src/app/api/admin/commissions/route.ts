import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase
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

    let query = supabase
      .from('commissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);

    const { data: commissions, count } = await query.range(offset, offset + limit - 1);

    const { data: allCommissions } = await supabase
      .from('commissions')
      .select('commission_amount, status');

    const stats = {
      totalCommissions: allCommissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      pendingAmount: allCommissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      approvedAmount: allCommissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      paidAmount: allCommissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
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
