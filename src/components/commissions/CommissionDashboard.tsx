'use client';

import { useEffect, useState } from 'react';
import { DollarSign, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface CommissionData {
  pendingAmount: number;
  approvedAmount: number;
  readyForPayout: boolean;
}

export default function CommissionDashboard() {
  const [data, setData] = useState<CommissionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayingOut, _setIsPayingOut] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState('');

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const fetchCommissionData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/commissions');
      if (!response.ok) throw new Error('Failed to fetch');
      const commissionData = await response.json();
      setData(commissionData);
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
      <h1 className="text-3xl font-bold text-gray-900">Commissions & Payouts</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Pending Approval</h3>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${data.pendingAmount.toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Ready for Payout</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${data.approvedAmount.toFixed(2)}</div>
        </div>
      </div>

      {data.readyForPayout && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Request Payout</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={stripeAccountId}
              onChange={(e) => setStripeAccountId(e.target.value)}
              placeholder="acct_..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button disabled={isPayingOut} className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2">
              {isPayingOut ? <Loader className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {isPayingOut ? 'Processing...' : 'Request Payout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
