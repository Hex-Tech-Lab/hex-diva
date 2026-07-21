import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

/**
 * GET /api/orders/[id]
 * Retrieve order details for authenticated user
 *
 * Returns order with line items, payment status, and audit events.
 * RLS ensures user can only access their own orders.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

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
