-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- Create collections table
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  shopify_id text unique,
  name text not null,
  description text,
  slug text unique not null,
  image_url text,
  sort_order integer,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create products_collections junction table
create table if not exists public.products_collections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  sort_order integer,
  created_at timestamp with time zone default now(),
  unique(product_id, collection_id)
);

-- Create product variants table
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

-- Create product embeddings table for vector search
create table if not exists public.product_embeddings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  embedding vector(1536),
  embedding_model text default 'claude-3-5-sonnet-20241022',
  search_text text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(product_id)
);

-- Create referrals table
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete set null,
  referral_code text unique,
  status text default 'pending' check (status in ('pending', 'claimed', 'active', 'expired')),
  clicks integer default 0,
  conversions integer default 0,
  commission_amount decimal(10, 2) default 0,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
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

-- Create search_tags table for full-text search
create table if not exists public.search_tags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tag text not null,
  created_at timestamp with time zone default now(),
  unique(product_id, tag)
);

-- Create indexes
create index idx_collections_slug on public.collections(slug);
create index idx_collections_active on public.collections(is_active);
create index idx_products_collections_collection on public.products_collections(collection_id);
create index idx_products_collections_product on public.products_collections(product_id);
create index idx_product_variants_product on public.product_variants(product_id);
create index idx_product_variants_sku on public.product_variants(sku);
create index idx_product_embeddings_product on public.product_embeddings(product_id);
create index idx_product_embeddings_embedding on public.product_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_referrals_referrer on public.referrals(referrer_id);
create index idx_referrals_status on public.referrals(status);
create index idx_commissions_referrer on public.commissions(referrer_id);
create index idx_commissions_status on public.commissions(status);
create index idx_search_tags_product on public.search_tags(product_id);
create index idx_search_tags_tag on public.search_tags(tag);

-- Enable RLS
alter table public.collections enable row level security;
alter table public.products_collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_embeddings enable row level security;
alter table public.referrals enable row level security;
alter table public.commissions enable row level security;
alter table public.search_tags enable row level security;

-- RLS policies
create policy "Collections are readable by everyone"
  on public.collections
  for select
  using (true);

create policy "Product variants are readable by everyone"
  on public.product_variants
  for select
  using (true);

create policy "Product embeddings are readable by everyone"
  on public.product_embeddings
  for select
  using (true);

create policy "Users can read their own referrals"
  on public.referrals
  for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

create policy "Users can read their own commissions"
  on public.commissions
  for select
  using (auth.uid() = referrer_id);
