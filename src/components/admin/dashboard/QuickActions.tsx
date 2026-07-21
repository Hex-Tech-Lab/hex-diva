import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  return (
    <Card className="p-6 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/admin/orders">
          <Button variant="outline" className="w-full">
            View Orders
          </Button>
        </Link>

        <Link href="/admin/products">
          <Button variant="outline" className="w-full">
            Manage Products
          </Button>
        </Link>

        <Link href="/admin/payouts">
          <Button variant="outline" className="w-full">
            Commission Payouts
          </Button>
        </Link>

        <Link href="/admin/settings">
          <Button variant="outline" className="w-full">
            Settings
          </Button>
        </Link>

        <Link href="/admin/audit">
          <Button variant="outline" className="w-full">
            Audit Logs
          </Button>
        </Link>

        <Link href="/">
          <Button variant="ghost" className="w-full">
            Back to Store
          </Button>
        </Link>
      </div>
    </Card>
  );
}
