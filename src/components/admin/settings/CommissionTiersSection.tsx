'use client';

import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Card } from '@astryxdesign/core/Card';

interface CommissionTier {
  name: string;
  minMonthlyRevenue: number;
  commissionType: string;
  commissionValue: number | null;
  payoutFrequency: string;
}

interface CommissionTiersSectionProps {
  settings: {
    settings: {
      affiliate: {
        commissioning: {
          defaults: {
            type: string;
            value: number;
            minimumPayout: number;
          };
          tiers: CommissionTier[];
        };
        payoutRail: {
          method: string;
          frequency: string;
          payoutDay: string;
          minimumPayoutThreshold: number;
        };
      };
    };
    draftChanges: Record<string, any>;
  };
  onSave: () => void;
  saving: boolean;
}

export default function CommissionTiersSection({
  settings,
  onSave,
  saving,
}: CommissionTiersSectionProps) {
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    tierIndex: number;
    field: string;
    oldValue: any;
    newValue: any;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const tiers = settings.settings.affiliate.commissioning.tiers;
  const defaults = settings.settings.affiliate.commissioning.defaults;
  const payoutRail = settings.settings.affiliate.payoutRail;

  const validateTier = (values: Record<string, any>) => {
    const errors: string[] = [];

    if (values.commissionValue !== undefined) {
      if (values.commissionValue < 0 || values.commissionValue > 100) {
        errors.push('Commission must be between 0 and 100%');
      }
    }

    if (values.minMonthlyRevenue !== undefined) {
      if (values.minMonthlyRevenue < 0) {
        errors.push('Minimum monthly revenue cannot be negative');
      }
    }

    return errors;
  };

  const handleEditTier = (tierIndex: number, tier: CommissionTier) => {
    setEditingTier(tierIndex);
    setEditValues({
      commissionValue: tier.commissionValue || 0,
      minMonthlyRevenue: tier.minMonthlyRevenue,
    });
    setValidationErrors([]);
  };

  const handleConfirmChange = (
    tierIndex: number,
    field: string,
    oldValue: any,
    newValue: any
  ) => {
    const errors = validateTier({ [field]: newValue });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setConfirmDialog({
      tierIndex,
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
          section: 'affiliate',
          field: `tier_${confirmDialog.tierIndex}.${confirmDialog.field}`,
          oldValue: confirmDialog.oldValue,
          newValue: confirmDialog.newValue,
        }),
      });

      if (response.ok) {
        await response.json();
        setSuccessMessage(
          `Tier ${tiers[confirmDialog.tierIndex]?.name} updated: ${confirmDialog.field}`
        );
        setTimeout(() => setSuccessMessage(''), 3000);
        setConfirmDialog(null);
        setEditingTier(null);
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

      {/* Defaults Card */}
      <Card className="p-6 space-y-4 bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-lg font-semibold text-white">Commission Defaults</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Default Type</p>
            <p className="text-white font-mono">{defaults.type}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Default Value</p>
            <p className="text-white font-mono">{defaults.value}%</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Minimum Payout</p>
            <p className="text-white font-mono">{defaults.minimumPayout} EGP</p>
          </div>
        </div>
      </Card>

      {/* Payout Rail Card */}
      <Card className="p-6 space-y-4 bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-lg font-semibold text-white">Payout Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Payout Method</p>
            <p className="text-white font-mono text-sm">{payoutRail.method}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Frequency</p>
            <p className="text-white font-mono text-sm">{payoutRail.frequency}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Payout Day</p>
            <p className="text-white font-mono text-sm">{payoutRail.payoutDay}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">Threshold</p>
            <p className="text-white font-mono text-sm">
              {payoutRail.minimumPayoutThreshold} EGP
            </p>
          </div>
        </div>
      </Card>

      {/* Tiers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Commission Tiers</h3>
        {tiers.map((tier, index) => (
          <Card key={index} className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-white">{tier.name}</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Min. monthly revenue:{' '}
                  <span className="text-slate-300 font-mono">
                    {tier.minMonthlyRevenue.toLocaleString()} EGP
                  </span>
                </p>
              </div>
              {editingTier !== index && (
                <Button
                  variant="secondary"
                  size="sm"
                  label="Edit"
                  onClick={() => handleEditTier(index, tier)}
                />
              )}
            </div>

            {/* Content - View or Edit mode */}
            {editingTier === index ? (
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                {validationErrors.length > 0 && (
                  <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-3">
                    <ul className="text-red-300 text-sm space-y-1">
                      {validationErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <TextInput
                      label="Commission Rate (%)"
                      value={String(editValues.commissionValue ?? 0)}
                      onChange={(value) =>
                        setEditValues({
                          ...editValues,
                          commissionValue: parseFloat(value),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {tier.commissionValue}%
                    </p>
                  </div>
                  <div>
                    <TextInput
                      label="Min. Monthly Revenue (EGP)"
                      value={String(editValues.minMonthlyRevenue ?? 0)}
                      onChange={(value) =>
                        setEditValues({
                          ...editValues,
                          minMonthlyRevenue: parseInt(value, 10),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {tier.minMonthlyRevenue.toLocaleString()} EGP
                    </p>
                  </div>
                </div>

                {/* Edit actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    label="Propose Changes"
                    onClick={() =>
                      handleConfirmChange(
                        index,
                        'commissionValue',
                        tier.commissionValue,
                        editValues.commissionValue
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Cancel"
                    onClick={() => {
                      setEditingTier(null);
                      setValidationErrors([]);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-400">Commission</p>
                    <p className="text-white font-mono text-lg">
                      {tier.commissionValue || 'Custom'}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-400">Type</p>
                    <p className="text-white font-mono text-sm">{tier.commissionType}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-400">Payout Frequency</p>
                    <p className="text-white font-mono text-sm">{tier.payoutFrequency}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-400">Min. Revenue</p>
                    <p className="text-white font-mono text-sm">
                      {tier.minMonthlyRevenue.toLocaleString()} EGP
                    </p>
                  </div>
                </div>
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
              <h3 className="text-lg font-semibold text-white">Confirm Tier Change</h3>
              <p className="text-slate-400 text-sm mt-1">
                Update {tiers[confirmDialog.tierIndex]?.name} → {confirmDialog.field}
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
                label={saving ? 'Saving...' : 'Confirm'}
                onClick={handleApplyChange}
                isDisabled={saving}
                className="flex-1"
              />
              <Button
                variant="ghost"
                label="Cancel"
                onClick={() => setConfirmDialog(null)}
                className="flex-1"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
