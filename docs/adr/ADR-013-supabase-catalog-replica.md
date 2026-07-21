# ADR-013: Supabase as a Continuously-Synced Shopify Catalog Replica

**Status**: Accepted
**Date**: 2026-07-21
**Relates to**: ADR-012 (Shopify-native commerce). This does not reverse
ADR-012 — Shopify remains the single source of truth for the live catalog.
This adds a read-side safety net, not a second write path.

## Context

Founder's own framing: "we need to have Shopify as the single source of
truth... but... we should have a backup plan if we need to move away from
Shopify for whatever reason. We should replicate the database exactly into
our own database as if it's a same copy... even if it's an independent
database that's just being updated for the sake of having a fallback if
needed."

This is a reasonable, low-risk hedge: three stores (cosmetics, car
accessories, apparel) all sit on Shopify per ADR-012. A platform-level
risk — pricing changes, policy changes, an account issue like the current
billing block, or a strategic decision to leave — is exactly the kind of
thing worth insuring against cheaply now rather than solving under
pressure later.

## Decision

Maintain a **Supabase mirror of the Shopify product catalog**, kept
current via Shopify's own webhooks, that is read-only from the
application's perspective and never a source of truth while Shopify is
operational. It exists purely so that, if Shopify ever becomes
unavailable or the business decides to migrate off it, there is a
complete, current, exportable copy of the catalog — not a re-sourcing
project.

### What gets mirrored

Table `shopify_catalog_mirror` (new, additive — does not touch the
existing `products` table used by the storefront today):

| Column | Source |
|---|---|
| `shopify_product_id` | Shopify `Product.id` (GID) |
| `handle`, `title`, `description_html`, `vendor`, `product_type`, `tags`, `status` | 1:1 Shopify fields |
| `category_id` | Shopify taxonomy category |
| `variants` (jsonb) | Full variant array: sku, price, compareAtPrice, barcode, inventoryQuantity, weight |
| `media` (jsonb) | Full media array: url, altText, mediaType |
| `metafields` (jsonb) | Full `hexdiva.*` namespace metafields (B2B pricing, sourcing batch ID, quality grade — see `docs/catalog/PRODUCT_SCHEMA_V2.md`) |
| `raw_product_json` (jsonb) | The full Shopify API response, verbatim — belt-and-suspenders so no field is ever silently dropped by an incomplete column mapping |
| `synced_at` | Timestamp of last successful sync |
| `sync_source` | `webhook` \| `backfill` |

### Sync mechanism

- **Webhook-driven, one-way, Shopify → Supabase.** Subscribe to
  `products/create`, `products/update`, `products/delete` (already have a
  webhook handler pattern at `src/app/api/webhooks/shopify/route.ts` —
  extend it, don't build a new endpoint).
- On receipt: idempotent upsert into `shopify_catalog_mirror` keyed on
  `shopify_product_id`, using the existing idempotency pattern
  (`src/lib/webhooks/idempotencyManager.ts`) so replayed webhooks don't
  corrupt state.
- **Nightly full backfill** as a reconciliation pass (catches anything a
  dropped webhook missed) — compare mirror row count and a content hash
  per product against a fresh Admin API pull; log and alert on drift, but
  Shopify always wins the diff, never the mirror.
- No write path back to Shopify from this table, ever, while Shopify is
  the active platform. It is not a queue, not a staging table for
  changes — purely a passive copy.

### What this explicitly does NOT do

- Does not change where the storefront reads product data from today
  (still Shopify's Storefront/Admin API per ADR-012).
- Does not let this mirror silently become a second source of truth —
  if it ever needs to, that's a new, explicit decision (a migration
  event), not a gradual drift, which is the exact failure ADR-012 was
  written to correct.
- Does not require Shopify Admin API access to *exist* as a schema — the
  table and sync code can be built now; it just has nothing to sync until
  the store's billing/plan block (tracked separately) clears.

### Cost/complexity

Cheap: one additive table, one extended webhook handler, one scheduled
job. No new infrastructure, no new provider, no ongoing decision burden —
this is exactly the kind of low-cost insurance ADR-012's own trigger
conditions describe as *not* requiring "Optimus"-tier custom engineering,
because it doesn't replace or compete with Shopify, it just watches it.

## Revival path (if Shopify is ever actually left)

The mirror plus `raw_product_json` per product is enough to reconstruct
a full catalog export (CSV, another platform's import format, or a
from-scratch custom store) without re-doing product research. That is
the entire point — this ADR is the insurance policy, not a plan to use
it.
