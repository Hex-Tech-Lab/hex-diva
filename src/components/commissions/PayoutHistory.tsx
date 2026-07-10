'use client';

interface Payout {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function PayoutHistory({ payouts }: { payouts: Payout[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h2>
      {payouts.length === 0 ? (
        <p className="text-gray-600">No payouts yet</p>
      ) : (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex justify-between py-2 border-b">
              <span className="text-sm">${p.total_amount.toFixed(2)} - {p.status}</span>
              <span className="text-xs text-gray-600">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
