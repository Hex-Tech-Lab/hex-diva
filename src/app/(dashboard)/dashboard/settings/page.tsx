'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Bell, Lock, User } from 'lucide-react';

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
              <Button variant="ghost" label="Back" />
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
                    <TextInput
                      label="First Name"
                      value={formData.firstName}
                      onChange={value => setFormData(prev => ({ ...prev, firstName: value }))}
                    />
                    <TextInput
                      label="Last Name"
                      value={formData.lastName}
                      onChange={value => setFormData(prev => ({ ...prev, lastName: value }))}
                    />
                  </div>

                  <TextInput
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={value => setFormData(prev => ({ ...prev, email: value }))}
                  />

                  <TextInput
                    label="Phone Number"
                    value={formData.phone}
                    onChange={value => setFormData(prev => ({ ...prev, phone: value }))}
                  />

                  <TextInput
                    label="Date of Birth"
                    type="text"
                    value={formData.birthDate}
                    onChange={value => setFormData(prev => ({ ...prev, birthDate: value }))}
                  />

                  <div className="pt-6 border-t border-gray-200">
                    <Button
                      label={isSaving ? 'Saving...' : 'Save Changes'}
                      variant="primary"
                      onClick={handleSave}
                      isDisabled={isSaving}
                      isLoading={isSaving}
                    />
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
                    <Button label="Save Preferences" variant="primary" />
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
                      <Button variant="secondary" label="Change Password" />
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-charcoal-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Secure your account with 2FA</p>
                      </div>
                      <Button variant="secondary" label="Enable 2FA" />
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-charcoal-900">Active Sessions</p>
                        <p className="text-sm text-gray-600">Sign out all other sessions</p>
                      </div>
                      <Button variant="destructive" label="Sign Out Other Sessions" />
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-900">Delete Account</p>
                        <p className="text-sm text-red-800">Permanently delete your account and data</p>
                      </div>
                      <Button variant="destructive" label="Delete Account" />
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
