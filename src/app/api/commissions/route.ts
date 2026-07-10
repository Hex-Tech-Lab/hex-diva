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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const tier = url.searchParams.get('tier');

    const offset = (page - 1) * limit;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let query = supabase
      .from('commissions')
      .select('*', { count: 'exact' })
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);

    const { data: commissions, count } = await query.range(offset, offset + limit - 1);

    const { data: summaryData } = await supabase
      .from('commissions')
      .select('commission_amount, status, tier')
      .eq('referrer_id', user.id);

    const summary = {
      totalCommissions: summaryData?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      pendingCommissions: summaryData?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      paidCommissions: summaryData?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      byTier: {
        bronze: summaryData?.filter(c => c.tier === 'bronze').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
        silver: summaryData?.filter(c => c.tier === 'silver').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
        gold: summaryData?.filter(c => c.tier === 'gold').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
      },
    };

    return NextResponse.json({
      commissions: commissions || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
      summary,
    });
  } catch (error) {
    console.error('Commissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
