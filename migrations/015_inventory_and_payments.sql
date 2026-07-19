-- Inventory and Payments Infrastructure for Wave 6

-- Add inventory-related columns to products if not exists
alter table public.products add column if not exists inventory integer default 0;
alter table public.products add column if not exists inventory_updated_at timestamp with time zone default now();

-- Add payment-related columns to orders if not exists
alter table public.orders add column if not exists stripe_session_id text;
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists payment_status text default 'pending' check (payment_status in ('pending', 'succeeded', 'failed', 'cancelled'));
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists subtotal decimal(10, 2);
alter table public.orders add column if not exists tax decimal(10, 2) default 0;
alter table public.orders add column if not exists shipping decimal(10, 2) default 0;
alter table public.orders add column if not exists tracked_at timestamp with time zone;

-- Create orders_audit table for tracking order state changes
create table if not exists public.orders_audit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('created', 'payment_started', 'payment_succeeded', 'payment_failed', 'inventory_reserved', 'inventory_decremented', 'inventory_restored', 'shipped', 'delivered', 'cancelled')),
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Create RPC function for atomic inventory decrement
create or replace function public.decrement_product_inventory(
  product_id uuid,
  quantity integer
)
returns table (success boolean, inventory_after integer) as $$
declare
  current_inventory integer;
begin
  -- Lock row for update to prevent race conditions
  select inventory into current_inventory from public.products
  where id = product_id
  for update;

  if current_inventory is null then
    return query select false, 0;
  elsif current_inventory < quantity then
    return query select false, current_inventory;
  else
    update public.products
    set inventory = inventory - quantity, inventory_updated_at = now()
    where id = product_id;

    return query select true, current_inventory - quantity;
  end if;
end;
$$ language plpgsql;

-- Create RPC function for atomic inventory increment
create or replace function public.increment_product_inventory(
  product_id uuid,
  quantity integer
)
returns table (success boolean, inventory_after integer) as $$
declare
  new_inventory integer;
begin
  update public.products
  set inventory = inventory + quantity, inventory_updated_at = now()
  where id = product_id
  returning inventory into new_inventory;

  if new_inventory is not null then
    return query select true, new_inventory;
  else
    return query select false, 0;
  end if;
end;
$$ language plpgsql;

-- Create indexes
create index if not exists idx_orders_stripe_session_id on public.orders(stripe_session_id);
create index if not exists idx_orders_stripe_payment_intent_id on public.orders(stripe_payment_intent_id);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_audit_order_id on public.orders_audit(order_id);
create index if not exists idx_orders_audit_user_id on public.orders_audit(user_id);
create index if not exists idx_orders_audit_created_at on public.orders_audit(created_at);
create index if not exists idx_products_inventory on public.products(inventory);

-- Enable RLS
alter table public.orders_audit enable row level security;

-- Create RLS policies for orders_audit
create policy "Users can read their own order audit logs"
  on public.orders_audit
  for select
  using (auth.uid() = user_id);

-- Grant execute permission on RPC functions
grant execute on function public.decrement_product_inventory to authenticated, anon;
grant execute on function public.increment_product_inventory to authenticated, anon;
