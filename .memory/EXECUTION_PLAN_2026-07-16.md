# Execution Plan — Stabilization & Commerce Core (2026-07-16)

Baseline: `main @ 01c0b0d`. No open PRs. Audit evidence: RA-1..RA-5 (2026-07-15, Fable-Orchestrator session).
Protocol: one branch + one PR per task-cluster. Implementer ≠ reviewer — Fable-Orchestrator reviews every PR before merge.
Doctrine (non-negotiable): DDD-lite / hexagonal-lite (domain in `lib`, DB only via adapters), contracts at every boundary (zod or typed interfaces), centralized constants (no magic values inline), and **end-to-end chain review** for every touched point — a fix qualifies only after the full input→output workflow is re-verified.
Gates per PR (all mandatory): `pnpm type-check` · `pnpm build` · QA-Intel (`cp scripts/verify-quality-engine.ts scripts/verify-quality-engine.mts && pnpm tsx scripts/verify-quality-engine.mts; rm -f scripts/verify-quality-engine.mts`) zero criticals · existing tests green · ledger line flipped to [DONE].

---

## WAVE 1 — Stabilization (parallel; file ownership is exclusive per task)

### W1A — Money integrity — branch `fix/wave1a-commission-integrity`
Owns: `migrations/009_*.sql` (new), `src/lib/adapters/CommissionRepositoryAdapter.ts`, `src/lib/adapters/IdempotencyStoreAdapter.ts`, `src/lib/referrals.ts`, `src/lib/uppromote.ts`, `src/app/api/webhooks/{shopify,uppromote,orders}/route.ts`, `src/app/api/commissions/process-order/route.ts`, `src/types/database.types.ts`.
Note: stash "W1A partial" holds a prior agent's test-mock start — optional to reuse.
1. mig 005:20-21 `ADD CONSTRAINT IF NOT EXISTS` = invalid PG → constraint never existed. Mig 009: dedupe existing rows (keep earliest) then `CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_referrer_order ON commissions(referrer_id, order_id)`.
2. CommissionRepositoryAdapter:61-128 check-then-insert TOCTOU → upsert `onConflict: 'referrer_id,order_id'`, return canonical existing row on conflict.
3. CommissionRepositoryAdapter:240-260 `updateReferralStats` never increments → atomic increment RPC (mig 009) for total_conversions/total_commission_earned/volume_month.
4. Unify commission engines: referrals.ts (5/10/15% count-based; canonical — scheduler uses it) vs uppromote.ts:38-60 (7/10/12% volume). One module exports calculateCommission/determineTier; uppromote/route.ts:87-99 inline insert must go through the adapter. Fix uppromote.ts:338 in-place sort; uppromote/route.ts:77 local getMonth → single UTC reset implementation (delegate to scheduler logic).
5. uppromote/route.ts:351-366: sync-log insert out of the release-guarded try (post-completion failure must not release a completed key); add idempotency guard to handlePayoutProcessed (currently ZERO guard → duplicate payout rows).
6. shopify/route.ts:60-105,137-140: check every supabase `error`; failed write ⇒ processingResult failure ⇒ webhook NOT cached completed.
7. IdempotencyStoreAdapter: 7-day TTL on `processing` placeholder → crash = 7 days of 500s. Short-TTL (60s) + owner token; atomic Lua compare-and-delete release (Law #1); check setex returns.
8. process-order/route.ts:132-140: second `request.json()` on consumed body → parse once.
9. database.types.ts: add commissions cols from mig 005 (webhook_id, idempotency_key, webhook_processed_at); referrals.ts CommissionRecord drift ('custom' tier, tier_multiplier).
PR title: `fix(commissions): enforce DB idempotency, unify commission engine, and harden webhook money paths`.

### W1B — Auth hardening — branch `fix/wave1b-auth-hardening`
Owns: `src/app/api/auth/{login,refresh,logout,signup,me,reset-password}/route.ts`, `src/middleware.ts`, `src/lib/admin/auth.ts`, `src/middleware/withAdminAuth.ts`, `src/lib/auth.ts`.
1. login/route.ts:44 returns refresh_token in JSON → remove (cookies only); check signup too.
2. middleware.ts:4-19 `'/'` + startsWith matches everything → ALL protection dead. Exact-match '/' + prefix others; verify /dashboard anon-redirect works.
3. logout/route.ts:10-21 skips revocation when access cookie expired (common case) → revoke whenever refresh cookie exists.
4. me/route.ts:17-26 + admin/auth.ts:85-94: setSession silently rotates + discards refresh token → random logouts. Either write rotated tokens back, or autoRefreshToken:false on read paths + 401 on expired access (refresh route owns rotation). One strategy, both places.
5. refresh/route.ts:9-19 remove body-token fallback entirely.
6. admin/auth.ts:31-35 whitelist case-fold at parse time (.toLowerCase().trim()).
7. Shared setAuthCookies/clearAuthCookies helper = single source for cookie names/attrs/maxAge; signup parity (currently missing path:'/').
8. withAdminAuth.ts:80-87 stop returning raw error.message.
9. Validated getAppUrl() helper — unset NEXT_PUBLIC_APP_URL currently yields "undefined/auth/callback" in signup/reset-password/lib/auth.ts.
PR title: `fix(auth): close refresh-token exposure, dead middleware protection, and session rotation gaps`.

### W1C — Settings foundation rebuild — branch `fix/wave1c-settings-foundation`
Owns: `src/lib/admin/*`, `src/app/api/admin/settings/route.ts`, `src/config/settings.ts`, `migrations/010_*.sql` (new).
User decision (2026-07-15): stabilize foundationally — DB-backed, contract-based; no more file mutation.
Why: route.ts:199 commits the UNMUTATED GitHub copy (every approve = silent no-op reporting success); settingsMutator.ts:163 global regex ignores `section` and rewrites every same-named field (9× discountValue corruption); rollback is dead code; drafts in per-lambda Map; audit rows written before durable outcomes; Vercel fs is read-only so local mutation is production-broken anyway.
1. Mig 010: `platform_settings` table (key, section, value jsonb, version, updated_by, updated_at) + settings_audit (status state machine: DRAFT→APPROVED→APPLIED/FAILED, CAS transitions `UPDATE ... WHERE status=expected`, idempotency_key unique).
2. Zod contract for the full settings shape (single module, exported types); `src/config/settings.ts` becomes the fallback/default seed only.
3. Request-scoped SettingsRepository adapter (Law #2); reads cached via Redis (TTL 5m) with invalidation on write.
4. Route: propose/approve/discard against DB records (no module-level Map); audit row updated AFTER each durable effect; discard is audited.
5. Retire githubManager/gitManager/settingsMutator/vercelManager from the settings path (delete dead gitManager.ts; keep githubManager only if another consumer exists — grep first).
6. Also in this wave (schema adjacency): fix users.tier RLS unsatisfiability — mig 010 extends users tier check to include 'admin' (or switches policies to the email-whitelist function) so 006's admin read policies on webhook_events/metrics/replays become satisfiable.
PR title: `feat(settings): DB-backed contract-based settings with CAS state machine (retires file-mutation pipeline)`.

### W1D — Frontend P0 — branch `fix/wave1d-frontend-p0`
Owns: `src/styles/landing.css`, `src/styles/glamd-tokens.css`, `src/components/landing/*.tsx`, `src/app/layout.tsx` (viewport export only).
1. landing.css ~:179 drawers/scrim styled only inside `@media (max-width:1024px)` → desktop renders raw drawer markup over the hero (VISIBLY BROKEN). Base `display:none` + `visibility:hidden`/inert when closed (off-screen links must leave tab order).
2. SiteHeader.tsx:191-206 megamenu keyboard path: aria-controls, Escape closes, don't close on sibling focus, Tab reaches panel links; keep 180ms mouse hover-close.
3. Drawer/cart dialog semantics: role="dialog", aria-modal, focus in on open / restore on close, minimal trap.
4. layout.tsx: drop `maximumScale:1` (WCAG 1.4.4).
5. landing.css:6-22 unscoped `*`/html/body + !important leak into all routes → scope to .glamd-page / body:has(.glamd-page), keep S25FE fixes.
6. Contrast: new text-safe gold token (~#8F6E1F region, ≥3:1 large/UI, ≥4.5:1 body) for --color-text-accent, commitments icons on cream, brand on solid header. Gold-on-charcoal stays.
7. Adjacent wins: MobileTabBar action mismatches (Wishlist currently opens CART; container → <nav>), reduced-motion for cart-pulse-shimmer/tab-bar/drawer slide, AnnouncementBar inline style → class, hero 100vh → 100dvh (+fallback).
DO NOT touch commitments icon choice (webp vs Phosphor) — pending user decision (webps orphaned in public/landing/).
PR title: `fix(landing): desktop drawer leak, megamenu keyboard access, and WCAG P0s`.

## WAVE 2 — Commerce core (after W1A + W1C merge; user decisions locked 2026-07-15)
Mode: Supabase-first behind CatalogPort; Shopify dev store later (throwaway name is safe — only the .myshopify.com subdomain is sticky; port swap = env change).
- 2.1 Contracts: CatalogPort + Product/Collection/Inventory zod schemas; Supabase ProductRepository adapter (Law #2).
- 2.2 Roster: FIRST search closed PR #3 branch (`git log --all`, `origin/claude/*track-d*` or PR #3 head via `gh pr view 3 --json headRefName`) for real scraped data. If absent: scrape REAL products — 3 lines only (lashes 40, nails 35, accessories 25: sponges/boxes/applicators/tweezers), real EAN/UPC barcodes, Shopify-style SKUs (e.g. GLMD-LASH-001), EGP pricing per BOUTIQUE_RESEARCH.md. Importer script replaces synthetic generator in scripts/sync-products.js.
- 2.3 Shop pages: (shop)/products listing + [handle] detail + collections, fed by CatalogPort; landing page product grid + hero slide-2 lineup become dynamic (replace hardcoded PRODUCTS in page.tsx).
- 2.4 Cart→checkout stitching E2E (browse→add→cart→checkout session) — one full-chain verification before close.

## WAVE 3 — Review/optimize sweep (after W2)
/pr-review-workflow retro on W1/W2 merges; code-reviewer + simplify + composition-patterns + react-best-practices + vercel-optimize; de-!important refactor of mobile CSS block; tokenize hardcoded rgba/z-index scale; reduced-motion completeness; delete orphaned webps OR restore them (user decision); eventLog error_code param + retry columns (implement or drop); latencyTracker serverless-useless singleton → Redis or drop.

## WAVE 4 — Affiliates/B2B hardening (only after W2 is 100%)
UpPromote contract tests (webhook ID header verification against captured live requests), payout dashboards, B2B portal — deferred per user's one-area-at-a-time directive.

## Open user decisions
1. Commitments icons: restore approved brand webps vs keep Phosphor SVGs (webps currently orphaned). Decision: Keep SVG. delete webps.
2. Real-roster scraping sources (Egyptian vs international) if Track D branch is empty. Decision: run agents to scrape Egyptian if data and image quality suitable, regional (uae, ksa, etc.) if not or EU if neither - choose most similar.

## Review protocol (Fable-Orchestrator)
Each PR gets: full diff review vs this spec, /code-review, QA-Intel re-run, E2E chain walk of the touched workflow, then merge. No implementer self-merges.
