-- ADR-013: passive, read-only Shopify catalog replica.
-- Additive only — does not touch the existing products/orders tables or
-- the storefront's read path. Nothing writes back to Shopify from here.

CREATE TABLE IF NOT EXISTS shopify_catalog_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id TEXT NOT NULL UNIQUE,
  handle TEXT,
  title TEXT,
  description_html TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[],
  status TEXT,
  category_id TEXT,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  metafields JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_product_json JSONB NOT NULL,
  sync_source TEXT NOT NULL CHECK (sync_source IN ('webhook', 'backfill')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_catalog_mirror_handle
  ON shopify_catalog_mirror (handle);

CREATE INDEX IF NOT EXISTS idx_shopify_catalog_mirror_synced_at
  ON shopify_catalog_mirror (synced_at);

ALTER TABLE shopify_catalog_mirror ENABLE ROW LEVEL SECURITY;

-- Service-role only: this table is an internal insurance copy, never
-- read by the storefront (which reads Shopify directly per ADR-012) and
-- never written to by anon/authenticated users.
CREATE POLICY shopify_catalog_mirror_service_role_only
  ON shopify_catalog_mirror
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
