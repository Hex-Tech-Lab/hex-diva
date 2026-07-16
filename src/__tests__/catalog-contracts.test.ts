/**
 * Unit Test Suite: Catalog Contracts + Supabase Catalog Adapter (Wave 2.1)
 *
 * Covers: ProductSchema acceptance/rejection (barcode check digits, prices,
 * sku pattern), RosterFileSchema row indexing, and adapter column mapping
 * against a mocked request-scoped Supabase client.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  ProductSchema,
  RosterFileSchema,
  InventoryLevelSchema,
  isValidGtinCheckDigit,
  type Product,
} from '@/lib/contracts/catalog'

// ============================================================================
// Fixtures
// ============================================================================

/** Mirrors scripts/roster-real.json row shape exactly */
const validProduct: Product = {
  sku: 'GLMD-LASH-001',
  name: 'Ardell LashGrip Adhesive - Clear',
  brand: 'Ardell',
  barcode: '074764680259', // valid UPC-A (12 digits)
  category: 'eyelashes',
  collection: 'Lash Essentials',
  description: 'Authentic Ardell lash-line product.',
  price_egp: 135,
  b2b_bronze_price: 101,
  b2b_silver_price: 88,
  b2b_gold_price: 68,
  inventory: 72,
  image_url: null,
  source_url: 'https://www.upcitemdb.com/upc/74764680259',
  tags: ['eyelashes', 'ardell', 'lash-essentials'],
}

const VALID_EAN13 = '6291041500213' // check digit 3 is correct
const INVALID_EAN13 = '6291041500214' // last digit off by one

// ============================================================================
// Contract: ProductSchema
// ============================================================================

describe('ProductSchema', () => {
  test('accepts a valid roster product', () => {
    const result = ProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
  })

  test('accepts a valid EAN-13 barcode', () => {
    const result = ProductSchema.safeParse({ ...validProduct, barcode: VALID_EAN13 })
    expect(result.success).toBe(true)
  })

  test('accepts a null barcode', () => {
    const result = ProductSchema.safeParse({ ...validProduct, barcode: null })
    expect(result.success).toBe(true)
  })

  test('rejects an EAN-13 barcode with a bad check digit', () => {
    const result = ProductSchema.safeParse({ ...validProduct, barcode: INVALID_EAN13 })
    expect(result.success).toBe(false)
  })

  test('rejects a UPC-A barcode with a bad check digit', () => {
    const result = ProductSchema.safeParse({ ...validProduct, barcode: '074764680258' })
    expect(result.success).toBe(false)
  })

  test('rejects barcodes of invalid length', () => {
    const result = ProductSchema.safeParse({ ...validProduct, barcode: '12345678901' })
    expect(result.success).toBe(false)
  })

  test('rejects a negative price', () => {
    const result = ProductSchema.safeParse({ ...validProduct, price_egp: -10 })
    expect(result.success).toBe(false)
  })

  test('rejects a zero price', () => {
    const result = ProductSchema.safeParse({ ...validProduct, price_egp: 0 })
    expect(result.success).toBe(false)
  })

  test('rejects negative inventory and non-integer inventory', () => {
    expect(ProductSchema.safeParse({ ...validProduct, inventory: -1 }).success).toBe(false)
    expect(ProductSchema.safeParse({ ...validProduct, inventory: 1.5 }).success).toBe(false)
  })

  test('rejects a malformed SKU', () => {
    expect(ProductSchema.safeParse({ ...validProduct, sku: 'GLMD-TOOLKIT-1' }).success).toBe(false)
    expect(ProductSchema.safeParse({ ...validProduct, sku: 'ACME-LASH-001' }).success).toBe(false)
  })

  test('accepts a 3-letter category block SKU (accessories)', () => {
    const result = ProductSchema.safeParse({
      ...validProduct,
      sku: 'GLMD-ACC-001',
      category: 'accessories',
    })
    expect(result.success).toBe(true)
  })

  test('rejects an unknown category', () => {
    const result = ProductSchema.safeParse({ ...validProduct, category: 'skincare' })
    expect(result.success).toBe(false)
  })

  test('rejects a non-url image_url but accepts null', () => {
    expect(ProductSchema.safeParse({ ...validProduct, image_url: 'not-a-url' }).success).toBe(false)
    expect(ProductSchema.safeParse({ ...validProduct, image_url: null }).success).toBe(true)
  })
})

