import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getSupabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (Law #2: request-scoped client)
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Create request-scoped Supabase client
    const supabase = getSupabase();

    // Fetch KPIs (using admin access from verified context)
    const [ordersData, usersData, usersWithTierData, topReferrersData, productsData] = await Promise.all([
      // Get orders metrics
      supabase
        .from('orders')
        .select('id, total, created_at, status')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),

      // Get user metrics
      supabase
        .from('users')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),

      // Get user tier distribution
      supabase
        .from('users')
        .select('id, tier'),

      // Get top referrers
      supabase
        .from('referral_stats')
        .select('referrer_id, total_commission_earned')
        .order('total_commission_earned', { ascending: false })
        .limit(10),

      // Get top products by revenue
      supabase
        .from('order_items')
        .select('product_id, quantity, total, products(name)')
        .limit(1000),
    ]);

    if (
      ordersData.error ||
      usersData.error ||
      usersWithTierData.error ||
      topReferrersData.error ||
      productsData.error
    ) {
      throw new Error('Failed to fetch data from database');
    }

    // Calculate KPIs
    const orders = ordersData.data || [];
    const users = usersData.data || [];
    const usersWithTier = usersWithTierData.data || [];
    const topReferrers = topReferrersData.data || [];
    const items = productsData.data || [];

    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const ordersThisMonth = orders.filter(
      (o: any) => new Date(o.created_at) > thisMonth
    ).length;
    const avgOrderValue = ordersThisMonth > 0 ? totalRevenue / ordersThisMonth : 0;

    // Calculate YoY growth (simplified: compare this month vs last month)
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const ordersLastYear = orders.filter((o: any) => new Date(o.created_at) > lastYear).length;
    const growthYoY = ordersLastYear > 0 ? ((ordersThisMonth - ordersLastYear) / ordersLastYear) * 100 : 0;

    // User metrics
    const totalUsers = users.length;
    const b2cUsers = usersWithTier.filter((u: any) => u.tier === 'b2c').length;
    const b2bUsers = usersWithTier.filter((u: any) => u.tier === 'b2b').length;
    const signupsThisMonth = users.filter(
      (u: any) => new Date(u.created_at) > thisMonth
    ).length;

    // Revenue over time (last 30 days, grouped by day)
    const revenueChartMap = new Map<string, number>();
    orders.forEach((order: any) => {
      if (!order.created_at) return;
      const date = new Date(order.created_at as string).toISOString().split('T')[0] || 'unknown';
      revenueChartMap.set(date, (revenueChartMap.get(date) || 0) + (order.total || 0));
    });
    const revenueData = Array.from(revenueChartMap.entries())
      .sort(([a], [b]) => (a || '').localeCompare(b || ''))
      .slice(-30)
      .map(([date, revenue]) => ({ date, revenue }));

    // Top products by revenue
    const productMap = new Map<
      string,
      { name: string; revenue: number; quantity: number }
    >();
    items.forEach((item: any) => {
      if (!item.product_id) return;
      const productId = item.product_id as string;
      const existing = productMap.get(productId) || {
        name: (item.products?.name as string) || 'Unknown',
        revenue: 0,
        quantity: 0,
      };
      existing.revenue += (item.total as number) || 0;
      existing.quantity += (item.quantity as number) || 0;
      productMap.set(productId, existing);
    });
    const topProducts = Array.from(productMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));

    // Referral leaderboard (will be populated with user names in component)
    const referralLeaderboard = topReferrers.slice(0, 20).map((ref: any) => ({
      id: ref.referrer_id,
      referrer: 'Loading...', // Will be fetched by component
      earned: ref.total_commission_earned || 0,
      pending: 0, // Will be calculated in component
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          ordersThisMonth,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          growthYoY: Math.round(growthYoY * 100) / 100,
          totalUsers,
          b2cUsers,
          b2bUsers,
          signupsThisMonth,
        },
        revenueData,
        topProducts,
        referralLeaderboard,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      },
      { status: 500 }
    );
  }
}
