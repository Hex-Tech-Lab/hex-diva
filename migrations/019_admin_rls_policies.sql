-- Migration 019: Admin RLS Policies for Dashboard Access
-- Enables admin users to read and manage orders, products, commissions, and referral data
-- Admins cannot modify user tier or delete orders (only status updates)
--
-- Admin check convention: matches migs 006/010 — exists(select 1 from public.users
-- where id = auth.uid() and tier = 'admin'). App-layer admin gating (verifyAdminAccess
-- in src/lib/admin/auth.ts) is email-whitelist based; public.users.tier is kept in sync
-- with that whitelist (see mig 010) so RLS can rely on it without re-deriving from JWT.

-- Drop existing policies that might conflict
drop policy if exists "Admins can read all orders" on public.orders;
drop policy if exists "Admins can update order status" on public.orders;
drop policy if exists "Admins can read all products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can read all commissions" on public.commissions;
drop policy if exists "Admins can read all commission payouts" on public.commission_payouts;
drop policy if exists "Admins can update commission status" on public.commissions;
drop policy if exists "Admins can read all referral stats" on public.referral_stats;

-- Admin access to orders (read + status updates only)
create policy "Admins can read all orders"
  on public.orders
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

create policy "Admins can update order status"
  on public.orders
  for update
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to order items
drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
  on public.order_items
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to products (read + price/inventory updates)
drop policy if exists "Admins can read all products" on public.products;
create policy "Admins can read all products"
  on public.products
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products
  for update
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to commissions
drop policy if exists "Admins can read all commissions" on public.commissions;
create policy "Admins can read all commissions"
  on public.commissions
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

drop policy if exists "Admins can update commission status" on public.commissions;
create policy "Admins can update commission status"
  on public.commissions
  for update
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to commission payouts
drop policy if exists "Admins can read all commission payouts" on public.commission_payouts;
create policy "Admins can read all commission payouts"
  on public.commission_payouts
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

drop policy if exists "Admins can update commission payouts" on public.commission_payouts;
create policy "Admins can update commission payouts"
  on public.commission_payouts
  for update
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to referral stats
drop policy if exists "Admins can read all referral stats" on public.referral_stats;
create policy "Admins can read all referral stats"
  on public.referral_stats
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to referrals
drop policy if exists "Admins can read all referrals" on public.referrals;
create policy "Admins can read all referrals"
  on public.referrals
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Admin access to audit logs (read-only)
drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
  on public.admin_audit_logs
  for select
  using (exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin'));

-- Column-scoping guards -----------------------------------------------------
-- RLS policies above are row-level only: Postgres RLS cannot restrict which
-- *columns* an update touches, so the "admins cannot modify user tier or
-- delete orders (only status updates)" comment above is not actually
-- enforced by the `for update` policies alone — an admin session could
-- update any column on a row it can see (e.g. orders.total, orders.user_id).
-- These triggers close that gap by rejecting updates that touch a column
-- outside the documented admin-editable set. They only apply when the admin
-- RLS predicate matches, so non-admin updates (already blocked by RLS, or
-- performed by the service role) are unaffected.
create or replace function public.enforce_admin_column_scope()
returns trigger
language plpgsql
as $$
declare
  is_admin boolean;
  allowed_cols text[] := tg_argv;
  col text;
begin
  is_admin := exists (select 1 from public.users where users.id = auth.uid() and users.tier = 'admin');
  if not is_admin then
    return new;
  end if;

  foreach col in array (
    select key from jsonb_each(to_jsonb(new)) t(key, value)
    where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key
  )
  loop
    if not (col = any (allowed_cols)) then
      raise exception 'Admin update to column "%" on % is not permitted (allowed: %)', col, tg_table_name, allowed_cols;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists admin_column_scope_orders on public.orders;
create trigger admin_column_scope_orders
  before update on public.orders
  for each row
  execute function public.enforce_admin_column_scope('status', 'updated_at');

drop trigger if exists admin_column_scope_products on public.products;
create trigger admin_column_scope_products
  before update on public.products
  for each row
  execute function public.enforce_admin_column_scope('price', 'original_price', 'in_stock', 'inventory', 'updated_at');

drop trigger if exists admin_column_scope_commissions on public.commissions;
create trigger admin_column_scope_commissions
  before update on public.commissions
  for each row
  execute function public.enforce_admin_column_scope('status', 'paid_at', 'updated_at');

drop trigger if exists admin_column_scope_commission_payouts on public.commission_payouts;
create trigger admin_column_scope_commission_payouts
  before update on public.commission_payouts
  for each row
  execute function public.enforce_admin_column_scope('status', 'payout_date', 'updated_at');
