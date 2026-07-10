import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { approveCommission } from '@/lib/referrals';

/**
 * POST /api/commissions/approve
 * Approve commissions for payout (admin only)
 * Body: { commissionIds: string[] }
 */
export async function POST(request: NextRequest) {
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

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAIL_WHITELIST?.split(',') || [];
    if (!adminEmails.includes(user.email)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { commissionIds } = body;

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid commissionIds' },
        { status: 400 }
      );
    }

    // Approve commissions
    const approvedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const id of commissionIds) {
      try {
        await approveCommission(id);
        approvedIds.push(id);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      approvedCount: approvedIds.length,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error('Error approving commissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
