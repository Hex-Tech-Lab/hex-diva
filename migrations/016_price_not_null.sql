-- Migration 016: price_egp non-nullable (Shopify Money! alignment, ADR-011)
-- Shopify's ProductVariant.price is Money! (non-nullable). A variant with no
-- price is not sellable. Backfill nulls to 0, then enforce NOT NULL + default.

UPDATE public.products SET price_egp = 0 WHERE price_egp IS NULL;

ALTER TABLE public.products
  ALTER COLUMN price_egp SET DEFAULT 0,
  ALTER COLUMN price_egp SET NOT NULL;
