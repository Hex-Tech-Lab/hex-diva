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

    // Get query parameters
    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');

    // Create request-scoped Supabase client
    const supabase = getSupabase();

    // Build query
    let query = supabase
      .from('orders')
      .select(
        'id, user_id, status, total, created_at, users(email), order_items(id)',
        { count: 'exact' }
      );

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Execute query with pagination
    const { data: orders, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to include user email and item count
    const transformedOrders = (orders || []).map((order: any) => ({
      id: order.id,
      user_id: order.user_id,
      email: order.users?.email || 'Unknown',
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      item_count: order.order_items?.length || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders: transformedOrders,
        totalCount: count || 0,
      },
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}
