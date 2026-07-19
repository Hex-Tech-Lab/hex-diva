-- Migration 016: price non-nullable (Shopify Money! alignment, ADR-011)
-- Shopify's ProductVariant.price is Money! (non-nullable). A variant with no
-- price is not sellable. Backfill nulls to 0, then enforce NOT NULL + default.
--
-- Targets `price` (not the legacy `price_egp` column) since that is the field
-- selected by the Shopify-aligned product APIs and rendered by the shop pages.

UPDATE public.products SET price = 0 WHERE price IS NULL;

ALTER TABLE public.products
  ALTER COLUMN price SET DEFAULT 0,
  ALTER COLUMN price SET NOT NULL;
