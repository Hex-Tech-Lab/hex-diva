-- Migration 015: Admin RLS Policies for Dashboard Access
-- Enables admin users to read and manage orders, products, commissions, and referral data
-- Admins cannot modify user tier or delete orders (only status updates)

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
