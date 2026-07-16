/**
 * Roster Importer CLI (Wave 2.1)
 *
 * Validates a product roster JSON file against RosterFileSchema and upserts
 * it into the products table via SupabaseCatalogAdapter (idempotent on sku).
 *
 * Usage:
 *   pnpm tsx scripts/import-roster.ts [path/to/roster.json] [--dry-run]
 *
 * Defaults to scripts/roster-real.json when no path is given.
 * --dry-run validates and prints the summary without touching the database.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local when present).
 *
 * Hard-fails (exit 1) listing EVERY invalid row before any write happens.
 */

import fs from 'fs'
import path from 'path'

const DEFAULT_ROSTER_PATH = 'scripts/roster-real.json'
const UPSERT_BATCH_SIZE = 25
const DRY_RUN_FLAG = '--dry-run'
const EXIT_INVALID_INPUT = 1

/** Minimal .env.local loader (same approach as vitest.config.ts) */
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.substring(0, index).trim()
    const value = trimmed
      .substring(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main(): Promise<void> {
  loadEnvLocal()

  const args = process.argv.slice(2)
  const dryRun = args.includes(DRY_RUN_FLAG)
  const rosterPath = path.resolve(
    process.cwd(),
    args.find((arg) => arg !== DRY_RUN_FLAG) ?? DEFAULT_ROSTER_PATH
  )

  if (!fs.existsSync(rosterPath)) {
    console.error(`Roster file not found: ${rosterPath}`)
    process.exit(EXIT_INVALID_INPUT)
  }

  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(rosterPath, 'utf8'))
  } catch (parseError) {
    console.error(`Roster file is not valid JSON: ${(parseError as Error).message}`)
    process.exit(EXIT_INVALID_INPUT)
  }

  // Contract validation — collect and report EVERY invalid row, then hard-fail
  const { RosterFileSchema } = await import('../src/lib/contracts/catalog')
  const parsed = RosterFileSchema.safeParse(raw)

  if (!parsed.success) {
    const byRow = new Map<string, string[]>()
    for (const issue of parsed.error.issues) {
      const [rowIndex, ...fieldPath] = issue.path
      const rowKey = typeof rowIndex === 'number' ? `row ${rowIndex}` : 'file'
      const field = fieldPath.length > 0 ? fieldPath.join('.') : '(row)'
      const existing = byRow.get(rowKey) ?? []
      existing.push(`${field}: ${issue.message}`)
      byRow.set(rowKey, existing)
    }
    console.error(`Roster validation FAILED — ${byRow.size} invalid row(s):`)
    const rows = Array.isArray(raw) ? (raw as Array<{ sku?: unknown }>) : []
    for (const [rowKey, problems] of byRow) {
      const index = Number(rowKey.replace('row ', ''))
      const sku = Number.isInteger(index) && rows[index] ? String(rows[index].sku ?? 'unknown') : 'n/a'
      console.error(`  ${rowKey} (sku=${sku})`)
      for (const problem of problems) console.error(`    - ${problem}`)
    }
    process.exit(EXIT_INVALID_INPUT)
  }

  const roster = parsed.data

  // Intra-file duplicate SKUs would break a single-batch upsert and signal bad data
  const seen = new Set<string>()
  const duplicates = roster.filter((product) => {
    if (seen.has(product.sku)) return true
    seen.add(product.sku)
    return false
  })
  if (duplicates.length > 0) {
    console.error(
      `Roster validation FAILED — duplicate SKUs: ${duplicates.map((p) => p.sku).join(', ')}`
    )
    process.exit(EXIT_INVALID_INPUT)
  }

  const byCategory = roster.reduce<Record<string, number>>((acc, product) => {
    acc[product.category] = (acc[product.category] ?? 0) + 1
    return acc
  }, {})

  console.log(`Roster valid: ${roster.length} products from ${rosterPath}`)
  console.log(`  by category: ${JSON.stringify(byCategory)}`)

  if (dryRun) {
    console.log('Dry run — no database writes performed.')
    return
  }

  const { SupabaseCatalogAdapter } = await import('../src/lib/adapters/SupabaseCatalogAdapter')
  const adapter = new SupabaseCatalogAdapter()

  let written = 0
  const batchCount = Math.ceil(roster.length / UPSERT_BATCH_SIZE)
  for (let i = 0; i < roster.length; i += UPSERT_BATCH_SIZE) {
    const batch = roster.slice(i, i + UPSERT_BATCH_SIZE)
    const batchNumber = i / UPSERT_BATCH_SIZE + 1
    const result = await adapter.upsertProducts(batch)
    written += result.count
    console.log(`  batch ${batchNumber}/${batchCount}: upserted ${result.count} products`)
  }

  console.log(`Import complete: ${written}/${roster.length} products upserted (idempotent on sku).`)
}

main().catch((error) => {
  console.error('Import failed:', error)
  process.exit(EXIT_INVALID_INPUT)
})
