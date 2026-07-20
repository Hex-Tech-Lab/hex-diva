-- Migration 017: PayTabs payment provider support
--
-- PayTabs is the primary payment provider for the Egyptian market (Stripe
-- is dormant/archived -- see src/lib/stripe/client.ts and
-- docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md for why). Rather than adding
-- PayTabs-specific columns alongside the existing stripe_session_id /
-- stripe_payment_intent_id pair, this adds provider-agnostic columns so
-- the next provider in the planned 3-tier cascade doesn't repeat the same
-- pattern a third time.

alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists provider_transaction_ref text;

create index if not exists idx_orders_provider_transaction_ref
  on public.orders(provider_transaction_ref);

comment on column public.orders.payment_provider is
  'Which provider processed this order: paytabs, stripe, paymob, tap, etc. NULL for orders predating multi-provider support.';
comment on column public.orders.provider_transaction_ref is
  'Provider-specific transaction/session reference (e.g. PayTabs tran_ref). Provider-agnostic replacement for the older stripe_session_id column.';
