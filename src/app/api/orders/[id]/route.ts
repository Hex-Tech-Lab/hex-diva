import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

/**
 * GET /api/orders/[id]
 * Retrieve order details for authenticated user
 *
 * Returns order with line items. RLS ensures user can only access their own orders.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Request-scoped Supabase client, hydrated from the incoming request's
    // auth cookies (mirrors src/app/api/checkout/route.ts). getSupabase()
    // with no session context has no way to authenticate the caller, so
    // auth.getUser() below always returned null and every request 401'd.
    const supabase = getSupabase({
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } catch (sessionError) {
        console.error('Failed to restore session from cookies');
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get order (ensure it belongs to user via RLS)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (itemsError) {
      Sentry.captureException(itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch order items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...order,
      items: items || [],
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Order detail fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
