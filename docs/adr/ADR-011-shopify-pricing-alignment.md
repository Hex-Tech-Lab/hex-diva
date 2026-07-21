# ADR-011: Price Field Non-Nullability (Shopify-Aligned)

**Status**: Accepted
**Date**: 2026-07-19

## Context
Shop page crashes calling `.toFixed()` on nullable `price_egp`. Reviewed Shopify's native model via Admin GraphQL API docs.

## Shopify's Native Approach
- `ProductVariant.price` is `Money!` (non-nullable). Amount is always a string decimal, never null.
- Multi-currency handled via **Markets** + `contextualPricing(context: {country})`, not nullable base price.
- A variant with no price is not sellable — Shopify requires price at creation.

## Decision
Align 1:1 with Shopify:
1. `products.price_egp` becomes `NOT NULL DEFAULT 0` (matches `Money!`).
2. `available_for_sale` computed as `price_egp > 0 AND inventory > 0` — no price = not sellable, exactly like Shopify.
3. Frontend types: `price_egp: number` (not `number | null`). No defensive null-checks needed on render since the contract guarantees a number.
4. Multi-currency (future): add `currency_code` column (default `EGP`) — single-currency now, Markets-style expansion later without breaking this contract. Not implemented now (no current requirement/multi-market need) — flagged, not built.

## Consequence
No band-aid null-guards in UI. Root-caused at the schema/contract level like Shopify does it.
