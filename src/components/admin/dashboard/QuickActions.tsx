import Link from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';

export function QuickActions() {
  return (
    <Card className="p-6 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link href="/admin/orders">
          <Button variant="secondary" label="View Orders" className="w-full" />
        </Link>

        <Link href="/admin/products">
          <Button variant="secondary" label="Manage Products" className="w-full" />
        </Link>

        <Link href="/admin/settings">
          <Button variant="secondary" label="Settings" className="w-full" />
        </Link>

        <Link href="/admin/audit">
          <Button variant="secondary" label="Audit Logs" className="w-full" />
        </Link>

        <Link href="/">
          <Button variant="ghost" label="Back to Store" className="w-full" />
        </Link>
      </div>
    </Card>
  );
}
