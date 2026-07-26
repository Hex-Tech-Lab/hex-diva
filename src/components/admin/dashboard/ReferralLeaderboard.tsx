'use client';

import { useEffect, useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Table, proportional } from '@astryxdesign/core/Table';

interface ReferralEntry {
  id: string;
  referrer: string;
  earned: number;
  pending: number;
  [key: string]: unknown;
}

interface ReferralLeaderboardProps {
  data: ReferralEntry[];
}

export function ReferralLeaderboard({ data }: ReferralLeaderboardProps) {
  const [enrichedData, setEnrichedData] = useState(data);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function enrichData() {
      try {
        setLoading(true);

        // Fetch full referral data including pending commissions
        const response = await fetch('/api/admin/referrals');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setEnrichedData(result.data.slice(0, 20));
          }
        }
      } catch (error) {
        console.error('Failed to enrich referral data:', error);
        setEnrichedData(data);
      } finally {
        setLoading(false);
      }
    }

    enrichData();
  }, [data]);

  return (
    <Card className="p-6 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Top 20 Referrers</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-slate-400 mt-2">Loading referral data...</p>
          </div>
        ) : enrichedData.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No referral data available</p>
        ) : (
          <div className="overflow-x-auto">
            <Table
              data={enrichedData}
              idKey="id"
              columns={[
                {
                  key: 'rank',
                  header: 'Rank',
                  width: proportional(1),
                  renderCell: (item) => (
                    <span className="font-semibold">#{enrichedData.indexOf(item) + 1}</span>
                  ),
                },
                { key: 'referrer', header: 'Referrer', width: proportional(2) },
                {
                  key: 'earned',
                  header: 'Earned',
                  width: proportional(1),
                  renderCell: (item) => (
                    <span className="text-green-400 font-medium">${item.earned.toFixed(2)}</span>
                  ),
                },
                {
                  key: 'pending',
                  header: 'Pending',
                  width: proportional(1),
                  renderCell: (item) => (
                    <span className="text-amber-400 font-medium">${item.pending.toFixed(2)}</span>
                  ),
                },
                {
                  key: 'total',
                  header: 'Total',
                  width: proportional(1),
                  renderCell: (item) => (
                    <span className="text-cyan-400 font-semibold">
                      ${(item.earned + item.pending).toFixed(2)}
                    </span>
                  ),
                },
              ]}
              hasHover
              dividers="rows"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
