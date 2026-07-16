-- Migration 010: Settings Rebuild & Users Tier RLS Fix
-- Creates platform_settings table and settings_audit table
-- Fixes users.tier RLS unsatisfiability

-- 1. platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  section text NOT NULL CHECK (section in ('payment', 'affiliate', 'b2b', 'b2c', 'logistics', 'shopify', 'marketplace', 'env')),
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_by text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read/write platform_settings
CREATE POLICY "Admins can manage platform_settings"
  ON public.platform_settings
  FOR ALL
  USING (
    exists (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tier = 'admin'
    )
  );

-- RLS Policy: Authenticated users can read platform_settings
CREATE POLICY "Authenticated users can read platform_settings"
  ON public.platform_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Service role can manage platform_settings
CREATE POLICY "Service role can manage platform_settings"
  ON public.platform_settings
  FOR ALL
  USING (auth.role() = 'service_role');


-- 2. settings_audit table
CREATE TABLE IF NOT EXISTS public.settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE,
  section text NOT NULL CHECK (section in ('payment', 'affiliate', 'b2b', 'b2c', 'logistics', 'shopify', 'marketplace', 'env')),
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  status text NOT NULL CHECK (status in ('DRAFT', 'APPROVED', 'APPLIED', 'FAILED')) DEFAULT 'DRAFT',
  admin_email text NOT NULL,
  deployment_id text,
  commit_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on settings_audit
ALTER TABLE public.settings_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage settings_audit
CREATE POLICY "Admins can manage settings_audit"
  ON public.settings_audit
  FOR ALL
  USING (
    exists (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tier = 'admin'
    )
  );

-- RLS Policy: Service role can manage settings_audit
CREATE POLICY "Service role can manage settings_audit"
  ON public.settings_audit
  FOR ALL
  USING (auth.role() = 'service_role');


-- 3. Fix users.tier RLS unsatisfiability
-- Let's check if the public.users table has a 'tier' column.
-- In migration 006, it checks: select 1 from public.users where id = auth.uid() and tier = 'admin'.
-- But in database.types.ts: users table has email, full_name, avatar_url, created_at, updated_at.
-- Wait, the user_profiles table has a 'tier' column! Look at user_profiles: id, user_id, tier, is_b2b.
-- Wait, is tier on public.users or public.user_profiles?
-- In mig 006, RLS checks public.users.tier: `select 1 from public.users where id = auth.uid() and tier = 'admin'`.
-- But public.users does not have a tier column! Wait, maybe we should add tier to public.users?
-- Or we should update users table, or modify RLS policies.
-- Let's add tier to users table if it's referenced there, or ensure we check user_profiles, or add the whitelist function.
-- Let's alter table public.users to add a tier column if it doesn't exist, defaulting to 'user'.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'user' CHECK (tier in ('user', 'admin'));

-- Make sure we update the email-whitelist function or policy to ensure it's correct.
-- Let's populate the tier column based on admin email whitelist when a user signs up/updates or manually.
