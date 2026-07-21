-- ADR-013 (scope expansion): full passive Shopify business-entity mirror.
-- Customers, orders, line items, transactions, fulfillments, refunds,
-- payouts, plus our own supplier provenance records. Same rules as
-- migrations/017: additive only, service-role RLS only, no write path
-- back to Shopify, Shopify always wins any diff.

CREATE TABLE IF NOT EXISTS shopify_customers_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_customer_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  default_address JSONB,
  amount_spent JSONB,
  number_of_orders BIGINT,
  tags TEXT[],
  tax_exempt BOOLEAN,
  verified_email BOOLEAN,
  raw_customer_json JSONB NOT NULL,
  sync_source TEXT NOT NULL CHECK (sync_source IN ('webhook', 'backfill')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_mirror_email ON shopify_customers_mirror (email);
CREATE INDEX IF NOT EXISTS idx_customers_mirror_synced_at ON shopify_customers_mirror (synced_at);

CREATE TABLE IF NOT EXISTS shopify_orders_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  customer_id TEXT REFERENCES shopify_customers_mirror (shopify_customer_id),
  display_financial_status TEXT,
  display_fulfillment_status TEXT,
  current_total_price_set JSONB,
  current_subtotal_price_set JSONB,
  total_tax_set JSONB,
  total_shipping_price_set JSONB,
  po_number TEXT,
  source_name TEXT,
  tags TEXT[],
  raw_order_json JSONB NOT NULL,
  sync_source TEXT NOT NULL CHECK (sync_source IN ('webhook', 'backfill')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shopify_created_at TIMESTAMPTZ,
  shopify_processed_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  shopify_cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_mirror_customer_id ON shopify_orders_mirror (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_mirror_synced_at ON shopify_orders_mirror (synced_at);

CREATE TABLE IF NOT EXISTS shopify_order_line_items_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_line_item_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES shopify_orders_mirror (shopify_order_id),
  product_id TEXT,
  variant_id TEXT,
  sku TEXT,
  title TEXT,
  quantity INT,
  original_unit_price_set JSONB,
  discounted_unit_price_set JSONB,
  raw_line_item_json JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_line_items_mirror_order_id ON shopify_order_line_items_mirror (order_id);
CREATE INDEX IF NOT EXISTS idx_line_items_mirror_sku ON shopify_order_line_items_mirror (sku);

CREATE TABLE IF NOT EXISTS shopify_transactions_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_transaction_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES shopify_orders_mirror (shopify_order_id),
  parent_transaction_id TEXT REFERENCES shopify_transactions_mirror (shopify_transaction_id),
  kind TEXT,
  status TEXT,
  gateway TEXT,
  amount_set JSONB,
  test BOOLEAN,
  raw_transaction_json JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shopify_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_mirror_order_id ON shopify_transactions_mirror (order_id);

CREATE TABLE IF NOT EXISTS shopify_fulfillments_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_fulfillment_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES shopify_orders_mirror (shopify_order_id),
  status TEXT,
  tracking_company TEXT,
  tracking_numbers TEXT[],
  tracking_urls TEXT[],
  location_id TEXT,
  raw_fulfillment_json JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  shopify_delivered_at TIMESTAMPTZ,
  shopify_estimated_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fulfillments_mirror_order_id ON shopify_fulfillments_mirror (order_id);

CREATE TABLE IF NOT EXISTS shopify_refunds_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_refund_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES shopify_orders_mirror (shopify_order_id),
  note TEXT,
  total_refunded_set JSONB,
  raw_refund_json JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shopify_created_at TIMESTAMPTZ,
  shopify_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_mirror_order_id ON shopify_refunds_mirror (order_id);

-- Empty until/unless the store is ever on Shopify Payments (not available
-- in Egypt today, per ADR-012) -- kept for schema completeness so no
-- migration is needed if that changes.
CREATE TABLE IF NOT EXISTS shopify_payouts_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_payout_id TEXT NOT NULL UNIQUE,
  status TEXT,
  amount JSONB,
  net_amount JSONB,
  raw_payout_json JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shopify_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Not a Shopify entity -- our own procurement/sourcing record, per
-- docs/catalog/PRODUCT_SCHEMA_V2.md's mandatory provenance block.
-- product_sku is an application-level link into
-- shopify_catalog_mirror.variants[].sku (a JSONB array), not a DB FK.
CREATE TABLE IF NOT EXISTS supplier_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sku TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_url TEXT NOT NULL,
  supplier_platform TEXT NOT NULL CHECK (supplier_platform IN ('1688', 'Alibaba', 'direct-factory', 'other')),
  verification_method TEXT NOT NULL CHECK (verification_method IN ('exa_search', 'serpapi_search', 'webfetch_direct', 'manual')),
  verification_date TIMESTAMPTZ NOT NULL,
  verification_evidence_url TEXT,
  image_source_url TEXT,
  image_verified_resolves BOOLEAN NOT NULL DEFAULT false,
  supplier_cost_usd NUMERIC(10, 2),
  cost_source_moq TEXT,
  quality_grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_provenance_sku ON supplier_provenance (product_sku);

ALTER TABLE shopify_customers_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_orders_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_order_line_items_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_transactions_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_fulfillments_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_refunds_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_payouts_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_provenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY shopify_customers_mirror_service_role_only ON shopify_customers_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY shopify_orders_mirror_service_role_only ON shopify_orders_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY shopify_line_items_mirror_service_role_only ON shopify_order_line_items_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY shopify_transactions_mirror_service_role_only ON shopify_transactions_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY shopify_fulfillments_mirror_service_role_only ON shopify_fulfillments_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY shopify_refunds_mirror_service_role_only ON shopify_refunds_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY shopify_payouts_mirror_service_role_only ON shopify_payouts_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY supplier_provenance_service_role_only ON supplier_provenance FOR ALL TO service_role USING (true) WITH CHECK (true);
