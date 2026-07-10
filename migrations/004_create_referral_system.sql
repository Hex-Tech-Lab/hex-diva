-- Hex-Diva Referral System & Commission Management
-- Tables for referral tracking, commission calculation, and payout management

-- Create referral tracking table
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'signed_up', 'first_purchase', 'active')),
  referral_token text unique not null,
  referral_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create referral clicks tracking (for analytics)
create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  session_id text,
  ip_address text,
  user_agent text,
  clicked_at timestamp with time zone default now()
);

-- Create commissions table
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  order_total decimal(10, 2) not null,
  commission_rate decimal(3, 2) not null,
  commission_amount decimal(10, 2) not null,
  tier text default 'bronze' check (tier in ('bronze', 'silver', 'gold')),
  status text default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create commission payouts table
create table if not exists public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  payout_period_start date not null,
  payout_period_end date not null,
  total_amount decimal(10, 2) not null,
  status text default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  stripe_transfer_id text,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  paid_at timestamp with time zone
);

-- Create referral statistics table
create table if not exists public.referral_stats (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null unique references public.users(id) on delete cascade,
  total_referrals integer default 0,
  successful_signups integer default 0,
  total_clicks integer default 0,
  conversion_rate decimal(5, 2) default 0,
  total_commission_earned decimal(10, 2) default 0,
  total_commission_paid decimal(10, 2) default 0,
  current_tier text default 'bronze',
  lifetime_volume decimal(12, 2) default 0,
  last_payout_date timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Create indexes for referrals
create index if not exists idx_referrals_referrer_id on public.referrals(referrer_id);
create index if not exists idx_referrals_referred_user_id on public.referrals(referred_user_id);
create index if not exists idx_referrals_status on public.referrals(status);
create index if not exists idx_referrals_token on public.referrals(referral_token);
create index if not exists idx_referral_clicks_referral_id on public.referral_clicks(referral_id);
create index if not exists idx_referral_clicks_session_id on public.referral_clicks(session_id);

-- Create indexes for commissions
create index if not exists idx_commissions_referrer_id on public.commissions(referrer_id);
create index if not exists idx_commissions_order_id on public.commissions(order_id);
create index if not exists idx_commissions_referral_id on public.commissions(referral_id);
create index if not exists idx_commissions_status on public.commissions(status);
create index if not exists idx_commissions_tier on public.commissions(tier);
create index if not exists idx_commission_payouts_referrer_id on public.commission_payouts(referrer_id);
create index if not exists idx_commission_payouts_status on public.commission_payouts(status);

-- Enable RLS
alter table public.referrals enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.commissions enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.referral_stats enable row level security;

-- Create RLS policies for referrals
create policy if not exists "Users can read their own referrals"
  on public.referrals
  for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

create policy if not exists "Users can read their own commissions"
  on public.commissions
  for select
  using (auth.uid() = referrer_id);

create policy if not exists "Users can read their own payouts"
  on public.commission_payouts
  for select
  using (auth.uid() = referrer_id);

create policy if not exists "Users can read their own stats"
  on public.referral_stats
  for select
  using (auth.uid() = referrer_id);

create policy if not exists "Referral clicks are insertable"
  on public.referral_clicks
  for insert
  with check (true);
