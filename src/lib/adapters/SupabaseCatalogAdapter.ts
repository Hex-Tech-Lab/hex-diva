/**
 * Supabase Catalog Adapter (Wave 2.1)
 * Implements ICatalogRepository against the existing public.products table.
 * Uses request-scoped Supabase admin client via dynamic import (Law #2).
 *
 * ── Contract ↔ DB column mapping (verified against prod schema, 2026-07-16) ──
 * | Contract field     | products column   | Notes                                        |
 * |--------------------|-------------------|----------------------------------------------|
 * | sku                | sku               | unique (migration 002); upsert conflict key  |
 * | name               | name              |                                              |
 * | brand              | brand             |                                              |
 * | barcode            | barcode           | NEW in migration 014 (UPC-A/EAN-13)          |
 * | category           | category          | contract narrows to the catalog enum         |
 * | collection         | collection        | NEW in migration 014 (denormalized name)     |
 * | description        | description       | DB nullable; contract requires non-empty     |
 * | price_egp          | price             | store currency is EGP                        |
 * | b2b_bronze_price   | b2b_bronze_price  | added by migration 003                       |
 * | b2b_silver_price   | b2b_silver_price  | added by migration 003                       |
 * | b2b_gold_price     | b2b_gold_price    | added by migration 003                       |
 * | inventory          | inventory         | in_stock is derived (inventory > 0) on write |
 * | image_url          | image_url         |                                              |
 * | source_url         | source_url        | NEW in migration 014                         |
 * | tags               | tags              | text[]                                       |
 * | (derived)          | handle            | NEW in migration 014; slug of name, unique   |
 *
 * IMPORTANT: the products entry in src/types/database.types.ts is STALE
 * (title/inventory_quantity/status do not exist in prod — actual columns are
 * name/inventory/in_stock per migrations 002/003, verified via
 * information_schema on vxggfstpidvisyhfrpsl). This adapter therefore defines
 * its own row shape and casts the client rather than trusting the generated
 * types. Regenerating database.types.ts is a separate follow-up owned by
 * another wave (the commission adapter relies on the current file).
 *
 * NOTE: listCollections reads the canonical public.collections table.
 * Roster imports write the denormalized products.collection string only;
 * syncing public.collections from roster data is a Wave 2 follow-up.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ICatalogRepository,
  CatalogListFilters,
  UpsertProductsResult,
} from '@/lib/ports'
import {
  ProductSchema,
  CollectionSchema,
  InventoryLevelSchema,
  type Product,
  type Collection,
  type InventoryLevel,
} from '@/lib/contracts/catalog'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCTS_TABLE = 'products'
const COLLECTIONS_TABLE = 'collections'
const SKU_CONFLICT_KEY = 'sku'
const DEFAULT_LIST_LIMIT = 20
const MAX_LIST_LIMIT = 100
/** PostgREST error code for "no rows returned" on single-row selects */
const POSTGREST_NO_ROWS = 'PGRST116'
/** Characters with structural meaning inside a PostgREST or() expression */
const POSTGREST_OR_UNSAFE_CHARS = /[,()]/g

/** Actual public.products row shape (migrations 002 + 003 + 014) */
interface ProductsDbRow {
  sku: string | null
  name: string
  brand: string | null
  barcode: string | null
  category: string | null
  collection: string | null
  handle: string | null
  description: string | null
  price: number
  b2b_bronze_price: number | null
  b2b_silver_price: number | null
  b2b_gold_price: number | null
  inventory: number | null
  in_stock: boolean | null
  image_url: string | null
  source_url: string | null
  tags: string[] | null
}

/** public.collections row shape (migration 003 + prod is_active column) */
interface CollectionsDbRow {
  title: string
  handle: string
  description: string | null
  image_url: string | null
  position: number | null
  is_active: boolean | null
}

/** Raised when a DB row fails contract validation on the way out */
export class CatalogContractViolationError extends Error {
  constructor(context: string, detail: string) {
    super(`Catalog contract violation (${context}): ${detail}`)
    this.name = 'CatalogContractViolationError'
  }
}

// ---------------------------------------------------------------------------
// Pure mapping helpers
// ---------------------------------------------------------------------------

/** Derive a stable URL handle (slug) from the product name */
export function deriveHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

/** Map a DB row to the domain shape, then validate through the contract */
function rowToProduct(row: ProductsDbRow, context: string): Product {
  const candidate = {
    sku: row.sku ?? '',
    name: row.name,
    brand: row.brand ?? '',
    barcode: row.barcode,
    category: row.category,
    collection: row.collection ?? '',
    description: row.description ?? '',
    price_egp: row.price,
    b2b_bronze_price: row.b2b_bronze_price,
    b2b_silver_price: row.b2b_silver_price,
    b2b_gold_price: row.b2b_gold_price,
    inventory: row.inventory ?? 0,
    image_url: row.image_url,
    source_url: row.source_url,
    tags: row.tags ?? [],
  }

  const parsed = ProductSchema.safeParse(candidate)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new CatalogContractViolationError(context, `sku=${row.sku ?? 'unknown'} → ${detail}`)
  }
  return parsed.data
}