describe('isValidGtinCheckDigit', () => {
  test('validates known-good UPC-A and EAN-13 codes', () => {
    expect(isValidGtinCheckDigit('074764680259')).toBe(true)
    expect(isValidGtinCheckDigit(VALID_EAN13)).toBe(true)
  })

  test('rejects bad check digits, lengths, and non-digits', () => {
    expect(isValidGtinCheckDigit(INVALID_EAN13)).toBe(false)
    expect(isValidGtinCheckDigit('074764680258')).toBe(false)
    expect(isValidGtinCheckDigit('1234567')).toBe(false)
    expect(isValidGtinCheckDigit('07476468025X')).toBe(false)
  })
})

describe('RosterFileSchema', () => {
  test('accepts an array of valid products', () => {
    expect(RosterFileSchema.safeParse([validProduct, validProduct]).success).toBe(true)
  })

  test('reports the index of every invalid row', () => {
    const result = RosterFileSchema.safeParse([
      validProduct,
      { ...validProduct, price_egp: -5 },
      { ...validProduct, barcode: INVALID_EAN13 },
    ])
    expect(result.success).toBe(false)
    if (!result.success) {
      const badRows = new Set(result.error.issues.map((issue) => issue.path[0]))
      expect(badRows.has(1)).toBe(true)
      expect(badRows.has(2)).toBe(true)
      expect(badRows.has(0)).toBe(false)
    }
  })
})

describe('InventoryLevelSchema', () => {
  test('accepts a valid level and rejects negative inventory', () => {
    expect(
      InventoryLevelSchema.safeParse({ sku: 'GLMD-NAIL-004', inventory: 3, in_stock: true }).success
    ).toBe(true)
    expect(
      InventoryLevelSchema.safeParse({ sku: 'GLMD-NAIL-004', inventory: -3, in_stock: false })
        .success
    ).toBe(false)
  })
})

// ============================================================================
// Adapter mapping (mocked request-scoped Supabase client)
// ============================================================================

/** Chainable, thenable mock of the PostgREST query builder */
function createMockBuilder(response: { data: unknown; error: unknown }) {
  const builder: Record<string, any> = {}
  const chain = (name: string) => {
    builder[name] = vi.fn(() => builder)
  }
  for (const method of ['select', 'eq', 'gte', 'lte', 'or', 'order', 'range', 'upsert']) {
    chain(method)
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(response))
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(response).then(resolve, reject)
  return builder
}

const mockState: { builders: Record<string, any> } = { builders: {} }

vi.mock('@/lib/db', () => ({
  get supabaseAdmin() {
    return {
      from: vi.fn((table: string) => mockState.builders[table]),
    }
  },
}))

/** products row as it exists in the DB (migrations 002 + 003 + 014) */
const dbRow = {
  id: 'a0000000-0000-0000-0000-000000000001',
  sku: 'GLMD-LASH-001',
  name: 'Ardell LashGrip Adhesive - Clear',
  brand: 'Ardell',
  barcode: '074764680259',
  category: 'eyelashes',
  collection: 'Lash Essentials',
  handle: 'ardell-lashgrip-adhesive-clear',
  description: 'Authentic Ardell lash-line product.',
  price: 135,
  b2b_bronze_price: 101,
  b2b_silver_price: 88,
  b2b_gold_price: 68,
  inventory: 72,
  in_stock: true,
  image_url: null,
  source_url: 'https://www.upcitemdb.com/upc/74764680259',
  tags: ['eyelashes', 'ardell', 'lash-essentials'],
}

