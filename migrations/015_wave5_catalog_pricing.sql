-- Migration 015: Wave 5 Shopify API-aligned schema (100% Shopify naming verbatim)
-- Aligns product schema with Shopify Admin API field names
-- Source: https://shopify.dev/docs/api/admin-graphql/2026-01
-- Reference: Shopify Product, ProductVariant, and LineItem resource definitions

-- (1) Rename 'name' → 'title' (Shopify Product.title)
ALTER TABLE public.products
RENAME COLUMN IF EXISTS name TO title;

-- (2) Add vendor field (Shopify Product.vendor)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS vendor TEXT
COMMENT 'Shopify: Product.vendor — the product vendor/brand name';

-- (3) Add status field (Shopify Product.status) with valid values
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE'
CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DRAFT'))
COMMENT 'Shopify: Product.status — controls visibility across all sales channels';

-- (4) Rename 'inventory' → 'total_inventory' (Shopify Product.totalInventory)
ALTER TABLE public.products
RENAME COLUMN IF EXISTS inventory TO total_inventory;

-- (5) Rename 'in_stock' → 'available_for_sale' (Shopify ProductVariant.availableForSale)
ALTER TABLE public.products
RENAME COLUMN IF EXISTS in_stock TO available_for_sale;

-- (6) Rename 'image_url' → 'featured_image_url' (Shopify Product.featuredImage)
ALTER TABLE public.products
RENAME COLUMN IF EXISTS image_url TO featured_image_url;

-- (7) Add images array (Shopify Product.images - ImageConnection)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'
COMMENT 'Shopify: Product.images — array of image URLs in display order';

-- (8) Add primary price field (Shopify ProductVariant.price in store currency)
-- Price is stored as Money type (amount + currencyCode)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2)
COMMENT 'Shopify: ProductVariant.price — primary selling price in store currency (EGP)';

-- (9) Add compare_at_price (Shopify ProductVariant.compareAtPrice)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(12, 2)
COMMENT 'Shopify: ProductVariant.compareAtPrice — displayed as "was" price';

-- (10) Add currency_code (required for Shopify Money types)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'EGP'
CHECK (currency_code IN ('EGP', 'USD', 'EUR'))
COMMENT 'Shopify: Money.currencyCode — ISO 4217 currency code';

-- B2B tier prices (extensions beyond Shopify core, document clearly)
COMMENT ON COLUMN public.products.b2b_bronze_price IS 'B2B Extension: 25% discount from price';
COMMENT ON COLUMN public.products.b2b_silver_price IS 'B2B Extension: 35% discount from price';
COMMENT ON COLUMN public.products.b2b_gold_price IS 'B2B Extension: 50% discount from price';

-- Create indices for query performance
CREATE INDEX IF NOT EXISTS idx_products_featured_image_url ON public.products(featured_image_url);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor);

-- RLS Policies: Shopify API alignment
-- (1) Products are readable by everyone (ACTIVE products)
DROP POLICY IF EXISTS "Products readable by all users" ON public.products;
CREATE POLICY "Products readable by all authenticated users"
  ON public.products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- (2) Admin can read all products (including DRAFT/ARCHIVED)
DROP POLICY IF EXISTS "Admin can manage all product visibility" ON public.products;
CREATE POLICY "Admin can read all products"
  ON public.products
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_tier')::TEXT = 'admin'
  );

-- Final Shopify-aligned schema structure:
--
-- Core Shopify Product fields:
--   id (UUID PK), handle (unique), title (String, renamed from 'name')
--   description, vendor (brand), status, createdAt, updatedAt
--   featured_image_url (Image.url), images[] (Image[])
--   total_inventory, available_for_sale
--
-- Shopify Money pricing (with currencyCode context):
--   price (DECIMAL, store currency EGP)
--   compare_at_price (DECIMAL, optional compare-at value)
--   currency_code (ISO 4217, default EGP)
--   b2b_bronze_price, b2b_silver_price, b2b_gold_price (B2B extensions)
--
-- Shopify ProductVariant fields:
--   sku (String), barcode (String), category, tags[], collection
--   rating, review_count (extended metrics)
--   source_url (external link)
--   created_at, updated_at
