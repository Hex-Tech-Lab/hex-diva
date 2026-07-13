'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface PaymentProcessor {
  provider: string;
  name: string;
  type: 'primary' | 'fallback1' | 'fallback2';
  enabled: boolean;
  fees: {
    percentagePerTransaction: number;
    fixedPerTransaction: number;
  };
  settlementCycle: {
    frequency: string;
    daysUntilSettlement: number;
    cutoffTime: string;
  };
  supportedMethods: {
    cod: boolean;
    card: boolean;
    wallet: boolean;
  };
  shopifyIntegration: boolean;
  cashAgentLocations?: number;
}

interface PaymentProcessorsSectionProps {
  settings: {
    settings: {
      payment: {
        primary: any;
        fallback1: any;
        fallback2: any;
      };
    };
    draftChanges: Record<string, any>;
  };
  onSave: () => void;
  saving: boolean;
}

export default function PaymentProcessorsSection({
  settings,
  onSave,
  saving,
}: PaymentProcessorsSectionProps) {
  const [editingProcessor, setEditingProcessor] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    processor: string;
    field: string;
    oldValue: any;
    newValue: any;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const processors = [
    {
      provider: 'paymob',
      name: settings.settings.payment.primary.name,
      type: 'primary',
      enabled: true,
      fees: settings.settings.payment.primary.fees,
      settlementCycle: settings.settings.payment.primary.settlementCycle,
      supportedMethods: {
        cod: settings.settings.payment.primary.codSupport,
        card: settings.settings.payment.primary.cardSupport,
        wallet: settings.settings.payment.primary.walletSupport,
      },
      shopifyIntegration: settings.settings.payment.primary.shopifyIntegration,
    },
    {
      provider: 'fawry',
      name: settings.settings.payment.fallback1.name,
      type: 'fallback1',
      enabled: true,
      fees: settings.settings.payment.fallback1.fees,
      settlementCycle: settings.settings.payment.fallback1.settlementCycle,
      supportedMethods: {
        cod: settings.settings.payment.fallback1.codSupport,
        card: settings.settings.payment.fallback1.cardSupport,
        wallet: settings.settings.payment.fallback1.walletSupport,
      },
      shopifyIntegration: settings.settings.payment.fallback1.shopifyIntegration,
      cashAgentLocations: settings.settings.payment.fallback1.cashAgentLocations,
    },
    {
      provider: 'paytabs',
      name: settings.settings.payment.fallback2.name,
      type: 'fallback2',
      enabled: true,
      fees: settings.settings.payment.fallback2.fees,
      settlementCycle: settings.settings.payment.fallback2.settlementCycle,
      supportedMethods: {
        cod: settings.settings.payment.fallback2.codSupport,
        card: settings.settings.payment.fallback2.cardSupport,
        wallet: settings.settings.payment.fallback2.walletSupport,
      },
      shopifyIntegration: settings.settings.payment.fallback2.shopifyIntegration,
    },
  ] as PaymentProcessor[];

  const handleEditProcessor = (processor: PaymentProcessor) => {
    setEditingProcessor(processor.provider);
    setEditValues({
      percentageFee: processor.fees.percentagePerTransaction,
      fixedFee: processor.fees.fixedPerTransaction,
      daysUntilSettlement: processor.settlementCycle.daysUntilSettlement,
    });
  };

  const handleConfirmChange = (
    processor: string,
    field: string,
    oldValue: any,
    newValue: any
  ) => {
    setConfirmDialog({
      processor,
      field,
      oldValue,
      newValue,
    });
  };

  const handleApplyChange = async () => {
    if (!confirmDialog) return;

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'propose',
          section: 'payment',
          field: `${confirmDialog.processor}.${confirmDialog.field}`,
          oldValue: confirmDialog.oldValue,
          newValue: confirmDialog.newValue,
        }),
      });

      if (response.ok) {
        await response.json();
        setSuccessMessage(`Change proposed: ${confirmDialog.field} updated`);
        setTimeout(() => setSuccessMessage(''), 3000);
        setConfirmDialog(null);
        setEditingProcessor(null);
        onSave();
      } else {
        alert('Failed to apply change');
      }
    } catch (error) {
      console.error('Error applying change:', error);
      alert('Error applying change');
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-lg border border-green-900/30 bg-green-950/20 p-4">
          <p className="text-green-300">{successMessage}</p>
        </div>
      )}

      <div className="grid gap-6">
        {processors.map((processor) => (
          <Card key={processor.provider} className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{processor.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      processor.type === 'primary'
                        ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-900/50'
                        : processor.type === 'fallback1'
                          ? 'bg-blue-950/40 text-blue-300 border border-blue-900/50'
                          : 'bg-purple-950/40 text-purple-300 border border-purple-900/50'
                    }`}
                  >
                    {processor.type === 'primary'
                      ? 'Primary'
                      : processor.type === 'fallback1'
                        ? 'Fallback 1'
                        : 'Fallback 2'}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  Provider: <span className="text-slate-300">{processor.provider}</span>
                </p>
              </div>
              {editingProcessor !== processor.provider && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditProcessor(processor)}
                >
                  Edit
                </Button>
              )}
            </div>

            {/* Content - View or Edit mode */}
            {editingProcessor === processor.provider ? (
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Percentage Fee (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editValues.percentageFee || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          percentageFee: parseFloat(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {processor.fees.percentagePerTransaction}%
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fixed Fee (EGP)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editValues.fixedFee || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          fixedFee: parseFloat(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {processor.fees.fixedPerTransaction} EGP
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Days Until Settlement
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={editValues.daysUntilSettlement || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          daysUntilSettlement: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: T+{processor.settlementCycle.daysUntilSettlement}
                    </p>
                  </div>
                </div>

                {/* Edit actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      handleConfirmChange(
                        processor.provider,
                        'fees.percentagePerTransaction',
                        processor.fees.percentagePerTransaction,
                        editValues.percentageFee
                      )
                    }
                  >
                    Propose Changes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingProcessor(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Fees</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                      <p className="text-xs text-slate-400">Per-Transaction</p>
                      <p className="text-white font-mono">
                        {processor.fees.percentagePerTransaction}% + {processor.fees.fixedPerTransaction} EGP
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                      <p className="text-xs text-slate-400">Settlement</p>
                      <p className="text-white font-mono">
                        T+{processor.settlementCycle.daysUntilSettlement} (
                        {processor.settlementCycle.frequency})
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Supported Methods</h4>
                  <div className="flex gap-3 flex-wrap">
                    {processor.supportedMethods.cod && (
                      <span className="px-3 py-1 bg-green-950/30 text-green-300 rounded text-xs border border-green-900/30">
                        Cash on Delivery
                      </span>
                    )}
                    {processor.supportedMethods.card && (
                      <span className="px-3 py-1 bg-blue-950/30 text-blue-300 rounded text-xs border border-blue-900/30">
                        Card
                      </span>
                    )}
                    {processor.supportedMethods.wallet && (
                      <span className="px-3 py-1 bg-purple-950/30 text-purple-300 rounded text-xs border border-purple-900/30">
                        Digital Wallet
                      </span>
                    )}
                  </div>
                </div>

                {processor.shopifyIntegration && (
                  <div className="text-xs text-cyan-400 bg-cyan-950/20 px-3 py-2 rounded border border-cyan-900/30">
                    ✓ Shopify Integration available
                  </div>
                )}

                {processor.cashAgentLocations && (
                  <div className="text-xs text-slate-400">
                    Cash agent locations: {processor.cashAgentLocations.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Confirm Change</h3>
              <p className="text-slate-400 text-sm mt-1">
                Update {confirmDialog.processor} → {confirmDialog.field}
              </p>
            </div>

            <div className="space-y-2 bg-slate-800/30 rounded-lg p-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Current Value</p>
                <p className="text-white font-mono">
                  {JSON.stringify(confirmDialog.oldValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">New Value</p>
                <p className="text-cyan-400 font-mono">
                  {JSON.stringify(confirmDialog.newValue)}
                </p>
              </div>
            </div>

            <p className="text-xs text-amber-400 bg-amber-950/30 px-3 py-2 rounded border border-amber-900/30">
              ⚠ Changes are drafted. Deploy to apply to production.
            </p>

            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                onClick={handleApplyChange}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmDialog(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
