'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bell, Lock, Eye, User } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'security'>('account');
  const [formData, setFormData] = useState({
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 123-4567',
    birthDate: '1992-06-15',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-off-white">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-charcoal-900 font-serif">Settings</h1>
            <Link href="/dashboard">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'account'
                    ? 'bg-rose-gold/10 text-rose-gold font-semibold border-l-2 border-rose-gold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User size={20} />
                Account
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'notifications'
                    ? 'bg-rose-gold/10 text-rose-gold font-semibold border-l-2 border-rose-gold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bell size={20} />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'security'
                    ? 'bg-rose-gold/10 text-rose-gold font-semibold border-l-2 border-rose-gold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock size={20} />
                Security
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'account' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-charcoal-900 mb-6 font-serif">Account Information</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <Input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-rose-gold hover:bg-opacity-90"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-charcoal-900 mb-6 font-serif">Notification Preferences</h2>

                <div className="space-y-6">
                  {[
                    { id: 'order', label: 'Order Updates', desc: 'Get notified about your order status' },
                    { id: 'promo', label: 'Promotional Emails', desc: 'Special offers and new product announcements' },
                    { id: 'newsletter', label: 'Newsletter', desc: 'Weekly beauty tips and product recommendations' },
                    { id: 'referral', label: 'Referral Rewards', desc: 'When your referrals make purchases' },
                  ].map(notif => (
                    <label key={notif.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-off-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 mt-1 accent-rose-gold rounded"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-charcoal-900">{notif.label}</p>
                        <p className="text-sm text-gray-600">{notif.desc}</p>
                      </div>
                    </label>
                  ))}

                  <div className="pt-6 border-t border-gray-200">
                    <Button className="bg-rose-gold hover:bg-opacity-90">Save Preferences</Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-charcoal-900 mb-6 font-serif">Security Settings</h2>

                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-charcoal-900">Password</p>
                        <p className="text-sm text-gray-600">Last changed 3 months ago</p>
                      </div>
                      <Button variant="outline">Change Password</Button>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-charcoal-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Secure your account with 2FA</p>
                      </div>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-charcoal-900">Active Sessions</p>
                        <p className="text-sm text-gray-600">Sign out all other sessions</p>
                      </div>
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                        Sign Out Other Sessions
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-900">Delete Account</p>
                        <p className="text-sm text-red-800">Permanently delete your account and data</p>
                      </div>
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
