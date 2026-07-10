import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user } = await supabase.from('users').select('id').eq('email', session.user.email).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase.from('commissions').select('*', { count: 'exact' }).eq('referrer_id', user.id).order('created_at', { ascending: false });
    if (url.searchParams.get('status')) query = query.eq('status', url.searchParams.get('status'));
    if (url.searchParams.get('tier')) query = query.eq('tier', url.searchParams.get('tier'));

    const { data: commissions, count } = await query.range(offset, offset + limit - 1);
    return NextResponse.json({
      commissions: commissions || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
