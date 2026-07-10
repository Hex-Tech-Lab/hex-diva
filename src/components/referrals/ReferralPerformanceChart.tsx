'use client';

import { ReferralStats } from '@/lib/referrals';

interface ReferralPerformanceChartProps {
  stats: ReferralStats;
}

export default function ReferralPerformanceChart({ stats }: ReferralPerformanceChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Tier Progress</h2>
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Bronze: $0-$10k (5%)</h3>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: stats.currentTier === 'bronze' ? '50%' : '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
