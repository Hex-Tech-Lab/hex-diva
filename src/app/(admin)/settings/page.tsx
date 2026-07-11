'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PaymentProcessorsSection from '@/components/admin/settings/PaymentProcessorsSection';
import CommissionTiersSection from '@/components/admin/settings/CommissionTiersSection';
import AuditLogSection from '@/components/admin/settings/AuditLogSection';

interface SettingsData {
  settings: any;
  auditLog: any[];
  draftChanges: Record<string, any>;
  admin: {
    email: string;
    verifiedAt: string;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'payment' | 'commission' | 'audit'>(
    'payment'
  );
  const [saving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/admin/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch settings: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        } else {
          setError(data.error || 'Failed to load settings');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Settings fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleRefresh = async () => {
    try {
      setError('');
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-slate-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Error Loading Settings</h2>
        <p className="text-slate-300">{error || 'Failed to load settings'}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={handleRefresh}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings Panel</h1>
        <p className="text-slate-400">
          Manage payment processors and commission tiers. Changes are drafted and require
          deployment to take effect.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Status card */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Admin User</p>
            <p className="text-white font-medium">{settings.admin.email}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">Settings Loaded</p>
            <p className="text-white font-medium">
              {new Date(settings.admin.verifiedAt).toLocaleTimeString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">Pending Changes</p>
            <p className="text-white font-medium">
              {Object.keys(settings.draftChanges).length}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'payment'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Payment Processors
        </button>
        <button
          onClick={() => setActiveTab('commission')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'commission'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Commission Tiers
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Audit Log
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'payment' && (
          <PaymentProcessorsSection
            settings={settings}
            onSave={handleRefresh}
            saving={saving}
          />
        )}
        {activeTab === 'commission' && (
          <CommissionTiersSection
            settings={settings}
            onSave={handleRefresh}
            saving={saving}
          />
        )}
        {activeTab === 'audit' && (
          <AuditLogSection auditLog={settings.auditLog} />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-4 justify-end pt-8 border-t border-slate-700/50">
        <Button variant="ghost" onClick={handleRefresh}>
          Refresh
        </Button>
        {Object.keys(settings.draftChanges).length > 0 && (
          <div className="text-sm text-amber-400">
            {Object.keys(settings.draftChanges).length} pending change
            {Object.keys(settings.draftChanges).length !== 1 ? 's' : ''} — save and deploy to
            apply
          </div>
        )}
      </div>
    </div>
  );
}
