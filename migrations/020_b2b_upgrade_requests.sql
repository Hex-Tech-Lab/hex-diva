-- Migration 020: B2B Tier Upgrade Request Flow
-- Enables users to request upgrade from B2C to B2B tier with business verification

-- Create b2b_upgrade_requests table
CREATE TABLE IF NOT EXISTS public.b2b_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  business_name text not null,
  -- tax_id stored as plain text (accepted tradeoff, not yet hardened):
  -- this repo has no column-level encryption/redaction convention in any prior
  -- migration (checked 001-018), and app-layer admin access is already gated by
  -- verifyAdminAccess()/ADMIN_EMAIL_WHITELIST (src/lib/admin/auth.ts), with RLS
  -- restricting reads to the owning user or an admin-tier user (see policies below).
  -- Before this table holds real business tax IDs in production, revisit:
  -- pgcrypto column encryption (pgp_sym_encrypt/decrypt) or moving tax_id to a
  -- separate table with its own tighter RLS + audit trail.
  tax_id text not null,
  business_address text,
  credit_check_consented boolean default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index idx_b2b_upgrade_requests_user on public.b2b_upgrade_requests(user_id);
create index idx_b2b_upgrade_requests_status on public.b2b_upgrade_requests(status);
create index idx_b2b_upgrade_requests_created_at on public.b2b_upgrade_requests(created_at desc);

-- Enable RLS
alter table public.b2b_upgrade_requests enable row level security;

-- RLS Policies
-- Users can read their own upgrade requests
create policy "Users can read own upgrade requests"
  on public.b2b_upgrade_requests
  for select
  using (auth.uid() = user_id);

-- Admin can read all upgrade requests
-- Matches the tier='admin' EXISTS convention used in migs 006/010/019, rather than
-- a bare `using (true)` that would let any authenticated row-owner-unrelated caller through.
create policy "Admin can read all upgrade requests"
  on public.b2b_upgrade_requests
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Users can insert their own requests
create policy "Users can insert own upgrade requests"
  on public.b2b_upgrade_requests
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own pending OR rejected requests. The unique constraint
-- on user_id means a rejected user has no way to submit a *new* row, so the
-- reapply path is editing the existing one back to 'pending' -- the with-check
-- pins the resulting status to 'pending' so a user can never self-approve or
-- resubmit into any other state.
create policy "Users can update own pending or rejected requests"
  on public.b2b_upgrade_requests
  for update
  using (auth.uid() = user_id and status in ('pending', 'rejected'))
  with check (auth.uid() = user_id and status = 'pending');

-- Admin can update any request (reviewed_by, status, reviewed_at, rejection_reason)
create policy "Admin can update all requests"
  on public.b2b_upgrade_requests
  for update
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Clear stale reviewer fields whenever a non-admin resubmission flips a
-- rejected request back to 'pending' -- otherwise the old rejection_reason/
-- reviewed_by/reviewed_at would linger and misrepresent the new submission
-- as already reviewed.
create or replace function public.reset_b2b_review_fields_on_resubmit()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'rejected' and new.status = 'pending' then
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists b2b_reset_review_fields_on_resubmit on public.b2b_upgrade_requests;
create trigger b2b_reset_review_fields_on_resubmit
  before update on public.b2b_upgrade_requests
  for each row
  execute function public.reset_b2b_review_fields_on_resubmit();
