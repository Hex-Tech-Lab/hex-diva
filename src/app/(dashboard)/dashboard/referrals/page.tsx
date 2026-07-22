'use client';

import Link from 'next/link';
import { Button } from '@astryxdesign/core/Button';
import { Copy, QrCode, Share2 } from 'lucide-react';

export default function ReferralsPage() {
  const referralCode = 'SARAH2024';
  const referrals = [
    { id: 1, name: 'Emily Johnson', date: '2024-01-10', purchases: 2, earnings: 45.50 },
    { id: 2, name: 'Jessica Lee', date: '2024-01-05', purchases: 1, earnings: 15.00 },
    { id: 3, name: 'Amanda Smith', date: '2023-12-28', purchases: 3, earnings: 65.25 },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
  };

  return (
    <div className="min-h-screen bg-off-white">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-charcoal-900 font-serif">Referral Program</h1>
            <Link href="/dashboard">
              <Button variant="ghost" label="Back" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-sm mb-2">Total Referrals</p>
            <p className="text-3xl font-bold text-charcoal-900">5</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-sm mb-2">Active Referrals</p>
            <p className="text-3xl font-bold text-charcoal-900">3</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-sm mb-2">Total Earnings</p>
            <p className="text-3xl font-bold text-charcoal-900">$125.75</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-sm mb-2">Pending Payout</p>
            <p className="text-3xl font-bold text-charcoal-900">$45.50</p>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 mb-12">
          <h2 className="text-2xl font-bold text-charcoal-900 mb-6 font-serif">Share Your Code</h2>

          <div className="bg-gradient-to-br from-rose-gold/10 to-emerald-500/10 p-8 rounded-lg border-2 border-rose-gold/30 mb-6">
            <p className="text-gray-600 text-sm mb-4">Your Unique Referral Code</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <code className="text-4xl font-bold text-charcoal-900 font-serif">{referralCode}</code>
              <Button
                variant="primary"
                label="Copy Code"
                icon={<Copy size={20} />}
                onClick={handleCopyCode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="secondary" label="Share on Social" icon={<Share2 size={20} />} className="h-12" />
            <Button variant="secondary" label="Generate QR Code" icon={<QrCode size={20} />} className="h-12" />
            <Button variant="secondary" label="Email Invite" className="h-12" />
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-charcoal-900">Your Referrals</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-off-white border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Purchases</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(referral => (
                  <tr key={referral.id} className="border-b border-gray-200 hover:bg-off-white transition-colors">
                    <td className="px-6 py-4 text-charcoal-900 font-medium">{referral.name}</td>
                    <td className="px-6 py-4 text-gray-600">{referral.date}</td>
                    <td className="px-6 py-4 text-gray-600">{referral.purchases}</td>
                    <td className="px-6 py-4 font-bold text-charcoal-900">${referral.earnings.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
