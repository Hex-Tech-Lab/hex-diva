-- Migration 019: Modular Fulfillment Engine
--
-- Mirrors the payment-provider architecture (payment_providers table,
-- provider-agnostic order columns) for logistics/fulfillment: a
-- fulfillment_providers table for cascading/fallback selection, plus
-- governorate-level coverage so routing can prefer whichever provider is
-- actually capable in a given destination -- some couriers are strong in
-- Greater Cairo and weak in Upper Egypt, or vice versa, and this varies
-- by provider in ways that must be confirmed per-provider, not assumed.
--
-- IMPORTANT: This migration seeds real, factual reference data (Egypt's
-- 27 governorates -- static geography, not a business claim) and the
-- fulfillment_providers row for Bosta (the one provider with confirmed,
-- verified individual/National-ID-only onboarding -- see
-- docs/ROADMAP_MULTI_PROVIDER_WAVES.md). It does NOT seed any
-- provider/governorate coverage data, because no such data has been
-- verified yet for any provider. That table starts empty and is
-- populated only from confirmed sources (a provider's own API where one
-- exists, e.g. Bosta exposes a cities/zones lookup; direct confirmation
-- calls for others) -- never guessed.

create table if not exists public.egypt_governorates (
  id serial primary key,
  code text not null unique,
  name_en text not null,
  name_ar text not null,
  region text not null check (region in ('greater_cairo', 'delta', 'canal', 'upper_egypt', 'red_sea_sinai', 'western_desert', 'alexandria'))
);

insert into public.egypt_governorates (code, name_en, name_ar, region) values
  ('CAI', 'Cairo', 'القاهرة', 'greater_cairo'),
  ('GIZ', 'Giza', 'الجيزة', 'greater_cairo'),
  ('QLY', 'Qalyubia', 'القليوبية', 'greater_cairo'),
  ('ALX', 'Alexandria', 'الإسكندرية', 'alexandria'),
  ('PSD', 'Port Said', 'بورسعيد', 'canal'),
  ('SUZ', 'Suez', 'السويس', 'canal'),
  ('ISM', 'Ismailia', 'الإسماعيلية', 'canal'),
  ('DKH', 'Dakahlia', 'الدقهلية', 'delta'),
  ('DAM', 'Damietta', 'دمياط', 'delta'),
  ('SHR', 'Sharqia', 'الشرقية', 'delta'),
  ('GHR', 'Gharbia', 'الغربية', 'delta'),
  ('KFS', 'Kafr El Sheikh', 'كفر الشيخ', 'delta'),
  ('MNF', 'Monufia', 'المنوفية', 'delta'),
  ('BHR', 'Beheira', 'البحيرة', 'delta'),
  ('FYM', 'Faiyum', 'الفيوم', 'upper_egypt'),
  ('BNS', 'Beni Suef', 'بني سويف', 'upper_egypt'),
  ('MNY', 'Minya', 'المنيا', 'upper_egypt'),
  ('AST', 'Asyut', 'أسيوط', 'upper_egypt'),
  ('SHG', 'Sohag', 'سوهاج', 'upper_egypt'),
  ('QNA', 'Qena', 'قنا', 'upper_egypt'),
  ('LXR', 'Luxor', 'الأقصر', 'upper_egypt'),
  ('ASW', 'Aswan', 'أسوان', 'upper_egypt'),
  ('RSA', 'Red Sea', 'البحر الأحمر', 'red_sea_sinai'),
  ('NVL', 'New Valley', 'الوادي الجديد', 'western_desert'),
  ('MTR', 'Matrouh', 'مطروح', 'western_desert'),
  ('NSI', 'North Sinai', 'شمال سيناء', 'red_sea_sinai'),
  ('SSI', 'South Sinai', 'جنوب سيناء', 'red_sea_sinai')
on conflict (code) do nothing;

