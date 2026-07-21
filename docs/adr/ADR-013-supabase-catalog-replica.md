# ADR-013: Supabase as a Continuously-Synced Full Shopify Mirror

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

---

## Scope expansion (2026-07-21): full business-entity mirror, not just catalog

Founder's own framing: mirror should cover "customers, suppliers,
products, transactions, payouts, fulfillment, etc. with entity and
detail and all possible key or links and indexes" — not just the product
catalog. Same rule as above applies to every table below: **passive,
webhook-synced, read-only, Shopify wins every diff, no write path back.**
Field names below are pulled directly from the live Shopify Admin GraphQL
schema (`Order`, `Customer`, `OrderTransaction` types, introspected
2026-07-21) so a mirror row is a faithful 1:1 copy, not a lossy
approximation — see `migrations/018_shopify_full_mirror.sql`.

### Entities mirrored

| Table | Shopify source | Key fields (non-exhaustive — `raw_json` always keeps the full object) |
|---|---|---|
| `shopify_catalog_mirror` | `Product` | (unchanged, see above) |
| `shopify_customers_mirror` | `Customer` | `id`, `displayName`, `defaultEmailAddress`, `defaultPhoneNumber`, `defaultAddress`, `amountSpent`, `numberOfOrders`, `tags`, `taxExempt`, `verifiedEmail`, `createdAt`, `updatedAt` |
| `shopify_orders_mirror` | `Order` | `id`, `name`, `email`, `customer_id` (FK → `shopify_customers_mirror`), `displayFinancialStatus`, `displayFulfillmentStatus`, `currentTotalPriceSet`, `currentSubtotalPriceSet`, `totalTaxSet`, `totalShippingPriceSet`, `poNumber`, `sourceName`, `tags`, `createdAt`, `processedAt`, `updatedAt`, `cancelledAt` |
| `shopify_order_line_items_mirror` | `Order.lineItems` | `id`, `order_id` (FK), `product_id`/`variant_id` (FK → `shopify_catalog_mirror`), `sku`, `title`, `quantity`, `originalUnitPriceSet`, `discountedUnitPriceSet` |
| `shopify_transactions_mirror` | `OrderTransaction` | `id`, `order_id` (FK), `kind`, `status`, `gateway`, `amountSet`, `parentTransaction_id` (self-FK, e.g. capture→authorization), `processedAt`, `test` |
| `shopify_fulfillments_mirror` | `Fulfillment` | `id`, `order_id` (FK), `status`, `trackingCompany`, `trackingNumbers`, `trackingUrls`, `location_id`, `createdAt`, `updatedAt`, `deliveredAt`, `estimatedDeliveryAt` |
| `shopify_refunds_mirror` | `Refund` | `id`, `order_id` (FK), `note`, `totalRefundedSet`, `createdAt`, `processedAt` |
| `shopify_payouts_mirror` | `ShopifyPaymentsPayout` | `id`, `status`, `amount` (MoneyV2), `issuedAt`, `net` — **N/A while store isn't on Shopify Payments** (per ADR-012, Egypt isn't supported); table exists for schema completeness/future-proofing, will stay empty until/unless that changes |
| `supplier_provenance` | **not a Shopify entity** — custom, sources our own procurement side (see `docs/catalog/PRODUCT_SCHEMA_V2.md`'s `provenance` block) | `id`, `product_sku` (FK → `shopify_catalog_mirror.variants[].sku`), `supplier_name`, `supplier_url`, `supplier_platform`, `verification_method`, `verification_date`, `verification_evidence_url` |

### Keys & indexes

- Every `*_mirror` table's Shopify-side primary key is `TEXT UNIQUE NOT NULL` holding the Shopify GID verbatim (never re-encoded) — this is what every FK below points to, not a synthetic Supabase-side ID, so joins survive a full resync without remapping.
- `shopify_orders_mirror.customer_id` → `shopify_customers_mirror.shopify_customer_id`, indexed (customer order history is the highest-traffic query this mirror needs to support if ever activated).
- `shopify_order_line_items_mirror.order_id` → `shopify_orders_mirror.shopify_order_id`, indexed.
- `shopify_transactions_mirror.order_id` → `shopify_orders_mirror.shopify_order_id`, indexed; `parent_transaction_id` self-referencing FK, nullable.
- `shopify_fulfillments_mirror.order_id` → `shopify_orders_mirror.shopify_order_id`, indexed.
- `shopify_refunds_mirror.order_id` → `shopify_orders_mirror.shopify_order_id`, indexed.
- `supplier_provenance.product_sku` indexed (not a hard FK — SKU is a string match against a JSONB array inside `shopify_catalog_mirror.variants`, not a normalized row, so this is an application-level link, documented as such rather than faked as a DB-enforced one).
- All mirror tables: `synced_at` indexed (drives the nightly reconciliation pass), `sync_source` (`webhook`/`backfill`) for audit.

### Why customers/orders/transactions/fulfillment too, not just products

The founder's rationale extends cleanly: if Shopify access is ever
disrupted, the business needs more than a product list to operate or
migrate — it needs order history (for customer service continuity),
transaction records (for accounting/reconciliation), and fulfillment
records (for support/tracking disputes). Same insurance logic as the
catalog mirror, same passive/no-write-back constraint, same cost profile
(webhook subscriptions already exist for `orders/*`, extending them to
persist into these tables is incremental, not new infrastructure).

### What's explicitly NOT built here

- No payout *processing* logic — `shopify_payouts_mirror` is a passive
  copy of Shopify Payments' own payout records, not a substitute payout
  engine. Commission payouts to referral affiliates are a separate,
  already-existing system (`commissions` table) and out of scope for
  this ADR.
- No customer PII handling beyond what Shopify already stores and
  already governs under its own GDPR/data-export tooling — this mirror
  doesn't create a new compliance surface, it copies an existing one
  under the same constraints (RLS service-role-only, same as the catalog
  mirror).
