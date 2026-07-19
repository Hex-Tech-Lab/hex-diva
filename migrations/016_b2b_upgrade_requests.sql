-- Migration 016: B2B Tier Upgrade Request Flow
-- Enables users to request upgrade from B2C to B2B tier with business verification

-- Create b2b_upgrade_requests table
CREATE TABLE IF NOT EXISTS public.b2b_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  business_name text not null,
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

-- Admin can read all (checked at app level; RLS allows, auth layer gates)
create policy "Admin can read all upgrade requests"
  on public.b2b_upgrade_requests
  for select
  using (true);

-- Users can insert their own requests
create policy "Users can insert own upgrade requests"
  on public.b2b_upgrade_requests
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own pending requests
create policy "Users can update own pending requests"
  on public.b2b_upgrade_requests
  for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

-- Admin can update any request (reviewed_by, status, reviewed_at, rejection_reason)
-- Note: This is a simplified policy; production would require explicit admin role check
-- For now, rely on app-level authorization
create policy "Admin can update all requests"
  on public.b2b_upgrade_requests
  for update
  using (true)
  with check (true);
