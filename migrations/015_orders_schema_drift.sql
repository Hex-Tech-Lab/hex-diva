-- Migration 015: Fix orders schema drift -- order_number column
--
-- src/types/database.types.ts declares orders.order_number as a required
-- (non-optional) string on Row/Insert/Update, and every checkout code path
-- that creates an order writes it (e.g. `ORD-${Date.now()}`), but no prior
-- migration on any branch (main, wave-5-product-catalog,
-- wave-6-inventory-payments) ever added this column to public.orders.
-- migrations/002_create_products_and_orders.sql created the table without
-- it, and no ALTER TABLE since has added it. This is a missing-migration
-- bug in the repo, not a deployment gap -- the column has never existed in
-- any committed migration, so it cannot simply be "re-applied" to prod.
--
-- This migration adds the column additively and idempotently:
--   1. Add order_number as nullable first so existing prod rows (if any)
--      don't fail the ALTER.
--   2. Backfill any existing NULL rows with a deterministic value derived
--      from the row's id, so every row ends up with a unique value.
--   3. Enforce NOT NULL + UNIQUE to match the non-optional type contract
--      and the "ORD-<n>" style values the application already writes.

alter table public.orders add column if not exists order_number text;

update public.orders
set order_number = 'ORD-LEGACY-' || replace(id::text, '-', '')
where order_number is null;

alter table public.orders alter column order_number set not null;

create unique index if not exists uq_orders_order_number on public.orders(order_number);
