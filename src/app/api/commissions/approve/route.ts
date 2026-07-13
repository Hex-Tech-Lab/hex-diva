import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/db'
import { approveCommission } from '@/lib/referrals'
import { CommissionRepositoryAdapter } from '@/lib/adapters/CommissionRepositoryAdapter'

/**
 * POST /api/commissions/approve
 * Approve one or more commissions for payout (admin only)
 * Transitions commissions from 'pending' to 'approved' status
 *
 * @param {NextRequest} request - HTTP request with Bearer token and JSON body
 * @returns {Promise<NextResponse>} Success response with counts and per-commission errors
 *
 * @example
 * POST /api/commissions/approve
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * { "commissionIds": ["comm_123", "comm_456"] }
 *
 * Response 200:
 * {
 *   "success": true,
 *   "approvedCount": 2,
 *   "failedCount": 0,
 *   "errors": []
 * }
 *
 * @throws {401} Missing or invalid authorization token
 * @throws {403} User is not in admin whitelist
 * @throws {400} Invalid commissionIds (not array or empty)
 * @throws {500} Database or processing error
 *
 * @remarks Requires authorization header with Bearer token; uses ADMIN_EMAIL_WHITELIST for access control
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

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
    if (!user.email || !adminEmails.includes(user.email)) {
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
    const commissionRepo = new CommissionRepositoryAdapter()
    const approvedIds: string[] = []
    const errors: { id: string; error: string }[] = []

    for (const id of commissionIds) {
      try {
        await approveCommission(id, commissionRepo)
        approvedIds.push(id)
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
