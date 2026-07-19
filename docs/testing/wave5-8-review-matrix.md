# Wave 5-8 Review Matrix (pr-review-workflow Phase 2)

**Created**: 2026-07-19
**Source**: CodeRabbit full review scrape (PRs #23, #24, #25) — reconciled with manual local `pnpm build` verification

---

## Wave A: Build Blockers (RESOLVED — commits pushed)

These were discovered by running the actual `pnpm build` locally (Vercel/Netlify's real check), not just `tsc --noEmit`. All three PR branches had independent instances of the same bug classes.

| # | File | Issue | Branch | Status |
|---|---|---|---|---|
| A1 | `api/products/[id]` vs `[handle]` | Ambiguous route — [id] was dead pre-Wave-5 code | wave-5 | ✅ Fixed (`da0cefe`) |
| A2 | `package.json` | Missing `uuid` dependency (imported, never installed) | wave-5, wave-6 | ✅ Fixed |
| A3 | `cart/items/[product_id]`, `orders/[id]`, `products/[handle]` | Next.js 16 requires `params: Promise<{...}>` | wave-5, wave-6, wave-7 | ✅ Fixed |
| A4 | `shop/[handle]/page.tsx` + API | Detail page never got Wave 5 Shopify alignment — read pre-migration columns (`name`, `image_url`, `price_egp`) | wave-5 | ✅ Fixed |
| A5 | `database.types.ts` | Stale, missing migration 015 columns (handle, vendor, featured_image_url, etc.) | wave-5 | ✅ Patched manually |
| A6 | `migrations/016_price_not_null.sql` | Targeted `price_egp` (legacy dupe) instead of `price` (actual field in use) | wave-5 | ✅ Fixed |
| A7 | `eslint.config.js` (stray) | Accidentally committed flat-config file broke `--ext` flag | wave-5 | ✅ Removed |
| A8 | `src/app/\(dashboard\)/upgrade-to-b2b` | Shell-escaping byproduct directory shadowed real route | wave-7 | ✅ Removed (duplicate existed) |
| A9 | `src/app/api/cart/items/\[product_id\]` | Same escaping bug, but no working duplicate existed | wave-7 | ✅ Renamed (recovered functionality) |

**Impact**: All three branches now produce a clean `pnpm build` + `pnpm lint`. This was the true P0 — CodeRabbit's docstring/logic findings below don't matter if the app doesn't build.

---

## Wave B: CodeRabbit Findings — Not Yet Addressed

Scraped from PR #23/#24/#25 review threads (user-provided + gh api). Grouped by target file. **Verify each against current code before fixing — some may already be stale after Wave A changes.**

### B1. Payment Provider Docs (`docs/PAYMENT_PROVIDER_ARCHITECTURE*.md`)
Design-doc only — no shipped code yet. Lower urgency; fix before Wave 6.5/implementation, not blocking current merge.
- Missing `mapToCanonical`/`logFallback` method definitions
- `PaymentProviderSelector` async init race (constructor calls async `buildProviderChain()` without awaiting)
- Encryption not enforced for `webhook_secret`/`config` — only documented via comment
- Provider-chain caching doesn't invalidate on `is_enabled`/`priority` DB changes
- Stripe idempotency key not passed as 2nd arg to `checkout.sessions.create`
- `orderId` required in `payment_sessions` insert but not guaranteed present
- Health-status filtering missing from `buildProviderChain`
- `payout_account` treated as sensitive but not encrypted/RLS-restricted
- Markdown lint (MD022/MD040) — blank lines around headings/code fences
- Duplicate `providerId` field in canonical contract; invalid ISO8601 type
- Webhook secret assumed uniform HMAC-SHA256 — Stripe uses provider-specific `stripe-signature`
- `checkout2` should be `2checkout` to match provider union
- `payment_events.transaction_id` should not be UNIQUE (breaks multi-event lifecycle)

**Recommendation**: Wave 6.5 doc-fix pass, separate PR, no code risk.

### B2. Migrations
- `015_wave5_catalog_pricing.sql`: inline `COMMENT` clauses invalid — needs separate `COMMENT ON COLUMN` statements
- `015_wave5_catalog_pricing.sql`: `RENAME COLUMN IF EXISTS` is invalid Postgres syntax — needs `information_schema` guard
- `015_wave5_catalog_pricing.sql`: products SELECT policy should allow anonymous storefront reads (currently `authenticated`-only)
- `016_price_not_null.sql`: ~~targets wrong column~~ **already fixed in Wave A (A6)**
- `016_price_not_null.sql`: recommend staged `CHECK ... NOT VALID` + separate validation instead of direct `SET NOT NULL` (lock duration)

**Recommendation**: Wave 5.5, same PR as B4 (both touch migrations/API contract).

### B3. Cart Routes (`api/cart/*`)
- Non-atomic read-modify-write in cart mutation (race condition on concurrent add)
- `extractSessionId` duplicated across 3 files — extract shared helper
- Cart totals calculation (`computeCartTotals`) duplicated across 3 files
- GET cart should use `maybeSingle()` not `single()` (session w/o cart should return null, not error)
- Insert-cart branch doesn't handle insert error before using `cart`
- PATCH quantity update doesn't validate against `products.inventory` before assigning

**Recommendation**: Wave 5.6 — cart atomicity pass.

### B4. Checkout/Webhook Routes
- `stripe_payment_intent_id` persisted before payment confirms (should come from webhook only)
- Idempotency key should derive from `user.id` + cart contents, not `orderId` (retries of same cart should collide)
- `getSupabase()` in checkout route doesn't appear to receive request cookie context — verify auth wiring
- Stripe webhook: `STRIPE_WEBHOOK_SECRET` unset should fail fast, not silently proceed with `''`

**Recommendation**: Wave 6.5 — checkout hardening.

### B5. Accessibility
- Orders dashboard: clickable `<div>` should be `<button>`
- Shop page: filter min/max inputs missing label association; toggle button missing `type="button"`
- Product detail: quantity buttons missing `type="button"` (partially fixed in Wave A — verify)

**Recommendation**: Wave 5.7 — quick pass, low risk.

### B6. Type Safety
- `as any` casts throughout cart/product routes — root cause was stale `database.types.ts` (**Wave A partially addresses this for products; cart routes still need audit**)

---

## Choreography Plan (avoid cross-PR conflicts)

Waves 5/6/7 are separate PRs against `main`, each on its own branch — no shared branch, so sequencing them just needs each PR's base kept in sync if `main` moves. Order of execution:

1. **Now**: Wave A (done, pushed) — unblocks CI/Vercel/Netlify on all 3 PRs
2. **Wave 5.5** (new commits on `wave-5-product-catalog`): B2 migrations + B6 remaining type audit
3. **Wave 5.6** (same branch): B3 cart atomicity
4. **Wave 5.7** (same branch): B5 accessibility
5. **Wave 6.5** (`wave-6-inventory-payments`): B4 checkout/webhook hardening
6. **Wave 6.6** (doc-only, any branch): B1 payment provider doc fixes — no code, no conflict risk

Each sub-wave = one commit, pushed immediately, re-triggers CI. Do not batch all of B into one giant commit — keep P0 (build/security) separate from P2 (a11y/docs) so partial merges are possible if reviewers want to unblock faster.
