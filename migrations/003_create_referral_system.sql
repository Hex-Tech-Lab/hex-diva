-- Referral & Commission System Tables

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete set null,
  referral_code text not null,
  status text default 'pending' check (status in ('pending', 'active', 'converted', 'expired', 'cancelled')),
  clicked_at timestamp with time zone,
  converted_at timestamp with time zone,
  conversion_order_id uuid references public.orders(id) on delete set null,
  conversion_amount decimal(10, 2),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_total decimal(10, 2) not null,
  commission_rate decimal(3, 2) not null,
  commission_amount decimal(10, 2) not null,
  tier text default 'bronze' check (tier in ('bronze', 'silver', 'gold')),
  status text default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled', 'refunded')),
  payout_id uuid references public.payouts(id) on delete set null,
  created_at timestamp with time zone default now(),
  paid_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  amount decimal(10, 2) not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'refunded')),
  period_start date not null,
  period_end date not null,
  payment_method text,
  stripe_payout_id text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

create table if not exists public.referral_stats (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null unique references public.users(id) on delete cascade,
  total_referrals integer default 0,
  active_referrals integer default 0,
  total_conversions integer default 0,
  total_revenue decimal(12, 2) default 0,
  total_commission_earned decimal(12, 2) default 0,
  pending_commission decimal(12, 2) default 0,
  current_tier text default 'bronze' check (current_tier in ('bronze', 'silver', 'gold')),
  current_month_revenue decimal(12, 2) default 0,
  current_month_commission decimal(12, 2) default 0,
  last_payout_date timestamp with time zone,
  last_calculated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_referrals_referrer_id on public.referrals(referrer_id);
create index if not exists idx_referrals_status on public.referrals(status);
create index if not exists idx_commissions_referrer_id on public.commissions(referrer_id);
create index if not exists idx_commissions_status on public.commissions(status);
create index if not exists idx_payouts_referrer_id on public.payouts(referrer_id);

alter table public.referrals enable row level security;
alter table public.commissions enable row level security;
alter table public.payouts enable row level security;
alter table public.referral_stats enable row level security;

create policy if not exists "Users read own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

create policy if not exists "Users read own commissions"
  on public.commissions for select
  using (auth.uid() = referrer_id);

create policy if not exists "Users read own payouts"
  on public.payouts for select
  using (auth.uid() = referrer_id);

create policy if not exists "Users read own stats"
  on public.referral_stats for select
  using (auth.uid() = referrer_id);

create or replace function public.update_referral_stats(p_referrer_id uuid)
returns void as $$
declare
  v_total_referrals integer;
  v_active_referrals integer;
  v_total_conversions integer;
  v_total_revenue decimal;
  v_total_commission decimal;
  v_pending_commission decimal;
  v_current_tier text;
begin
  select count(*)::integer, count(*) filter (where status = 'active')::integer,
    count(*) filter (where status = 'converted')::integer, coalesce(sum(conversion_amount), 0)
  into v_total_referrals, v_active_referrals, v_total_conversions, v_total_revenue
  from public.referrals where referrer_id = p_referrer_id;

  select coalesce(sum(commission_amount), 0), coalesce(sum(commission_amount) filter (where status = 'pending'), 0)
  into v_total_commission, v_pending_commission
  from public.commissions where referrer_id = p_referrer_id;

  v_current_tier := case
    when v_total_conversions >= 51 then 'gold'
    when v_total_conversions >= 11 then 'silver'
    else 'bronze'
  end;

  insert into public.referral_stats (referrer_id, total_referrals, active_referrals, total_conversions,
    total_revenue, total_commission_earned, pending_commission, current_tier, last_calculated_at)
  values (p_referrer_id, v_total_referrals, v_active_referrals, v_total_conversions, v_total_revenue,
    v_total_commission, v_pending_commission, v_current_tier, now())
  on conflict (referrer_id) do update set
    total_referrals = excluded.total_referrals,
    active_referrals = excluded.active_referrals,
    total_conversions = excluded.total_conversions,
    total_revenue = excluded.total_revenue,
    total_commission_earned = excluded.total_commission_earned,
    pending_commission = excluded.pending_commission,
    current_tier = excluded.current_tier,
    last_calculated_at = excluded.last_calculated_at,
    updated_at = now();
end;
$$ language plpgsql security definer;

create or replace function public.trigger_update_referral_stats()
returns trigger as $$
begin
  perform public.update_referral_stats(new.referrer_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists referral_update_stats on public.referrals;
create trigger referral_update_stats after insert or update on public.referrals for each row execute function public.trigger_update_referral_stats();

drop trigger if exists commission_update_stats on public.commissions;
create trigger commission_update_stats after insert or update on public.commissions for each row execute function public.trigger_update_referral_stats();
