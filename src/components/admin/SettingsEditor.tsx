'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { SettingsDiffViewer } from './SettingsDiffViewer';

interface SettingsEditorProps {
  onSettingsSaved?: () => void;
}

type SettingsSection = 'payment' | 'affiliate' | 'b2b' | 'b2c' | 'logistics' | 'shopify' | 'marketplace' | 'env';

/**
 * SettingsEditor - Admin interface for managing application configuration
 * Enables viewing, editing, and deploying settings changes with validation and audit trail
 */
export default function SettingsEditor({ onSettingsSaved }: SettingsEditorProps) {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('payment');
  const [selectedField, setSelectedField] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentSettings, setCurrentSettings] = useState<Record<string, any>>({});
  const [proposedChange, setProposedChange] = useState<{
    section: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  } | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    deploymentId?: string;
    deploymentUrl?: string;
    commitHash?: string;
    status?: string;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const deploymentPollRef = useRef<NodeJS.Timeout | null>(null);
  const deploymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current settings and fields
  useEffect(() => {
    fetchSettings();
  }, []);

  // Cleanup deployment poll on unmount
  useEffect(() => {
    return () => {
      if (deploymentPollRef.current) clearInterval(deploymentPollRef.current);
      if (deploymentTimeoutRef.current) clearTimeout(deploymentTimeoutRef.current);
    };
  }, []);

  /** Fetches current settings from the server */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setCurrentSettings(data.data?.settings || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  /** Gets all editable fields for a settings section */
  const getFieldsForSection = (section: SettingsSection): string[] => {
    const sectionData = currentSettings[section];
    if (!sectionData || typeof sectionData !== 'object') return [];
    return Object.keys(sectionData).filter(key => !key.startsWith('_'));
  };

  /** Retrieves current value for the selected field (supports nested paths) */
  const getCurrentValue = (): unknown => {
    if (!selectedSection || !selectedField) return null;
    const sectionData = currentSettings[selectedSection];
    if (!sectionData) return null;

    // Handle nested paths like "primary.fees.percentagePerTransaction"
    const parts = selectedField.split('.');
    let value: any = sectionData;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  };

  /** Infers the JavaScript type of a value for input validation */
  const inferType = (value: unknown): string => {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  };

  /** Formats a value for display in the UI (JSON stringified for objects) */
  const formatValueForDisplay = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  /** Parses user input string into the appropriate JavaScript type */
  const parseValue = (input: string, type: string): unknown => {
    if (type === 'number') return parseFloat(input) || 0;
    if (type === 'boolean') return input.toLowerCase() === 'true';
    if (type === 'array' || type === 'object') {
      try {
        return JSON.parse(input);
      } catch {
        return input;
      }
    }
    return input;
  };

  /** Submits a proposed setting change for review and deployment */
  const handlePropose = async () => {
    try {
      setError(null);
      const currentValue = getCurrentValue();
      const valueType = inferType(currentValue);
      const parsedNewValue = parseValue(newValue, valueType);

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          section: selectedSection,
          field: selectedField,
          oldValue: currentValue,
          newValue: parsedNewValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to propose change');
      }

      setProposedChange({
        section: selectedSection,
        field: selectedField,
        oldValue: currentValue,
        newValue: parsedNewValue,
      });
      setSuccess('Change proposed. Ready to approve and deploy.');
      setShowConfirmDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose change');
    }
  };

  /** Approves a proposed setting change and triggers deployment */
  const handleApprove = async () => {
    if (!proposedChange) return;

    try {
      setApproveLoading(true);
      setError(null);

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          section: proposedChange.section,
          field: proposedChange.field,
          oldValue: proposedChange.oldValue,
          newValue: proposedChange.newValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve change');
      }

      const result = await response.json();
      setDeploymentStatus(result.data);
      setSuccess('Change approved and deployment triggered!');
      setProposedChange(null);
      setNewValue('');
      setShowConfirmDialog(false);
      onSettingsSaved?.();

      // Poll for deployment status
      pollDeploymentStatus(result.data?.deploymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve change');
    } finally {
      setApproveLoading(false);
    }
  };

  /** Discards a proposed change without deployment */
  const handleDiscard = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discard',
          section: selectedSection,
          field: selectedField,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to discard change');
      }

      setProposedChange(null);
      setNewValue('');
      setSuccess('Draft change discarded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard change');
    }
  };

  /** Polls Vercel deployment status with 5-minute timeout and 2-second interval */
  const pollDeploymentStatus = (deploymentId: string | undefined) => {
    if (!deploymentId) return;

    // Clear any existing polls
    if (deploymentPollRef.current) clearInterval(deploymentPollRef.current);
    if (deploymentTimeoutRef.current) clearTimeout(deploymentTimeoutRef.current);

    // Set 5-minute timeout to stop polling if deployment never resolves
    deploymentTimeoutRef.current = setTimeout(() => {
      if (deploymentPollRef.current) {
        clearInterval(deploymentPollRef.current);
        setError('Deployment status check timeout. Please check Vercel dashboard.');
      }
    }, 5 * 60 * 1000);

    deploymentPollRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) return;

        const result = await response.json();
        const auditLog = result.data?.auditLog || [];
        const latestEntry = auditLog.find((entry: any) => entry.deploymentId === deploymentId);

        if (latestEntry) {
          setDeploymentStatus({
            deploymentId: latestEntry.deploymentId,
            deploymentUrl: latestEntry.deploymentUrl,
            commitHash: latestEntry.commitHash,
            status: latestEntry.deploymentStatus,
          });

          if (latestEntry.deploymentStatus === 'ready' || latestEntry.deploymentStatus === 'failed') {
            if (deploymentPollRef.current) clearInterval(deploymentPollRef.current);
            if (deploymentTimeoutRef.current) clearTimeout(deploymentTimeoutRef.current);
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);
  };

  const fields = getFieldsForSection(selectedSection);
  const currentValue = getCurrentValue();
  const valueType = inferType(currentValue);

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="rounded-lg border border-green-900/30 bg-green-950/20 p-4">
          <p className="text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Main editor form */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white">Edit Settings</h2>

        {/* Section selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Settings Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value as SettingsSection);
              setSelectedField('');
              setNewValue('');
              setProposedChange(null);
            }}
            className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white"
            aria-label="Select settings section"
          >
            <option value="payment">Payment Processing</option>
            <option value="affiliate">Affiliate & Commissions</option>
            <option value="b2b">B2B Tiers</option>
            <option value="b2c">B2C Segments</option>
            <option value="logistics">Logistics (3PL)</option>
            <option value="shopify">Shopify Extensions</option>
            <option value="marketplace">Marketplace Config</option>
            <option value="env">Environment</option>
          </select>
        </div>

        {/* Field selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Field
          </label>
          <select
            value={selectedField}
            onChange={(e) => {
              setSelectedField(e.target.value);
              setNewValue('');
            }}
            className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white"
            aria-label="Select setting field"
          >
            <option value="">-- Select a field --</option>
            {fields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>

        {/* Current value display */}
        {selectedField && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Value (read-only)
            </label>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 text-slate-300 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {formatValueForDisplay(currentValue)}
            </div>
            <p className="text-xs text-slate-500 mt-2">Type: {valueType}</p>
          </div>
        )}

        {/* New value input */}
        {selectedField && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Value
            </label>
            {valueType === 'boolean' ? (
              <select
                value={String(newValue).toLowerCase() === 'true' ? 'true' : 'false'}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white"
                aria-label="Boolean value selector"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Enter new ${valueType} value`}
                className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 font-mono"
                aria-label="New value input"
              />
            )}
          </div>
        )}

        {/* Action buttons */}
        {selectedField && (
          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              label={loading ? 'Proposing...' : 'Propose'}
              onClick={handlePropose}
              isDisabled={loading || !newValue}
            />
            <Button
              variant="ghost"
              label="Clear"
              onClick={() => {
                setNewValue('');
                setSelectedField('');
                setProposedChange(null);
              }}
            />
          </div>
        )}
      </Card>

      {/* Proposed change display with diff viewer */}
      {proposedChange && (
        <Card className="p-6 space-y-4 border border-blue-900/50 bg-blue-950/20">
          <h3 className="text-base font-semibold text-blue-300">Proposed Change</h3>

          <SettingsDiffViewer
            section={proposedChange.section}
            field={proposedChange.field}
            oldValue={proposedChange.oldValue}
            newValue={proposedChange.newValue}
          />

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              label={approveLoading ? 'Approving...' : 'Proceed to Approve'}
              onClick={() => setShowConfirmDialog(true)}
              isDisabled={approveLoading}
            />
            <Button
              variant="destructive"
              label="Discard"
              onClick={handleDiscard}
            />
          </div>
        </Card>
      )}

      {/* Deployment status display */}
      {deploymentStatus && (
        <Card className="p-6 space-y-3 border border-cyan-900/50 bg-cyan-950/20">
          <h3 className="text-base font-semibold text-cyan-300">Deployment Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={`font-mono ${
                deploymentStatus.status === 'ready' ? 'text-green-300' :
                deploymentStatus.status === 'failed' ? 'text-red-300' :
                'text-amber-300'
              }`}>
                {deploymentStatus.status || 'pending'}
              </span>
            </div>
            {deploymentStatus.deploymentId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Deployment ID:</span>
                <span className="font-mono text-slate-300 text-xs">{deploymentStatus.deploymentId}</span>
              </div>
            )}
            {deploymentStatus.commitHash && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Commit Hash:</span>
                <span className="font-mono text-slate-300 text-xs">{deploymentStatus.commitHash.slice(0, 7)}</span>
              </div>
            )}
            {deploymentStatus.deploymentUrl && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">URL:</span>
                <a
                  href={deploymentStatus.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-xs"
                >
                  View Deployment
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Confirmation dialog */}
      {showConfirmDialog && proposedChange && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-labelledby="confirm-title">
          <Card className="max-w-md w-full mx-4 p-6 space-y-4">
            <h3 id="confirm-title" className="text-lg font-semibold text-white">
              Approve Setting Change?
            </h3>
            <p className="text-slate-400 text-sm">
              This will commit the change to git and trigger a deployment to production.
            </p>

            <SettingsDiffViewer
              section={proposedChange.section}
              field={proposedChange.field}
              oldValue={proposedChange.oldValue}
              newValue={proposedChange.newValue}
              compact
            />

            <p className="text-xs text-amber-300 bg-amber-950/30 px-3 py-2 rounded border border-amber-900/30">
              ⚠ This action cannot be undone. Ensure the change is correct before approving.
            </p>

            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                label={approveLoading ? 'Approving...' : 'Approve & Deploy'}
                onClick={handleApprove}
                isDisabled={approveLoading}
                className="flex-1"
              />
              <Button
                variant="ghost"
                label="Cancel"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
