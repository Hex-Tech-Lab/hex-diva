/**
 * Catalog Repository Port (Hexagonal Architecture — Wave 2.1)
 *
 * Domain-facing contract for catalog persistence. Domain and application code
 * depend on this interface only; the concrete Supabase implementation lives in
 * src/lib/adapters/SupabaseCatalogAdapter.ts.
 *
 * All returned entities are validated against the zod contracts in
 * src/lib/contracts/catalog.ts before leaving the adapter.
 */

import type { Product, Collection, InventoryLevel, CatalogCategory } from '@/lib/contracts/catalog'

/** Filters for listing products; all fields optional */
export interface CatalogListFilters {
  category?: CatalogCategory
  collection?: string
  priceMin?: number
  priceMax?: number
  /** Case-insensitive substring match against name and description */
  search?: string
  limit?: number
  offset?: number
}

/** Result of a batch upsert */
export interface UpsertProductsResult {
  /** Number of rows written (inserted or updated) */
  count: number
  /** SKUs that were written, in DB return order */
  skus: string[]
}

export interface ICatalogRepository {
  /** List products matching the given filters (paginated) */
  listProducts(filters: CatalogListFilters): Promise<Product[]>

  /** Fetch a single product by SKU; null when not found */
  getProductBySku(sku: string): Promise<Product | null>

  /** Fetch a single product by URL handle (slug); null when not found */
  getProductByHandle(handle: string): Promise<Product | null>

  /** List all collections */
  listCollections(): Promise<Collection[]>

  /** Idempotently upsert a batch of products keyed on SKU */
  upsertProducts(batch: Product[]): Promise<UpsertProductsResult>

  /** Fetch the inventory level for a SKU; null when the SKU does not exist */
  getInventory(sku: string): Promise<InventoryLevel | null>
}
