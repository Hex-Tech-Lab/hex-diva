# Product Schema V2 — Shopify-Native, Provenance-Enforced

**Status**: Draft
**Date**: 2026-07-21
**Supersedes**: `docs/PRODUCT_SCHEMA.md` and the field shape used in
`docs/PRODUCT_DATABASE_100SKU.json` (both from the pre-ADR-012 custom-build
era). That JSON's data is fabricated (see `docs/adr/ADR-013-...` for the
audit) — this doc replaces its *shape*, not its content.

## Why a new schema

Two failures in the old one:
1. It didn't match Shopify's actual `ProductInput`/`Product` GraphQL types
   field-for-field, so every record needed lossy translation on import.
2. It had no place to record *how a claim was verified* — nothing stopped
   a `supplier` field from being a made-up label or an `image_url` from
   being a dead link, because nothing in the schema required evidence.

This version is (a) a strict superset of Shopify's own product fields, so
`productCreate`/`productSet` mutations map directly with no translation
layer, and (b) adds a `provenance` block per record that is **mandatory**
and gates whether a record is allowed to sync to Shopify at all.

## Core fields (1:1 with Shopify `ProductInput`)

| Field | Shopify field | Notes |
|---|---|---|
| `title` | `title` | Customer-facing name |
| `descriptionHtml` | `descriptionHtml` | Real product description, not template-filled |
| `handle` | `handle` | URL slug |
| `vendor` | `vendor` | **Must be the real sourcing company name** (see provenance) |
| `productType` | `productType` | e.g. "Eyelashes", "Nails", "Accessories" |
| `category` | `category` | Shopify standard product taxonomy ID (sg-4-17-2-17 style) |
| `tags` | `tags` | Real, specific — not generic filler |
| `status` | `status` | `DRAFT` until provenance passes; `ACTIVE` only after quality gate (below) |
| `seo.title` / `seo.description` | `seo` | |
| `options[]` / `variants[]` | `productOptions`, variant mutations | shade/length/style/quantity as applicable |
| `metafields[]` | `metafields` | Used for B2B tiering, sourcing batch ID (below) |

### Variant-level (per Shopify `ProductVariantsBulkInput`)
`sku`, `price`, `compareAtPrice`, `barcode`, `inventoryQuantity`,
`weight`/`weightUnit`, `requiresShipping`, `taxable`, `image` (variant-specific
media reference).

### Media
Each product requires ≥1 `media` entry with a real, resolving image URL
(`altText` required, not empty). No placeholder-domain URLs. Video/3D
optional.

## Extension fields (not native Shopify — stored as `metafields` in the
`hexdiva` namespace so they round-trip through the Shopify API cleanly)

| Metafield key | Purpose |
|---|---|
| `hexdiva.b2b_bronze_price` / `_silver_price` / `_gold_price` | B2B tier pricing (0.75x / 0.65x / 0.50x of retail, per existing model) |
| `hexdiva.supplier_cost_usd` | Real landed cost from the real supplier quote |
| `hexdiva.sourcing_batch_id` | Links back to the provenance record (below) — traceability |
| `hexdiva.quality_grade` | Output of the quality gate, see below |

## Provenance block (mandatory, gates sync — not sent to Shopify itself,
stored in Supabase alongside the mirrored record, see ADR-013)

```json
{
  "provenance": {
    "supplier_name": "string — real, verifiable company name",
    "supplier_url": "string — live URL to the supplier's real storefront/listing",
    "supplier_platform": "1688 | Alibaba | direct-factory | trade-show | other",
    "verification_method": "exa_search | serpapi_search | webfetch_direct | manual",
    "verification_date": "ISO 8601",
    "verification_evidence_url": "string — the actual page checked",
    "image_source_url": "string — where the real photo came from",
    "image_verified_resolves": true,
    "price_source": "string — quote, listing price, or MOQ pricing tier cited",
    "duplicate_check": "not a template match against any other SKU in this batch"
  }
}
```

## Quality gate — definition of "highest quality," testable

A record may only be marked `status: ACTIVE` (live on the storefront) if
ALL of the following pass. Anything short of this stays `DRAFT`.

1. **Sourcing** — `supplier_name` resolves to a real, currently-operating
   business (verified via search, not assumed); `supplier_url` returns
   HTTP 200 and shows a matching product.
2. **Imagery** — `image_source_url` returns HTTP 200, is a real product
   photograph (not a stock/generic placeholder, not a logo, not a graphic),
   minimum 800×800px, and visually matches the `title`/`descriptionHtml`
   (checked via vision review, not assumed from the filename).
3. **Pricing** — `supplier_cost_usd` is traceable to an actual quoted or
   listed price at a stated MOQ, not a formula guess. Retail/B2B tiers are
   then derived from that real cost using the existing markup model — the
   *cost* must be real; the *markup math* on top of it is fine to compute.
4. **No fabricated claims** — no invented trend/virality scores. If a
   social-proof claim is made, it must cite a real, checkable source or be
   omitted entirely.
5. **Uniqueness** — description text is not a template with nouns swapped
   from another SKU in the same batch; spot-checked for near-duplicate
   phrasing.
6. **Higher-than-market-baseline quality claim** — since these are
   positioned as *higher quality than typical Chinese-import eyelash/nail/
   accessory listings*, the specific quality differentiator (material,
   construction, certification, reviews) must be stated and sourced, not
   asserted as marketing copy alone.

## Import path

`docs/catalog/*.json` (schema above) → validation script checks the
quality gate → passing records get `productSet`/`productCreate` mutations
against Shopify (blocked until the store's billing issue clears) AND a
mirrored row in Supabase (`products` + `product_provenance` tables per
ADR-013) regardless of Shopify's availability, so the replica stays
current even while the primary sync is blocked.
