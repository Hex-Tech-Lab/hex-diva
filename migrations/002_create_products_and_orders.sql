-- Create products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shopify_id text unique,
  name text not null,
  description text,
  price decimal(10, 2) not null,
  original_price decimal(10, 2),
  image_url text,
  category text,
  brand text,
  rating decimal(2, 1) default 0,
  review_count integer default 0,
  sku text unique,
  in_stock boolean default true,
  inventory integer default 0,
  tags text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal decimal(10, 2) not null,
  tax decimal(10, 2) default 0,
  shipping decimal(10, 2) default 0,
  total decimal(10, 2) not null,
  shipping_address_id uuid references public.addresses(id),
  billing_address_id uuid references public.addresses(id),
  payment_method text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price decimal(10, 2) not null,
  total decimal(10, 2) not null,
  created_at timestamp with time zone default now()
);

-- Create cart table (session-based)
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  session_id text,
  items jsonb default '[]',
  subtotal decimal(10, 2) default 0,
  tax decimal(10, 2) default 0,
  shipping decimal(10, 2) default 0,
  total decimal(10, 2) default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index idx_products_category on public.products(category);
create index idx_products_brand on public.products(brand);
create index idx_products_sku on public.products(sku);
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_carts_user_id on public.carts(user_id);

-- Enable RLS
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.carts enable row level security;

-- Create RLS policies for orders
create policy "Users can read their own orders"
  on public.orders
  for select
  using (auth.uid() = user_id);

create policy "Users can read their own order items"
  on public.order_items
  for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));

create policy "Products are readable by everyone"
  on public.products
  for select
  using (true);
