/**
 * Migration 007: Admin Audit Logs
 * - Create admin_audit_logs table for settings change tracking
 * - Enforce request-scoped lifecycle per Law #2 (no global mutable state)
 * - Link audit entries to Vercel deployments
 * - Enable forensic analysis of administrative changes
 */

-- Create admin_audit_logs table
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),

  -- Change metadata
  section text not null check (section in ('payment', 'affiliate', 'b2b', 'b2c', 'logistics', 'shopify', 'marketplace', 'env')),
  field text not null,
  old_value text,
  new_value text,

  -- Admin & action info
  admin_email text not null,
  action text not null check (action in ('propose', 'approve', 'discard', 'deployed')),

  -- Deployment tracking
  deployment_id text,
  deployment_status text check (deployment_status in ('pending', 'building', 'ready', 'failed')),
  commit_hash text,

  -- Lifecycle timestamps
  created_at timestamp with time zone default now(),
  deployed_at timestamp with time zone
);

-- Create indexes for efficient queries
create index if not exists idx_admin_audit_logs_section on public.admin_audit_logs(section);
create index if not exists idx_admin_audit_logs_admin_email on public.admin_audit_logs(admin_email);
create index if not exists idx_admin_audit_logs_action on public.admin_audit_logs(action);
create index if not exists idx_admin_audit_logs_deployment_id on public.admin_audit_logs(deployment_id);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);

-- Add comments for documentation
comment on table public.admin_audit_logs is 'Immutable audit trail of administrative settings changes with deployment tracking';
comment on column public.admin_audit_logs.section is 'Settings section: payment, affiliate, b2b, b2c, logistics, shopify, marketplace, or env';
comment on column public.admin_audit_logs.field is 'Specific field within the section that was changed';
comment on column public.admin_audit_logs.old_value is 'Previous value as JSON string';
comment on column public.admin_audit_logs.new_value is 'New value as JSON string';
comment on column public.admin_audit_logs.admin_email is 'Email of admin who made the change';
comment on column public.admin_audit_logs.action is 'Action type: propose (draft), approve (committed), discard (rejected), or deployed (live)';
comment on column public.admin_audit_logs.deployment_id is 'Vercel deployment ID if change was deployed';
comment on column public.admin_audit_logs.deployment_status is 'Current deployment status: pending, building, ready, or failed';
comment on column public.admin_audit_logs.commit_hash is 'Git commit hash of the change';
comment on column public.admin_audit_logs.deployed_at is 'Timestamp when deployment completed successfully';
