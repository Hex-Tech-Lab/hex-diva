'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';

export default function AdminCommissionsPanel() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await fetch('/api/commissions');
      if (response.ok) {
        setData(await response.json());
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data</div>;

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold text-gray-900">Commission Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold">{data.stats?.totalPending || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Approved</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">{data.stats?.totalApproved || 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Commissions</h2>
        {data.commissions && data.commissions.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.commissions.map((c: any) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2">${c.commission_amount?.toFixed(2) || '0.00'}</td>
                  <td className="py-2">{c.status}</td>
                  <td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-600">No commissions found</p>
        )}
      </div>
    </div>
  );
}
