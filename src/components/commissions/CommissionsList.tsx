'use client';

interface Commission {
  id: string;
  commission_amount: number;
}

export default function CommissionsList({ commissions }: { commissions: Commission[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Commissions</h2>
      {commissions.length === 0 ? (
        <p className="text-gray-600">No commissions yet</p>
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => (
            <div key={c.id} className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Commission</span>
              <span className="font-semibold">${c.commission_amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