describe('SupabaseCatalogAdapter mapping', () => {
  beforeEach(() => {
    mockState.builders = {}
  })

  test('getProductBySku maps DB columns to the contract shape (price → price_egp)', async () => {
    mockState.builders.products = createMockBuilder({ data: dbRow, error: null })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    const product = await new SupabaseCatalogAdapter().getProductBySku('GLMD-LASH-001')

    expect(product).not.toBeNull()
    expect(product?.price_egp).toBe(135)
    expect(product?.b2b_gold_price).toBe(68)
    expect(product?.collection).toBe('Lash Essentials')
    expect(product?.barcode).toBe('074764680259')
    expect(product?.tags).toEqual(['eyelashes', 'ardell', 'lash-essentials'])
    expect(mockState.builders.products.eq).toHaveBeenCalledWith('sku', 'GLMD-LASH-001')
  })

  test('getProductBySku returns null when no row exists', async () => {
    mockState.builders.products = createMockBuilder({ data: null, error: null })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    const product = await new SupabaseCatalogAdapter().getProductBySku('GLMD-LASH-999')
    expect(product).toBeNull()
  })

  test('getProductBySku throws a contract violation for rows that fail validation', async () => {
    mockState.builders.products = createMockBuilder({
      data: { ...dbRow, price: -1 },
      error: null,
    })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    await expect(new SupabaseCatalogAdapter().getProductBySku('GLMD-LASH-001')).rejects.toThrow(
      /Catalog contract violation/
    )
  })

  test('upsertProducts maps contract fields to DB columns and conflicts on sku', async () => {
    mockState.builders.products = createMockBuilder({
      data: [{ sku: 'GLMD-LASH-001' }],
      error: null,
    })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    const result = await new SupabaseCatalogAdapter().upsertProducts([validProduct])

    expect(result).toEqual({ count: 1, skus: ['GLMD-LASH-001'] })
    const [rows, options] = mockState.builders.products.upsert.mock.calls[0]
    expect(options).toEqual({ onConflict: 'sku', ignoreDuplicates: false })
    expect(rows[0]).toMatchObject({
      sku: 'GLMD-LASH-001',
      price: 135, // price_egp → price
      b2b_bronze_price: 101,
      collection: 'Lash Essentials',
      handle: 'ardell-lashgrip-adhesive-clear', // derived slug
      in_stock: true, // derived from inventory > 0
      inventory: 72,
    })
    expect(rows[0]).not.toHaveProperty('price_egp')
  })

  test('upsertProducts derives in_stock=false for zero inventory', async () => {
    mockState.builders.products = createMockBuilder({
      data: [{ sku: 'GLMD-LASH-001' }],
      error: null,
    })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    await new SupabaseCatalogAdapter().upsertProducts([{ ...validProduct, inventory: 0 }])
    const [rows] = mockState.builders.products.upsert.mock.calls[0]
    expect(rows[0].in_stock).toBe(false)
  })

  test('upsertProducts is a no-op for an empty batch', async () => {
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')
    const result = await new SupabaseCatalogAdapter().upsertProducts([])
    expect(result).toEqual({ count: 0, skus: [] })
  })

  test('getInventory maps inventory columns through the contract', async () => {
    mockState.builders.products = createMockBuilder({
      data: { sku: 'GLMD-LASH-001', inventory: 72, in_stock: true },
      error: null,
    })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    const level = await new SupabaseCatalogAdapter().getInventory('GLMD-LASH-001')
    expect(level).toEqual({ sku: 'GLMD-LASH-001', inventory: 72, in_stock: true })
  })

  test('listProducts applies filters and validates every row', async () => {
    mockState.builders.products = createMockBuilder({ data: [dbRow], error: null })
    const { SupabaseCatalogAdapter } = await import('@/lib/adapters/SupabaseCatalogAdapter')

    const products = await new SupabaseCatalogAdapter().listProducts({
      category: 'eyelashes',
      priceMin: 100,
      search: 'lash, (grip)',
    })

    expect(products).toHaveLength(1)
    expect(products[0].sku).toBe('GLMD-LASH-001')
    expect(mockState.builders.products.eq).toHaveBeenCalledWith('category', 'eyelashes')
    expect(mockState.builders.products.gte).toHaveBeenCalledWith('price', 100)
    // or() search term must be sanitized of PostgREST structural characters
    const orArg: string = mockState.builders.products.or.mock.calls[0][0]
    expect(orArg).not.toMatch(/[()]/)
    expect(orArg).toContain('name.ilike.')
  })
})
