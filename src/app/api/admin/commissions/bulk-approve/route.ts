/**
 * POST /api/admin/commissions/bulk-approve - Approve multiple commissions
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commissionIds } = await request.json();

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid commission IDs' },
        { status: 400 }
      );
    }

    // Bulk update commissions to approved
    const { error: updateError } = await supabase
      .from('commissions')
      .update({
        status: 'approved',
      })
      .in('id', commissionIds)
      .eq('status', 'pending');

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to approve commissions' },
        { status: 500 }
      );
    }

    // Get updated commissions
    const { data: updated } = await supabase
      .from('commissions')
      .select('*')
      .in('id', commissionIds);

    return NextResponse.json({
      success: true,
      count: commissionIds.length,
      commissions: updated,
      message: `${commissionIds.length} commissions approved`,
    });
  } catch (error) {
    console.error('POST /api/admin/commissions/bulk-approve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
