'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/admin/dashboard/KPICard';
import { PayoutStatusBadge } from '@/components/admin/payouts/PayoutStatusBadge';

interface Payout {
  id: string;
  referrer_id: string;
  referrer_email: string;
  amount: number;
  status: string;
  created_at: string;
  payout_date?: string;
}

interface PayoutsState {
  payouts: Payout[];
  loading: boolean;
  error: string;
  pendingAmount: number;
  paidAmount: number;
}

export default function PayoutsPage() {
  const [state, setState] = useState<PayoutsState>({
    payouts: [],
    loading: true,
    error: '',
    pendingAmount: 0,
    paidAmount: 0,
  });

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    try {
      setState((prev) => ({ ...prev, loading: true, error: '' }));

      const response = await fetch('/api/admin/payouts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payouts: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const pendingAmount = result.data.payouts
          .filter((p: Payout) => p.status === 'pending')
          .reduce((sum: number, p: Payout) => sum + p.amount, 0);

        const paidAmount = result.data.payouts
          .filter((p: Payout) => p.status === 'paid')
          .reduce((sum: number, p: Payout) => sum + p.amount, 0);

        setState((prev) => ({
          ...prev,
          payouts: result.data.payouts,
          pendingAmount,
          paidAmount,
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payouts';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      console.error('Payouts error:', err);
    }
  }

  async function processPayout(payoutId: string) {
    try {
      const response = await fetch(`/api/admin/payouts/${payoutId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to process payout');
      }

      const result = await response.json();
      if (result.success) {
        fetchPayouts();
      }
    } catch (error) {
      console.error('Payout processing error:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process payout',
      }));
    }
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Commission Payouts</h1>
          <p className="text-slate-400">Manage and track affiliate commission payouts</p>
        </div>
        <Button onClick={fetchPayouts} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Error message */}
      {state.error && (
        <Card className="p-4 border-red-900/30 bg-red-950/20">
          <p className="text-red-300">{state.error}</p>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Pending Payouts"
          value={`$${state.pendingAmount.toFixed(2)}`}
          subtitle="Ready to process"
        />
        <KPICard
          title="Paid Payouts"
          value={`$${state.paidAmount.toFixed(2)}`}
          subtitle="Total distributed"
        />
        <KPICard
          title="Active Payouts"
          value={state.payouts.filter((p) => p.status === 'processing').length.toString()}
          subtitle="Currently processing"
        />
      </div>

      {/* Payouts table */}
      {state.loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-slate-300">Loading payouts...</p>
          </div>
        </div>
      ) : state.payouts.length === 0 ? (
        <Card className="p-8 text-center border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <p className="text-slate-400">No payouts found</p>
        </Card>
      ) : (
        <Card className="border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/30">
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Referrer</th>
                  <th className="text-right py-4 px-6 text-slate-400 font-medium">Amount</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Created</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Payout Date</th>
                  <th className="text-center py-4 px-6 text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="py-4 px-6 text-slate-300">{payout.referrer_email}</td>
                    <td className="py-4 px-6 text-right text-white font-semibold">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <PayoutStatusBadge status={payout.status} />
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {payout.payout_date
                        ? new Date(payout.payout_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {payout.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processPayout(payout.id)}
                        >
                          Process
                        </Button>
                      )}
                      {payout.status !== 'pending' && (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
