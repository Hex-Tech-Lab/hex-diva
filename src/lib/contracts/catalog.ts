/**
 * Catalog Domain Contracts (Wave 2.1)
 *
 * Zod schemas for the commerce catalog boundary. Every payload crossing a
 * catalog boundary (roster files, DB adapter output, API responses) must be
 * validated through these schemas.
 *
 * Field names align EXACTLY with the canonical roster shape
 * (scripts/roster-real.json) — flat b2b price columns, nullable barcode and
 * image_url/source_url.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Constants (no magic values inline)
// ---------------------------------------------------------------------------

/**
 * GlamD SKU format: GLMD-<category block>-<3 digit sequence>
 * Category block is 3-4 uppercase alphanumerics (roster uses LASH, NAIL, ACC)
 */
export const SKU_PATTERN = /^GLMD-[A-Z0-9]{3,4}-\d{3}$/

export const CATALOG_CATEGORIES = ['eyelashes', 'nails', 'accessories'] as const
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]

/** GTIN lengths accepted for the barcode field */
export const UPC_A_LENGTH = 12
export const EAN_13_LENGTH = 13

const GTIN_DIGITS_PATTERN = /^\d+$/
const GTIN_CHECK_MODULUS = 10
const GTIN_ODD_WEIGHT = 1
const GTIN_EVEN_WEIGHT = 3

// ---------------------------------------------------------------------------
// GTIN (UPC-A / EAN-13) check-digit validation
// ---------------------------------------------------------------------------

/**
 * Validate the check digit of a UPC-A (12-digit) or EAN-13 (13-digit) code.
 *
 * UPC-A is a subset of EAN-13 (a UPC-A code is the same GTIN with a leading
 * zero), so a 12-digit input is left-padded to 13 digits and validated with
 * the EAN-13 algorithm: positions 1..12 are weighted 1,3,1,3,... and the
 * check digit is (10 - sum mod 10) mod 10.
 */
export function isValidGtinCheckDigit(code: string): boolean {
  if (!GTIN_DIGITS_PATTERN.test(code)) return false
  if (code.length !== UPC_A_LENGTH && code.length !== EAN_13_LENGTH) return false

  const padded = code.padStart(EAN_13_LENGTH, '0')
  const checkDigit = Number(padded.charAt(EAN_13_LENGTH - 1))

  let sum = 0
  for (let i = 0; i < EAN_13_LENGTH - 1; i++) {
    // i is 0-based; position (i+1) odd → weight 1, even → weight 3
    sum += Number(padded.charAt(i)) * ((i + 1) % 2 === 1 ? GTIN_ODD_WEIGHT : GTIN_EVEN_WEIGHT)
  }

  const expected = (GTIN_CHECK_MODULUS - (sum % GTIN_CHECK_MODULUS)) % GTIN_CHECK_MODULUS
  return checkDigit === expected
}

/** Nullable barcode: UPC-A (12 digits) or EAN-13 (13 digits), check-digit validated */
export const BarcodeSchema = z
  .string()
  .regex(GTIN_DIGITS_PATTERN, 'barcode must contain only digits')
  .refine(
    (code) => code.length === UPC_A_LENGTH || code.length === EAN_13_LENGTH,
    `barcode must be ${UPC_A_LENGTH} (UPC-A) or ${EAN_13_LENGTH} (EAN-13) digits`
  )
  .refine(isValidGtinCheckDigit, 'barcode has an invalid check digit')
  .nullable()

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export const ProductSchema = z.object({
  sku: z.string().regex(SKU_PATTERN, 'sku must match GLMD-XXX(X)-NNN'),
  name: z.string().min(1),
  brand: z.string().min(1),
  barcode: BarcodeSchema,
  category: z.enum(CATALOG_CATEGORIES),
  collection: z.string().min(1),
  description: z.string().min(1),
  price_egp: z.number().positive(),
  b2b_bronze_price: z.number().positive(),
  b2b_silver_price: z.number().positive(),
  b2b_gold_price: z.number().positive(),
  inventory: z.number().int().min(0),
  image_url: z.url().nullable(),
  source_url: z.url().nullable(),
  tags: z.array(z.string()),
})

export type Product = z.infer<typeof ProductSchema>

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

/** Mirrors public.collections (migration 003) */
export const CollectionSchema = z.object({
  title: z.string().min(1),
  handle: z.string().min(1),
  description: z.string().nullable(),
  image_url: z.url().nullable(),
  position: z.number().int().nullable(),
  is_active: z.boolean(),
})

export type Collection = z.infer<typeof CollectionSchema>

// ---------------------------------------------------------------------------
// Inventory level
// ---------------------------------------------------------------------------

export const InventoryLevelSchema = z.object({
  sku: z.string().regex(SKU_PATTERN, 'sku must match GLMD-XXX(X)-NNN'),
  inventory: z.number().int().min(0),
  in_stock: z.boolean(),
})

export type InventoryLevel = z.infer<typeof InventoryLevelSchema>

// ---------------------------------------------------------------------------
// Roster file (bulk import payload)
// ---------------------------------------------------------------------------

export const RosterFileSchema = z.array(ProductSchema)

export type RosterFile = z.infer<typeof RosterFileSchema>
