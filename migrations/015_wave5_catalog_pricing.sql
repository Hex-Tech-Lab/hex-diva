-- Migration 015: Wave 5 catalog pricing — ensure price_egp (B2C retail) is present
-- This is the main product price column referenced by ProductSchema and roster data
-- B2B tier pricing (bronze/silver/gold) already added in migration 003

alter table public.products
add column if not exists price_egp decimal(10, 2)
comment 'B2C retail price in Egyptian Pounds; primary pricing for consumer tier';

-- Ensure b2c_enabled flag exists for user tier checks
alter table public.products
add column if not exists b2c_enabled boolean default true
comment 'Controls whether product is available for B2C (consumer) purchases';

-- Create index for price filtering
create index if not exists idx_products_price_egp on public.products(price_egp);

-- RLS policy: Products are readable by everyone (consumer & B2B alike)
create policy if not exists "Products readable by all users"
  on public.products for select using (true);

-- Verify the products table structure with essential columns:
-- id, sku, handle, name, brand, barcode, category, collection
-- price_egp (B2C), b2b_bronze_price, b2b_silver_price, b2b_gold_price
-- inventory, in_stock, image_url, source_url, tags
-- description, rating, review_count
-- created_at, updated_at
