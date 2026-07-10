'use client';

import { ReferralStats } from '@/lib/referrals';

interface ReferralDashboardProps {
  stats?: ReferralStats;
}

export default function ReferralDashboard({ stats }: ReferralDashboardProps) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Referral Dashboard</h2>
      {stats ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Total Referrals</p>
            <p className="text-3xl font-bold">{stats.totalReferrals}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Current Tier</p>
            <p className="text-2xl font-semibold capitalize">{stats.currentTier}</p>
          </div>
          <div>
            <p className="text-gray-600">Pending Commission</p>
            <p className="text-2xl font-semibold">${stats.pendingCommission.toFixed(2)}</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Loading referral data...</p>
      )}
    </div>
  );
}
