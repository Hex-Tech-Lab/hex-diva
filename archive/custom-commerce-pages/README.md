# Archived: custom Next.js commerce pages

Archived 2026-07-23. Preserved here rather than deleted, per the same
policy applied to the earlier Stripe/PayTabs integrations (see ADR-012).

## What this is

The full pre-cutover state of `/shop`, `/shop/[handle]`, `/cart`,
`/checkout`, and their backing API routes (`/api/cart/*`,
`/api/products/*`), as they existed on `main` immediately before the
Shopify storefront cutover.

## Why it was removed from `main`

ADR-012 calls for checkout, payment, and fulfillment to route through
Shopify's native stack rather than custom code. These pages were built
contrary to that direction. Once the Shopify storefront
(`shop.diva.getmytestdrive.com`) went live with real products, cart,
and checkout, these pages became dead weight on `main` — duplicate,
unmaintained commerce surfaces that could drift out of sync with the
real storefront.

## Where to find it

This branch (`archive/custom-commerce-pages`) still has the full,
working files at their original paths (not moved into this directory —
this README just documents the archive). Check out this branch or use
`git show <commit>:<path>` against its history to retrieve any file.
