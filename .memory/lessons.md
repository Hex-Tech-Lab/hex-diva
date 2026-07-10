# Lessons Learned (Hex-Diva Foundation)

## Lesson 1: Separation of Concerns Matters
**Insight**: Don't merge Shopify ecosystem with custom business logic. Keep them orthogonal.
**Applied**: Shopify handles products/checkout/payments; Supabase handles users/referrals/commissions. Each system is independently replaceable.
**Prevention**: When integrating external services, define clear ownership boundaries early.

## Lesson 2: Document Architectural Decisions Explicitly
**Insight**: Record WHY choices were made (Shopify headless vs theme, Expo vs React Native, etc.), not just WHAT was chosen.
**Applied**: Created ADRS.md with rationale + alternatives for every major decision.
**Prevention**: Future sessions can understand context without re-debating settled choices.

## Lesson 3: Revenue Figures Need Mathematical Verification
**Insight**: E-commerce metrics are often inflated (currency confusion, annual vs monthly, transaction volume vs revenue).
**Applied**: Created DATA_VERIFICATION_ANALYSIS.md with formula: Traffic × Conversion Rate × Basket Size = Monthly Revenue.
**Prevention**: Always verify large claims with math; treat unsourced figures as speculative until proven.

## Lesson 4: Tiered Pricing Simplifies at Scale
**Insight**: Supporting B2C + B2B + affiliate tiers is complex, but tiering (Bronze 0.75x, Silver 0.65x, Gold 0.50x) keeps logic clean.
**Applied**: Pricing multipliers stored in Supabase, applied client-side or via discount codes.
**Prevention**: Don't hardcode pricing in multiple places; centralize in DB.

## Lesson 5: Design System Comes First
**Insight**: Build luxury brand identity BEFORE coding components. Avoid design debt.
**Applied**: DESIGN_SPEC.md created at Step 0 (before Track E frontend), capturing colors, typography, motion, accessibility.
**Prevention**: Never iterate design during dev; finalize tokens upfront. Saves refactoring.

## Lesson 6: Parallel Tracks Compress Timeline
**Insight**: 6 parallel tracks (A-F) can deliver MVP in 50 hours if independence is maximized.
**Applied**: Product research (Track A) doesn't block design (Track B) or backend (Track C). Each team can go at full speed.
**Prevention**: Identify bottlenecks early; parallelize ruthlessly.

## Lesson 7: Monorepo Enables Code Sharing
**Insight**: Next.js (web) + Expo (mobile) + shared utilities in one monorepo reduces duplication.
**Applied**: Structure: web/ (Next.js), mobile/ (Expo), shared/ (npm package for utils/hooks/types).
**Prevention**: Don't copy code between web and mobile; extract to shared/ immediately.

## Lesson 8: Webhook Async Patterns Are Non-Negotiable
**Insight**: Shopify order webhooks must be idempotent and persist atomically to Supabase.
**Applied**: Cloudflare Worker verifies HMAC, calculates commission, inserts atomically.
**Prevention**: Any webhook without idempotency + atomic insert is a bug waiting to happen.

## Lesson 9: Authentication Boundary Must Be Explicit
**Insight**: Supabase Auth (user accounts) is orthogonal to Shopify (guest checkout). Don't conflate them.
**Applied**: Guests can browse + buy (Shopify checkout); users can referral + earn commissions (Supabase).
**Prevention**: Define auth boundaries early; avoid mixing auth systems mid-project.

## Lesson 10: Accessibility Must Be Built In, Not Retrofitted
**Insight**: WCAG AAA compliance (7:1 contrast, 48px touch targets, keyboard navigation) is easier if designed from the start.
**Applied**: Design tokens include contrast ratios; Tailwind config enforces spacing; component library uses semantic HTML.
**Prevention**: Don't defer a11y to the end; it's a cost multiplier if added late.

## Lesson 11: Deploy Early, Deploy Often
**Insight**: Ship to Vercel + Supabase as soon as a feature is ready, even if incomplete.
**Applied**: Hourly checkpoints in ROADMAP_HOURS.md force deployment discipline.
**Prevention**: Batch integration (multiple tracks deploying at once) is a risk; integrate continuously.

## Lesson 12: Inventory Sync is Simpler Than You Think
**Insight**: Cache Shopify inventory in Redis (5-min TTL), not in your own DB. Reduces a class of consistency bugs.
**Applied**: Shopify is source of truth; Redis cache for performance; Supabase never duplicates product data.
**Prevention**: Keep your DB focused on users/referrals/commissions, not product catalog.

