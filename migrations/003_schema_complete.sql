-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- Create collections table (Shopify-aligned naming)
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  shopify_id text unique,
  title text not null,
  handle text unique not null,
  description text,
  image_url text,
  position integer,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create product_collections junction table
create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  sort_order integer,
  created_at timestamp with time zone default now(),
  unique(product_id, collection_id)
);

-- Add enrichment columns to products table
alter table public.products add column if not exists supplier_cost decimal(10, 2);
alter table public.products add column if not exists gross_margin_percent decimal(5, 2);
alter table public.products add column if not exists supplier_name text;
alter table public.products add column if not exists b2b_bronze_price decimal(10, 2);
alter table public.products add column if not exists b2b_silver_price decimal(10, 2);
alter table public.products add column if not exists b2b_gold_price decimal(10, 2);
alter table public.products add column if not exists trending_on_tiktok boolean default false;
alter table public.products add column if not exists trending_on_instagram boolean default false;
alter table public.products add column if not exists viral_score decimal(4, 2);

-- Create product variants table for detailed variant tracking
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  shopify_variant_id text unique,
  title text,
  sku text unique,
  barcode text,
  price decimal(10, 2),
  compare_at_price decimal(10, 2),
  cost decimal(10, 2),
  inventory_quantity integer default 0,
  weight decimal(10, 3),
  weight_unit text,
  option_values jsonb default '{}',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create inventory sync log for tracking
create table if not exists public.inventory_sync_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity_before integer,
  quantity_after integer,
  sync_source text,
  sync_timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create product embeddings table for vector/semantic search
create table if not exists public.product_embeddings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  embedding vector(1536),
  embedding_model text default 'claude-3-5-sonnet-20241022',
  search_text text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create search tags table for full-text search
create table if not exists public.search_tags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tag text not null,
  created_at timestamp with time zone default now(),
  unique(product_id, tag)
);

-- Create referrals table
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete set null,
  referral_code text unique not null,
  status text default 'pending' check (status in ('pending', 'claimed', 'active', 'expired')),
  clicks integer default 0,
  conversions integer default 0,
  commission_amount decimal(10, 2) default 0,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

-- Create referral clicks table for analytics
create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  clicked_at timestamp with time zone default now()
);

-- Create commissions table
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  amount decimal(10, 2) not null,
  tier text default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'custom')),
  tier_multiplier decimal(3, 2) default 0.75,
  status text default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create commission payouts table
create table if not exists public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  amount decimal(10, 2) not null,
  status text default 'pending' check (status in ('pending', 'processing', 'paid', 'failed')),
  payout_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create referral stats table for analytics
create table if not exists public.referral_stats (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null unique references public.users(id) on delete cascade,
  total_referrals integer default 0,
  active_referrals integer default 0,
  total_clicks integer default 0,
  total_conversions integer default 0,
  total_commission_earned decimal(10, 2) default 0,
  total_paid decimal(10, 2) default 0,
  current_tier text default 'bronze',
  volume_ytd decimal(12, 2) default 0,
  updated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index idx_collections_handle on public.collections(handle);
create index idx_collections_active on public.collections(is_active);
create index idx_product_collections_collection on public.product_collections(collection_id);
create index idx_product_collections_product on public.product_collections(product_id);
create index idx_product_variants_product on public.product_variants(product_id);
create index idx_product_variants_sku on public.product_variants(sku);
create index idx_inventory_sync_product on public.inventory_sync_log(product_id);
create index idx_product_embeddings_product on public.product_embeddings(product_id);
create index idx_product_embeddings_embedding on public.product_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_referrals_referrer on public.referrals(referrer_id);
create index idx_referrals_code on public.referrals(referral_code);
create index idx_referrals_status on public.referrals(status);
create index idx_referral_clicks_referral on public.referral_clicks(referral_id);
create index idx_commissions_referrer on public.commissions(referrer_id);
create index idx_commissions_status on public.commissions(status);
create index idx_commission_payouts_referrer on public.commission_payouts(referrer_id);
create index idx_commission_payouts_status on public.commission_payouts(status);
create index idx_search_tags_product on public.search_tags(product_id);
create index idx_search_tags_tag on public.search_tags(tag);

-- Enable RLS on all new tables
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_sync_log enable row level security;
alter table public.product_embeddings enable row level security;
alter table public.search_tags enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.commissions enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.referral_stats enable row level security;

-- RLS Policies: Collections (public read)
create policy "Collections are readable by everyone"
  on public.collections
  for select
  using (true);

-- RLS Policies: Product variants (public read)
create policy "Product variants are readable by everyone"
  on public.product_variants
  for select
  using (true);

-- RLS Policies: Product embeddings (public read)
create policy "Product embeddings are readable by everyone"
  on public.product_embeddings
  for select
  using (true);

-- RLS Policies: Referrals (user can read own)
create policy "Users can read their own referrals"
  on public.referrals
  for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

-- RLS Policies: Commissions (user can read own)
create policy "Users can read their own commissions"
  on public.commissions
  for select
  using (auth.uid() = referrer_id);

-- RLS Policies: Commission payouts (user can read own)
create policy "Users can read their own payouts"
  on public.commission_payouts
  for select
  using (auth.uid() = referrer_id);

-- RLS Policies: Referral stats (user can read own)
create policy "Users can read their own stats"
  on public.referral_stats
  for select
  using (auth.uid() = referrer_id);

-- Create RPC function to update referral stats
create or replace function update_referral_stats(p_referrer_id uuid)
returns void as $$
declare
  v_total_conversions integer;
  v_total_earned decimal;
  v_total_paid decimal;
  v_current_tier text;
begin
  -- Count total conversions (commission records)
  select coalesce(count(*), 0)
  into v_total_conversions
  from public.commissions
  where referrer_id = p_referrer_id and status != 'rejected';

  -- Sum earned commissions (all commissions)
  select coalesce(sum(amount), 0)
  into v_total_earned
  from public.commissions
  where referrer_id = p_referrer_id;

  -- Sum paid commissions
  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.commissions
  where referrer_id = p_referrer_id and status = 'paid';

  -- Determine tier based on conversions
  case
    when v_total_conversions >= 51 then v_current_tier := 'gold';
    when v_total_conversions >= 11 then v_current_tier := 'silver';
    else v_current_tier := 'bronze';
  end case;

  -- Upsert referral stats
  insert into public.referral_stats (referrer_id, total_conversions, total_commission_earned, total_paid, current_tier)
  values (p_referrer_id, v_total_conversions, v_total_earned, v_total_paid, v_current_tier)
  on conflict (referrer_id)
  do update set
    total_conversions = v_total_conversions,
    total_commission_earned = v_total_earned,
    total_paid = v_total_paid,
    current_tier = v_current_tier,
    updated_at = now();
end;
$$ language plpgsql security definer;
