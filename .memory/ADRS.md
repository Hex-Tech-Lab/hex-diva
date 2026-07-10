# Architecture Decision Records

## Format
`[YYYY-MM-DD] [Agent] [Status] [DECISION] Title. Rationale: ... Alternatives: ... Confirmed by user: yes/no`  
Status: ACTIVE | SUPERSEDED | ✅

---

## Hex-Diva Core Decisions

- [2026-07-09] [Claude] [ACTIVE] [DECISION] Shopify Headless Commerce. Rationale: 100% design freedom via custom React frontend + Shopify Storefront API while keeping Shopify ecosystem (inventory, checkout, payments). Alternatives: Shopify theme, custom liquid, custom + POS. Confirmed by user: yes

- [2026-07-09] [Claude] [ACTIVE] [DECISION] Supabase + Shopify (hybrid, not either/or). Rationale: Shopify handles commerce (products, checkout, payments); Supabase handles business logic (users, referrals, tiered pricing, commissions). Alternatives: Shopify alone, Supabase alone. Confirmed by user: yes

- [2026-07-09] [Claude] [ACTIVE] [DECISION] Luxury Design System (charcoal + jewel accents). Rationale: Deep charcoal (#1a1a1a) base with rose gold, emerald, sapphire accents; Playfair Display headlines; 200-400ms smooth transitions; hero video (Parisian elegance, woman showcasing products). Alternatives: Minimalist tech look, maximalist baroque. Confirmed by user: yes

- [2026-07-09] [Claude] [ACTIVE] [DECISION] 100 SKU MVP (curated luxury, not commodity). Rationale: Focus on eyelashes (40 SKUs), nails (35), sponges (15), packaging (10). Premium positioning with 70-80% margins. Alternatives: 3000 SKUs commodity bulk (low margins, impossible in 50 hours). Confirmed by user: yes

- [2026-07-09] [Claude] [ACTIVE] [DECISION] B2C + B2B Hybrid (direct sales + referral program). Rationale: Direct consumer sales via e-commerce + reseller program with tiered pricing (Bronze 0.75x, Silver 0.65x, Gold 0.50x) and commission tracking. Alternatives: B2C only, B2B only. Confirmed by user: yes

- [2026-07-09] [Claude] [ACTIVE] [DECISION] Expo for Mobile (Phase 2). Rationale: 15-minute setup (vs 2-3 hours React Native CLI), faster dev iteration, same codebase for iOS + Android. Defer mobile to Phase 2. Alternatives: React Native CLI (slower), PWA only (no app store). Confirmed by user: yes

- [2026-07-09] [Claude] [ACTIVE] [DECISION] Full Autonomy, Expert Role. Rationale: Claude assumes expert decisions across architecture, design, backend, frontend. No permission-asking for technical calls. Alternatives: Ask for permission on every decision (slower). Confirmed by user: yes

---

## How to Add Decisions

When a major architectural choice is made:

1. Add entry with today's date
2. One-liner title (imperative: "Use X for Y")
3. Rationale (WHY: business need, technical requirement, or constraint)
4. Alternatives (what was considered and rejected)
5. Confirmation (did the user agree?)

**Example**:
```
- [2026-07-09] [Claude] [ACTIVE] [DECISION] Use Next.js App Router. Rationale: Latest React server components, file-based routing, built-in optimization. Alternatives: Pages Router (legacy), Remix. Confirmed by user: yes
```
