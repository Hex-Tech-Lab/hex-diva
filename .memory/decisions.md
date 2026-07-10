# Strategic Decisions Made (Hex-Diva MVP)

## Stack Choice: Next.js 16.2.6 + React 19 RC1
**Decision**: Use latest Next.js App Router with React 19 server components
**Why**: React server components reduce bundle size; App Router enables streaming; cutting-edge features accelerate dev
**Rationale Depth**: User needs fast iteration + responsive UI + SEO; Next.js 16 delivers all three

## Design System: Luxury Minimalism
**Decision**: Deep charcoal (#1a1a1a) + jewel accents (rose gold, emerald, sapphire)
**Why**: Premium positioning demands refined aesthetic; charcoal + jewels more luxe than commodity minimalism
**Alternative Rejected**: Tech-dark (Obsidian-Escher style) wrong for beauty/cosmetics brand

## Commerce Architecture: Shopify Headless
**Decision**: Custom React frontend + Shopify Storefront API (read-only) + hosted checkout
**Why**: 100% design freedom without rewriting checkout/payments infrastructure
**Cost Trade-off**: Checkout leaves custom site (UX feels disconnected), but acceptable for MVP

## Data Split: Shopify + Supabase
**Decision**: Shopify owns products/inventory/checkout; Supabase owns users/referrals/commissions
**Why**: Separation of concerns; each system replaceable; clear data boundaries
**Future**: If moving off Shopify, Supabase layer survives unchanged

## Mobile Timing: Phase 2 (Expo)
**Decision**: Defer mobile to Phase 2; focus MVP on web; pre-structure for Expo monorepo
**Why**: Web MVP in 50 hours is tight; mobile adds 20-30 hours; responsive web reaches mobile users
**Setup Now**: Monorepo structure ready (web/, mobile/, shared/); Expo integration on Week 3

## B2B Tiers: Multiplier Model
**Decision**: Bronze 0.75x, Silver 0.65x, Gold 0.50x base price multipliers
**Why**: Simple math; scalable to unlimited tiers; can be changed via admin without code
**Implementation**: Applied in Supabase; frontend applies multiplier to Shopify prices

## Commission Structure: Tiered + Volume-Based Bonus
**Decision**: Base commission 5%; Glam Diva bonus at volume milestones; tracked in commission_ledger
**Why**: Incentivizes referrers; simple to calculate; enables affiliate program
**Future**: Can add sub-tier bonuses (10%, 15%) if needed

## API Routes: Next.js Route Handlers
**Decision**: Use Next.js Route Handlers (App Router) for all API endpoints
**Why**: No external server; easier deployment; built-in middleware; automatic OpenAPI generation possible
**Alternative Rejected**: Express.js (adds complexity)

## Deployment: Vercel + Supabase
**Decision**: Vercel for frontend (auto-deploy on push); Supabase for DB/Auth (managed)
**Why**: Zero-ops deployment; auto-scaling; webhooks built-in; free tier sufficient for MVP
**Future**: Cloudflare Workers for pricing engine / webhook relay (edge functions)

## Caching: Redis (Upstash) for Inventory
**Decision**: Cache Shopify inventory in Redis with 5-min TTL
**Why**: Reduces Shopify API calls (rate limit protection); fast reads; TTL auto-expires stale data
**Alternative Rejected**: Store in Supabase (adds consistency complexity)

## Product Research: Data Verification Framework
**Decision**: Validate all revenue figures using: Traffic × Conversion Rate × Basket Size
**Why**: Prevents inflated data (currency confusion, annual vs monthly); grounds assumptions in math
**Applied**: Revised competitor estimates downward; set realistic Year 1 goal ($50K-$200K USD)

## Folder Structure: Copy from hex-yt-intel Docs
**Decision**: Replicate hex-yt-intel's 20 subdirectories as empty template (skills, audit, history, architecture, etc.)
**Why**: Proven structure; avoid reinventing folder org; lessons from 70 days of prior work
**Applied**: Empty folder structure in place; ready for Track B+ deliverables

## Licensing: MIT (Open Source Compliance)
**Decision**: Adopt MIT license from hex-yt-intel
**Why**: Sister company standard; permissive; no GPL restrictions for commercial use
**Note**: Update to reflect Hex-Tech-Lab © 2024

---

## How to Record New Decisions

When a major choice is made during execution:

1. **Date**: [YYYY-MM-DD]
2. **Title**: Imperative phrase (e.g., "Use Redis for Inventory Cache")
3. **Decision**: Brief what was chosen
4. **Why**: Business rationale + technical reason
5. **Alternative Rejected** (if applicable): What was considered and why it didn't win
6. **Cost Trade-off** (if applicable): What you're giving up

Example:
```
## Use Stripe for B2B Payouts

**Decision**: Integrate Stripe Connect for affiliate payout processing
**Why**: PCI compliance; direct to bank account; handles tax forms
**Alternative Rejected**: Manual bank transfers (not scalable to 1000+ affiliates)
**Cost Trade-off**: 2.2% + $0.30 per payout; payouts 2-5 days (not instant)
```
