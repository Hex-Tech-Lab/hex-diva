'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface ReferralLeaderboardProps {
  data: Array<{ id: string; referrer: string; earned: number; pending: number }>;
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Rank</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Referrer</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Earned</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Pending</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {enrichedData.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-300 font-semibold">#{index + 1}</td>
                    <td className="py-3 px-4 text-slate-300">{item.referrer}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-medium">
                      ${item.earned.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400 font-medium">
                      ${item.pending.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-semibold">
                      ${(item.earned + item.pending).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
