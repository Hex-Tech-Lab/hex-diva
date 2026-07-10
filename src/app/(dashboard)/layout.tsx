'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogOut, Settings, Package, Heart, Share2 } from 'lucide-react';

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
          <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block lg:col-span-1`}>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-32">
              <div className="space-y-4">
                <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg font-semibold">Overview</Link>
                <Link href="/dashboard/orders" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg font-semibold"><Package size={20} />Orders</Link>
                <Link href="/dashboard/wishlist" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg font-semibold"><Heart size={20} />Wishlist</Link>
                <Link href="/dashboard/referrals" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg font-semibold"><Share2 size={20} />Referrals</Link>
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg font-semibold"><Settings size={20} />Settings</Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
