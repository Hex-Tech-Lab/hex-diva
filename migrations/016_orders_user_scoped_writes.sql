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

-- No general "Users can update their own orders" UPDATE policy: an
-- ownership-only USING/WITH CHECK clause would let a client PATCH any
-- column via Supabase REST, including payment_status, status, total,
-- subtotal, and stripe_payment_intent_id. Order-status transitions (paid,
-- shipped, cancelled, etc.) are only ever written server-side through the
-- checkout/webhook handlers using the service-role admin client, which is
-- unaffected by the absence of a user-facing UPDATE policy here.

create policy "Users can delete their own pending orders"
  on public.orders
  for delete
  using (auth.uid() = user_id and status = 'pending');

-- No "Users can insert items on their own orders" INSERT policy: an
-- ownership-only WITH CHECK clause would let a client insert order_items
-- rows with client-controlled price/quantity for an order they own,
-- bypassing the server-side pricing/inventory validation in
-- src/app/api/checkout/route.ts. order_items writes stay restricted to the
-- service-role path (same rationale as orders_audit above).
