'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/admin/dashboard/KPICard';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { ProductPerformanceChart } from '@/components/admin/dashboard/ProductPerformanceChart';
import { ReferralLeaderboard } from '@/components/admin/dashboard/ReferralLeaderboard';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    ordersThisMonth: number;
    avgOrderValue: number;
    growthYoY: number;
    totalUsers: number;
    b2cUsers: number;
    b2bUsers: number;
    signupsThisMonth: number;
  };
  revenueData: Array<{ date: string; revenue: number }>;
  topProducts: Array<{ id: string; name: string; revenue: number; quantity: number }>;
  referralLeaderboard: Array<{ id: string; referrer: string; earned: number; pending: number }>;
  loading: boolean;
  error: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    kpis: {
      totalRevenue: 0,
      ordersThisMonth: 0,
      avgOrderValue: 0,
      growthYoY: 0,
      totalUsers: 0,
      b2cUsers: 0,
      b2bUsers: 0,
      signupsThisMonth: 0,
    },
    revenueData: [],
    topProducts: [],
    referralLeaderboard: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setData((prev) => ({ ...prev, loading: true, error: '' }));

      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setData((prev) => ({
          ...prev,
          kpis: result.data.kpis,
          revenueData: result.data.revenueData,
          topProducts: result.data.topProducts,
          referralLeaderboard: result.data.referralLeaderboard,
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setData((prev) => ({ ...prev, error: message, loading: false }));
      console.error('Dashboard error:', err);
    }
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Key metrics and analytics for Hex-Diva</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Error message */}
      {data.error && (
        <Card className="p-4 border-red-900/30 bg-red-950/20">
          <p className="text-red-300">{data.error}</p>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={`$${data.kpis.totalRevenue.toLocaleString()}`}
          subtitle="All time"
          trend={`${data.kpis.growthYoY > 0 ? '+' : ''}${data.kpis.growthYoY}% YoY`}
          trendUp={data.kpis.growthYoY > 0}
        />
        <KPICard
          title="Orders This Month"
          value={data.kpis.ordersThisMonth.toString()}
          subtitle="Current month"
        />
        <KPICard
          title="Average Order Value"
          value={`$${data.kpis.avgOrderValue.toFixed(2)}`}
          subtitle="Per order"
        />
        <KPICard
          title="Total Users"
          value={data.kpis.totalUsers.toString()}
          subtitle={`B2C: ${data.kpis.b2cUsers} | B2B: ${data.kpis.b2bUsers}`}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data.revenueData} />
        <ProductPerformanceChart data={data.topProducts} />
      </div>

      {/* Referral Leaderboard */}
      <ReferralLeaderboard data={data.referralLeaderboard} />
    </div>
  );
}
