-- Migration 014: Catalog columns required by the Wave 2.1 CatalogPort contract
-- Adds columns the src/lib/contracts/catalog.ts ProductSchema needs that the
-- products table (migrations 002 + 003) lacks. Additive and idempotent only.
--
-- barcode    : UPC-A (12) or EAN-13 (13) GTIN, check-digit validated at the contract boundary
-- collection : denormalized collection display name from the product roster
-- handle     : URL slug derived from name; used by ICatalogRepository.getProductByHandle
-- source_url : provenance URL for imported roster rows

alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists collection text;
alter table public.products add column if not exists handle text;
alter table public.products add column if not exists source_url text;

-- Lookup/filter indexes (idempotent)
create unique index if not exists uq_products_handle on public.products(handle) where handle is not null;
create index if not exists idx_products_collection on public.products(collection);
create index if not exists idx_products_barcode on public.products(barcode);