/** Map a validated domain Product to the products table column set */
function productToRow(product: Product): Record<string, unknown> {
  return {
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    category: product.category,
    collection: product.collection,
    handle: deriveHandle(product.name),
    description: product.description,
    price: product.price_egp,
    b2b_bronze_price: product.b2b_bronze_price,
    b2b_silver_price: product.b2b_silver_price,
    b2b_gold_price: product.b2b_gold_price,
    inventory: product.inventory,
    in_stock: product.inventory > 0,
    image_url: product.image_url,
    source_url: product.source_url,
    tags: product.tags,
    updated_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class SupabaseCatalogAdapter implements ICatalogRepository {
  /**
   * Request-scoped client (Law #2). Cast away the stale Database generic —
   * see header note on src/types/database.types.ts drift.
   */
  private async getClient(): Promise<SupabaseClient> {
    const { supabaseAdmin } = await import('@/lib/db')
    return supabaseAdmin as unknown as SupabaseClient
  }

  async listProducts(filters: CatalogListFilters): Promise<Product[]> {
    const client = await this.getClient()

    let query = client.from(PRODUCTS_TABLE).select('*')

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.collection) query = query.eq('collection', filters.collection)
    if (filters.priceMin !== undefined) query = query.gte('price', filters.priceMin)
    if (filters.priceMax !== undefined) query = query.lte('price', filters.priceMax)
    if (filters.search) {
      const term = filters.search.replace(POSTGREST_OR_UNSAFE_CHARS, ' ').trim()
      if (term.length > 0) {
        query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      }
    }

    const limit = Math.min(filters.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT)
    const offset = filters.offset ?? 0
    query = query.order('sku', { ascending: true }).range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error

    return ((data ?? []) as ProductsDbRow[]).map((row) => rowToProduct(row, 'listProducts'))
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(PRODUCTS_TABLE)
      .select('*')
      .eq('sku', sku)
      .maybeSingle()

    if (error && error.code !== POSTGREST_NO_ROWS) throw error
    if (!data) return null
    return rowToProduct(data as ProductsDbRow, 'getProductBySku')
  }

  async getProductByHandle(handle: string): Promise<Product | null> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(PRODUCTS_TABLE)
      .select('*')
      .eq('handle', handle)
      .maybeSingle()

    if (error && error.code !== POSTGREST_NO_ROWS) throw error
    if (!data) return null
    return rowToProduct(data as ProductsDbRow, 'getProductByHandle')
  }

  async listCollections(): Promise<Collection[]> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(COLLECTIONS_TABLE)
      .select('*')
      .order('position', { ascending: true })

    if (error) throw error

    return ((data ?? []) as CollectionsDbRow[]).map((row) => {
      const parsed = CollectionSchema.safeParse({
        title: row.title,
        handle: row.handle,
        description: row.description,
        image_url: row.image_url,
        position: row.position,
        is_active: row.is_active ?? true,
      })
      if (!parsed.success) {
        const detail = parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ')
        throw new CatalogContractViolationError('listCollections', `handle=${row.handle} → ${detail}`)
      }
      return parsed.data
    })
  }

  async upsertProducts(batch: Product[]): Promise<UpsertProductsResult> {
    if (batch.length === 0) return { count: 0, skus: [] }

    // Validate at the boundary even if callers claim pre-validated input
    const rows = batch.map((product) => productToRow(ProductSchema.parse(product)))

    const client = await this.getClient()
    const { data, error } = await client
      .from(PRODUCTS_TABLE)
      .upsert(rows, { onConflict: SKU_CONFLICT_KEY, ignoreDuplicates: false })
      .select('sku')

    if (error) throw error

    const skus = ((data ?? []) as Array<{ sku: string }>).map((row) => row.sku)
    return { count: skus.length, skus }
  }

  async getInventory(sku: string): Promise<InventoryLevel | null> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(PRODUCTS_TABLE)
      .select('sku, inventory, in_stock')
      .eq('sku', sku)
      .maybeSingle()

    if (error && error.code !== POSTGREST_NO_ROWS) throw error
    if (!data) return null

    const row = data as Pick<ProductsDbRow, 'sku' | 'inventory' | 'in_stock'>
    const parsed = InventoryLevelSchema.safeParse({
      sku: row.sku,
      inventory: row.inventory ?? 0,
      in_stock: row.in_stock ?? (row.inventory ?? 0) > 0,
    })
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
      throw new CatalogContractViolationError('getInventory', `sku=${sku} → ${detail}`)
    }
    return parsed.data
  }
}
