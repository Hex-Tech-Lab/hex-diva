-- Migration 013: Settings Hardening
-- 1. Audit provenance: approved_by (approver identity; admin_email keeps the proposer)
--    and failure_reason (persisted instead of console-only warnings)
-- 2. DISCARDED audit status (discards are no longer recorded as FAILED)
-- 3. 'system' section allowed in both section CHECK constraints
--    (settingsContracts.ts defines a system section; the DB previously rejected it)

-- 1. Provenance columns on settings_audit
ALTER TABLE public.settings_audit ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE public.settings_audit ADD COLUMN IF NOT EXISTS failure_reason text;

-- 2. Extend status CHECK to include DISCARDED
ALTER TABLE public.settings_audit DROP CONSTRAINT IF EXISTS settings_audit_status_check;
ALTER TABLE public.settings_audit ADD CONSTRAINT settings_audit_status_check
  CHECK (status in ('DRAFT', 'APPROVED', 'APPLIED', 'FAILED', 'DISCARDED'));

-- 3. Extend both section CHECK constraints to include 'system'
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_section_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_section_check
  CHECK (section in ('payment', 'affiliate', 'b2b', 'b2c', 'logistics', 'shopify', 'marketplace', 'env', 'system'));

ALTER TABLE public.settings_audit DROP CONSTRAINT IF EXISTS settings_audit_section_check;
ALTER TABLE public.settings_audit ADD CONSTRAINT settings_audit_section_check
  CHECK (section in ('payment', 'affiliate', 'b2b', 'b2c', 'logistics', 'shopify', 'marketplace', 'env', 'system'));
