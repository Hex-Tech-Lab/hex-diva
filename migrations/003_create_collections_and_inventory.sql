-- Create collections table
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  shopify_id text unique,
  title text not null,
  handle text unique,
  description text,
  image_url text,
  position integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create product_collections junction table
create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(product_id, collection_id)
);

-- Add columns to products table for enriched metadata
alter table public.products add column if not exists supplier_cost decimal(10, 2);
alter table public.products add column if not exists gross_margin_percent decimal(5, 2);
alter table public.products add column if not exists supplier_name text;
alter table public.products add column if not exists b2b_bronze_price decimal(10, 2);
alter table public.products add column if not exists b2b_silver_price decimal(10, 2);
alter table public.products add column if not exists b2b_gold_price decimal(10, 2);
alter table public.products add column if not exists trending_on_tiktok boolean default false;
alter table public.products add column if not exists trending_on_instagram boolean default false;
alter table public.products add column if not exists viral_score decimal(4, 2);
alter table public.products add column if not exists metadata jsonb default '{}';

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
  inventory_quantity integer default 0,
  weight decimal(10, 3),
  weight_unit text,
  image_url text,
  options jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create inventory tracking table for sync history
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

-- Create search index table for pgvector semantic search
create table if not exists public.product_search_index (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  search_text text,
  embedding vector(1536),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index idx_collections_handle on public.collections(handle);
create index idx_product_collections_product_id on public.product_collections(product_id);
create index idx_product_collections_collection_id on public.product_collections(collection_id);
create index idx_product_variants_product_id on public.product_variants(product_id);
create index idx_product_variants_sku on public.product_variants(sku);
create index idx_inventory_sync_product_id on public.inventory_sync_log(product_id);
create index idx_product_search_index_product_id on public.product_search_index(product_id);

-- Enable RLS
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_sync_log enable row level security;
alter table public.product_search_index enable row level security;

-- Create RLS policies
create policy "Collections are readable by everyone"
  on public.collections
  for select
  using (true);

create policy "Product collections are readable by everyone"
  on public.product_collections
  for select
  using (true);

create policy "Product variants are readable by everyone"
  on public.product_variants
  for select
  using (true);

create policy "Inventory sync logs are readable by admin"
  on public.inventory_sync_log
  for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Search index is readable by everyone"
  on public.product_search_index
  for select
  using (true);
