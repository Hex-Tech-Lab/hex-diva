-- Migration 016: Allow user-scoped writes to orders/order_items
--
-- orders/order_items had RLS enabled (migration 002) with only SELECT
-- policies -- no INSERT/UPDATE/DELETE policy existed for either table.
-- With RLS enabled and no policy, all writes are denied by default, which
-- forced src/app/api/checkout/route.ts to use the service-role admin
-- client for every order write, bypassing RLS entirely (contradicts
-- CLAUDE.md Law #2: request-scoped Supabase client for RLS isolation).
--
-- This adds the missing policies so checkout can use the user-scoped
-- client (already correctly authenticated via cookie session restore)
-- for order creation, matching the principle of least privilege: the
-- server still validates everything in code before writing, but the DB
-- layer now also enforces that a user can only write orders/order_items
-- under their own user_id, instead of trusting the admin bypass alone.
--
-- orders_audit intentionally keeps admin-only writes (no INSERT policy
-- added here) -- audit trail integrity should not be user-writable even
-- indirectly; the server writes audit rows on the user's behalf via the
-- admin client after the fact, which is the correct privileged path.

create policy "Users can insert their own orders"
  on public.orders
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own orders"
  on public.orders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own pending orders"
  on public.orders
  for delete
  using (auth.uid() = user_id and status = 'pending');

create policy "Users can insert items on their own orders"
  on public.order_items
  for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );
