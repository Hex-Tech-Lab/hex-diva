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

-- Create indexes.
--
-- orders/products are pre-existing tables that may already hold production
-- rows, so their new indexes use CONCURRENTLY to avoid holding a
-- table-locking write-blocking ACCESS EXCLUSIVE lock for the duration of the
-- build. CONCURRENTLY is not allowed inside a transaction block -- this
-- migration file MUST be applied outside a transaction (e.g. `psql -c` per
-- statement, or a migration runner configured with no implicit
-- transaction), not via a wrapped `BEGIN; ... COMMIT;` migration runner.
--
-- orders_audit is a brand-new table created earlier in this same migration
-- (empty at index-creation time), so its indexes keep the plain,
-- transaction-safe form.
create index concurrently if not exists idx_orders_stripe_session_id on public.orders(stripe_session_id);
create index concurrently if not exists idx_orders_stripe_payment_intent_id on public.orders(stripe_payment_intent_id);
create index concurrently if not exists idx_orders_payment_status on public.orders(payment_status);
create index concurrently if not exists idx_products_inventory on public.products(inventory);

create index if not exists idx_orders_audit_order_id on public.orders_audit(order_id);
create index if not exists idx_orders_audit_user_id on public.orders_audit(user_id);
create index if not exists idx_orders_audit_created_at on public.orders_audit(created_at);

-- Enable RLS
alter table public.orders_audit enable row level security;

-- Create RLS policies for orders_audit
create policy "Users can read their own order audit logs"
  on public.orders_audit
  for select
  using (auth.uid() = user_id);

-- Grant execute permission on RPC functions.
-- These are only ever invoked server-side via the service-role (admin)
-- client in src/lib/inventory/manager.ts (checkout/webhook flows) -- never
-- from user-facing code. Restricting to service_role prevents any
-- authenticated or anonymous client from calling them directly through
-- Supabase's REST RPC endpoint to manipulate inventory.
revoke execute on function public.decrement_product_inventory from authenticated, anon;
revoke execute on function public.increment_product_inventory from authenticated, anon;
grant execute on function public.decrement_product_inventory to service_role;
grant execute on function public.increment_product_inventory to service_role;
