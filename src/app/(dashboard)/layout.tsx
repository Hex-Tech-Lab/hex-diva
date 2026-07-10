'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Settings, Package, Heart, Share2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-off-white">
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Account</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-gray-700">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className={`lg:col-span-1 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <nav className="space-y-2">
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white border hover:bg-gray-50">
                <Package size={20} />
                <span>Orders</span>
              </Link>
              <Link href="/dashboard/wishlist" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white">
                <Heart size={20} />
                <span>Wishlist</span>
              </Link>
              <Link href="/dashboard/referrals" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white">
                <Share2 size={20} />
                <span>Referrals</span>
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white">
                <Settings size={20} />
                <span>Settings</span>
              </Link>
            </nav>
          </aside>

          <main className="lg:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