-- Mirrors payment_providers (docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md)
create table if not exists public.fulfillment_providers (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null unique check (provider_id in (
    'bosta', 'turuq', 'flextock', 'khazenly', 'presto', 'fincart', 'oto'
  )),
  provider_type text not null check (provider_type in ('courier', 'warehouse_3pl', 'aggregator')),
  provider_name text not null,

  config jsonb not null default '{}'::jsonb,
  is_enabled boolean default false,
  is_test_mode boolean default false,

  -- Founder-eligibility status, tracked explicitly so the selector (and
  -- anyone reading this table) never has to guess whether a provider is
  -- actually usable pre-incorporation.
  eligibility_status text not null default 'unconfirmed' check (eligibility_status in (
    'individual_confirmed',   -- verified: works with National ID / Freelance Certificate only
    'incorporation_required', -- verified: requires Commercial Register / legal entity
    'unconfirmed'             -- not yet verified either way
  )),
  eligibility_notes text,
  eligibility_confirmed_at timestamp with time zone,

  priority int not null default 999,

  health_status text default 'unknown' check (health_status in ('healthy', 'degraded', 'down', 'unknown')),
  health_checked_at timestamp with time zone,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_fulfillment_providers_enabled_priority
  on public.fulfillment_providers(is_enabled, priority) where is_enabled = true;

-- Seed only the one provider with confirmed eligibility (see
-- docs/ROADMAP_MULTI_PROVIDER_WAVES.md -- Bosta's own support docs
-- confirm National-ID-only onboarding for individuals in Egypt).
-- Disabled by default until PAYTABS-style config (API key) is actually
-- provisioned -- same dormant-until-configured pattern as every other
-- provider in this codebase.
insert into public.fulfillment_providers (provider_id, provider_type, provider_name, priority, eligibility_status, eligibility_notes, eligibility_confirmed_at, is_enabled)
values (
  'bosta',
  'courier',
  'Bosta',
  1,
  'individual_confirmed',
  'Confirmed via Bosta''s own Freshdesk support article: individual sellers in Egypt need only a National ID photo, no Commercial Register or Tax Card. See docs/ROADMAP_MULTI_PROVIDER_WAVES.md.',
  now(),
  false
)
on conflict (provider_id) do nothing;

-- Seed the other researched candidates as rows with eligibility_status
-- left at its default 'unconfirmed' -- deliberately not marking them
-- individual_confirmed or incorporation_required without a direct
-- confirmation. Flextock is the one exception: its own Privacy Policy
-- confirms legal entity documents are collected, so that's marked
-- incorporation_required rather than unconfirmed.
insert into public.fulfillment_providers (provider_id, provider_type, provider_name, priority, eligibility_status, eligibility_notes, is_enabled)
values
  ('turuq', 'warehouse_3pl', 'Turuq', 10, 'unconfirmed', 'Pay-per-delivery pricing confirmed (lighter commercial commitment than monthly warehousing contracts), but individual-vs-entity onboarding not publicly documented. Needs direct confirmation call. See docs/3PL_PROVIDER_DECISION.md.', false),
  ('flextock', 'warehouse_3pl', 'Flextock', 50, 'incorporation_required', 'Confirmed via Flextock''s own Privacy Policy: collects "company name, legal entity documents" during onboarding. See docs/3PL_PROVIDER_DECISION.md.', false),
  ('khazenly', 'warehouse_3pl', 'Khazenly', 51, 'unconfirmed', 'Same commercial model as Flextock (monthly warehousing contracts) -- likely incorporation_required by structural inference, but not directly confirmed. See docs/3PL_PROVIDER_DECISION.md.', false),
  ('presto', 'warehouse_3pl', 'Presto Services', 20, 'unconfirmed', 'LinkedIn company description states they serve "individuals in Egypt" -- marketing copy, not a KYC document. Needs direct confirmation call. See docs/3PL_PROVIDER_DECISION.md.', false),
  ('fincart', 'aggregator', 'Fincart', 30, 'unconfirmed', 'No public KYC/eligibility documentation found. Sales-led "Request a Call" onboarding. See docs/ROADMAP_MULTI_PROVIDER_WAVES.md.', false),
  ('oto', 'aggregator', 'OTO', 31, 'unconfirmed', 'Confirmed to accept a Freelance Certificate as an alternative to Commercial Registration (real paperwork, lighter than incorporation). Egypt-origin domestic/international shipping parity vs KSA/UAE not confirmed. See docs/ROADMAP_MULTI_PROVIDER_WAVES.md.', false)
on conflict (provider_id) do nothing;

-- Provider coverage by governorate. Starts completely empty -- see the
-- migration header comment. A provider with zero rows here is treated by
-- the selector as "coverage unknown", not "no coverage" and not
-- "nationwide" -- the application layer must not assume either extreme
-- from an absence of data.
create table if not exists public.fulfillment_provider_coverage (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.fulfillment_providers(provider_id) on delete cascade,
  governorate_id int not null references public.egypt_governorates(id) on delete cascade,

  is_covered boolean not null,
  avg_delivery_days numeric(3, 1),
  cod_supported boolean default true,
  notes text,

  -- How this coverage fact was established -- required, so nobody can
  -- silently insert a guess. 'provider_api' for providers like Bosta
  -- that expose a live cities/zones lookup; 'confirmed_direct' for a
  -- support/sales call; never 'assumed'.
  source text not null check (source in ('provider_api', 'confirmed_direct', 'order_history')),
  verified_at timestamp with time zone not null default now(),

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(provider_id, governorate_id)
);

create index if not exists idx_fulfillment_coverage_provider on public.fulfillment_provider_coverage(provider_id);
create index if not exists idx_fulfillment_coverage_governorate on public.fulfillment_provider_coverage(governorate_id);

-- Shipments -- provider-agnostic, same pattern as orders.payment_provider
-- / provider_transaction_ref.
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,

  fulfillment_provider text not null references public.fulfillment_providers(provider_id),
  provider_shipment_ref text,

  destination_governorate_id int references public.egypt_governorates(id),

  status text not null default 'pending' check (status in (
    'pending', 'created', 'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'failed_delivery', 'returned', 'cancelled'
  )),

  cod_amount decimal(10, 2),
  cod_collected_at timestamp with time zone,

  tracking_url text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_shipments_provider_ref on public.shipments(fulfillment_provider, provider_shipment_ref);
create index if not exists idx_shipments_status on public.shipments(status);

alter table public.shipments enable row level security;

create policy "Users can read their own shipments"
  on public.shipments
  for select
  using (exists (select 1 from public.orders where orders.id = shipments.order_id and orders.user_id = auth.uid()));

-- Writes are server-only (service_role), same reasoning as orders_audit:
-- shipment status is provider/webhook-driven, not user-writable.
alter table public.egypt_governorates enable row level security;
create policy "Governorates readable by everyone"
  on public.egypt_governorates for select using (true);

alter table public.fulfillment_providers enable row level security;
create policy "Fulfillment providers readable by everyone"
  on public.fulfillment_providers for select using (true);

alter table public.fulfillment_provider_coverage enable row level security;
create policy "Fulfillment coverage readable by everyone"
  on public.fulfillment_provider_coverage for select using (true);

-- Allow 'bosta' in webhook_events.provider, same reasoning as migration
-- 018's 'paytabs' addition -- the Bosta webhook needs the same
-- idempotency protection as every other provider webhook.
alter table public.webhook_events drop constraint if exists webhook_events_provider_check;

alter table public.webhook_events add constraint webhook_events_provider_check
  check (provider in ('shopify', 'uppromote', 'orders', 'process-order', 'stripe', 'paytabs', 'bosta'));

-- addresses.state is free text (migration 001) with no reliable mapping
-- to the governorate codes seeded above -- fuzzy string-matching "state"
-- against governorate names would be exactly the kind of guessed
-- capability this system is built to avoid. Adding a proper nullable FK
-- so a future address form can capture it directly (a picker over
-- egypt_governorates, not free text) rather than inferring it after the
-- fact. NOT backfilled -- existing addresses have no governorate until
-- the user/admin sets one.
alter table public.addresses add column if not exists governorate_id int references public.egypt_governorates(id);
