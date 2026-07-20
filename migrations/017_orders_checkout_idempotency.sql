-- Migration 017: Retry-safe checkout via orders.checkout_idempotency_key
--
-- src/app/api/checkout/route.ts previously minted a brand new order id
-- (and orders/order_items rows) on every POST, including retries of the
-- same logical checkout attempt (double-click, client timeout + retry,
-- network blip). If a later step in the flow failed (Stripe session
-- creation, stripe_session_id update), the earlier rows were not always
-- cleaned up, leaving orphaned "pending" orders and, on retry, a second
-- orphan alongside them.
--
-- This column lets the route look up an existing pending order for the
-- same (user, cart-contents) idempotency key before creating a new one, so
-- retries reuse the same order row instead of creating duplicates.

alter table public.orders add column if not exists checkout_idempotency_key text;

create unique index if not exists idx_orders_checkout_idempotency_key
  on public.orders(checkout_idempotency_key)
  where checkout_idempotency_key is not null;
