'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Settings, ShoppingBag, Heart, Users, LogOut } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-off-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-charcoal-900 font-serif">Welcome, Sarah!</h1>
              <p className="text-gray-600 mt-1">sarah.chen@email.com</p>
            </div>
            <Button variant="outline" className="gap-2">
              <LogOut size={20} />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          {/* Stats Cards */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-charcoal-900">12</p>
              </div>
              <ShoppingBag className="text-rose-gold" size={32} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">Wishlist Items</p>
                <p className="text-3xl font-bold text-charcoal-900">8</p>
              </div>
              <Heart className="text-rose-gold" size={32} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">Total Spent</p>
                <p className="text-3xl font-bold text-charcoal-900">$1,240</p>
              </div>
              <Badge variant="success" className="h-fit">VIP</Badge>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">Loyalty Points</p>
                <p className="text-3xl font-bold text-charcoal-900">2,480</p>
              </div>
              <Users className="text-emerald-500" size={32} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-charcoal-900">Recent Orders</h2>
              <Link href="/dashboard/orders">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-off-white rounded-lg">
                  <div>
                    <p className="font-semibold text-charcoal-900">Order #{1000 + i}</p>
                    <p className="text-sm text-gray-600">Placed on {new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="success">Delivered</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Referral Program */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-charcoal-900">Referral Program</h2>
              <Link href="/dashboard/referrals">
                <Button variant="ghost" size="sm">View More</Button>
              </Link>
            </div>

            <div className="bg-gradient-to-br from-rose-gold/10 to-emerald-500/10 p-6 rounded-lg border border-rose-gold/30 mb-4">
              <p className="text-sm text-gray-600 mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-bold text-charcoal-900 font-serif">SARAH2024</code>
                <button className="px-3 py-1 bg-rose-gold text-white rounded text-sm hover:bg-opacity-90 transition-all">
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-off-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Referrals</p>
                <p className="text-2xl font-bold text-charcoal-900">5</p>
              </div>
              <div className="bg-off-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Earnings</p>
                <p className="text-2xl font-bold text-charcoal-900">$125</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/orders">
            <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-rose-gold transition-all cursor-pointer">
              <ShoppingBag className="text-rose-gold mb-3" size={32} />
              <h3 className="font-semibold text-charcoal-900 mb-2">My Orders</h3>
              <p className="text-sm text-gray-600">Track and manage your orders</p>
            </div>
          </Link>

          <Link href="/dashboard/wishlist">
            <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-rose-gold transition-all cursor-pointer">
              <Heart className="text-rose-gold mb-3" size={32} />
              <h3 className="font-semibold text-charcoal-900 mb-2">Wishlist</h3>
              <p className="text-sm text-gray-600">Your saved items and favorites</p>
            </div>
          </Link>

          <Link href="/dashboard/referrals">
            <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-rose-gold transition-all cursor-pointer">
              <Users className="text-rose-gold mb-3" size={32} />
              <h3 className="font-semibold text-charcoal-900 mb-2">Referrals</h3>
              <p className="text-sm text-gray-600">Earn rewards by referring friends</p>
            </div>
          </Link>

          <Link href="/dashboard/settings">
            <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-rose-gold transition-all cursor-pointer">
              <Settings className="text-rose-gold mb-3" size={32} />
              <h3 className="font-semibold text-charcoal-900 mb-2">Settings</h3>
              <p className="text-sm text-gray-600">Manage your account preferences</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
