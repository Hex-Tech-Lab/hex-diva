# Hex-Glam-Diva: Exact Answers to Clarifying Questions

---

## 1. Codebase & Architecture

| Question | Answer |
|----------|--------|
| **Do you have existing code in hex-glam-diva that I should reference? Or are we starting fresh?** | YES — hex-diva codebase exists and is active. Build on top of it, do NOT start from scratch. |
| **React 18+, Next.js 16, Tailwind CSS 4, shadcn/ui, TypeScript confirmed?** | ✅ YES to all. React 18+, Next.js 16.2.6, Tailwind CSS 4.3.0, shadcn/ui, TypeScript 6.0.3. |
| **Supabase or Cloudflare D1?** | Supabase PostgreSQL (keep existing). NOT D1. |
| **Cloudflare Pages (static) + Workers (API)?** | NO. Using Vercel (frontend) + Shopify (backend). Cloudflare is optional CDN/caching layer later. |
| **Remix/Next.js on Workers?** | NO. Next.js 16 on Vercel (not on Cloudflare Workers). |
| **D1 (SQLite) as primary database?** | NO. Supabase PostgreSQL (affiliate-only data). Shopify is system of record for orders/inventory/pricing. |
| **Durable Objects for real-time (referral notifications, admin live updates)?** | NO. Use Supabase Realtime instead (already built-in, simpler). |

---

## 2. Priority Pages/Features for Phase 1 (In Order of Build)

| Feature | Build Order | Status | Timeline |
|---------|-------------|--------|----------|
| **Landing page** | 1st (DONE) | ✅ COMPLETE | Already built |
| **Product catalog** | 2nd | To do | Week 1 (connect Shopify API) |
| **Shopping cart & checkout** | 3rd | To do | Week 1–2 (Shopify native) |
| **Payment integration** | 4th | To do | Week 2 (Paymob) |
| **User dashboard** | 5th | To do | Week 3–4 (orders, referrals, commissions) |
| **B2B wholesale portal** | 6th | To do | Week 3–4 (Shopify B2B native) |
| **Affiliate/referral dashboard** | 7th | To do | Week 4–5 (UpPromote + Hex-Diva UI) |
| **Admin panel** | 8th (DONE) | ✅ COMPLETE | Already built; needs Shopify sync integration |

**Dependency chain**: 1 → 2 → 3 → 4 → (5,6,7 in parallel) → 8

---

## 3. Design System Output Format Preferences

| Format | Deliver? |
|--------|----------|
| **CSS variables (:root { --color-primary: ... })** | ✅ YES |
| **Tailwind config (tailwind.config.ts with theme overrides)** | ✅ YES |
| **JSON (colors, fonts, spacing as standalone)** | ✅ YES |
| **TypeScript (as const theme = { colors: {...}, typography: {...} })** | ✅ YES |
| **All of the above** | ✅ YES — RECOMMENDED |

**Delivery location**: `/src/config/design-tokens.json`, `/src/config/theme.ts`, `tailwind.config.ts`, `src/app/globals.css`

---

## 4. Handoff Specifications

| Format | Deliver? |
|--------|----------|
| **Individual JSON/Markdown files in /outputs/ (manual review + copy-paste)** | ✅ YES |
| **Git-ready (push to hex-glam-diva repo on feature branch)** | ✅ YES |
| **Directory structure (mimic /src/config/design-system/ layout for CC/CD imports)** | ✅ YES |
| **All of the above** | ✅ YES — RECOMMENDED |

**Branch**: `claude/hex-diva-repo-setup-4h4m2v` (already created)

---

## 5. Shopify Integration Specifics

| Question | Answer |
|----------|--------|
| **Shopify plan: Basic, Grow, Advanced, or Plus?** | **Grow ($59/mo)** — sufficient for launch. Plus upgrade is Phase-2 trigger (only if 4+ pricing catalogs needed). |
| **B2B on Shopify: Native Shopify B2B or third-party app?** | **Native Shopify B2B** — available on all paid plans since April 2026. NOT third-party app. |
| **Commerce channel: Single Shopify store (Egypt primary) + Noon/Jumia later, or multi-channel Day 1?** | **Single Shopify store** (Egypt primary). Noon/Jumia integration is Phase-2 (separate research pass). |
| **Custom checkout: Shopify checkout extensibility (Functions, UI extensions) or headless custom checkout?** | **Shopify checkout extensibility** (Shopify Functions for discount logic). NOT headless custom checkout. |

---

## 6. Referral/Affiliate System

| Question | Answer |
|----------|--------|
| **App choice: UpPromote, GoAffPro, or Refersion?** | **UpPromote (primary)** — free tier up to 200 orders/mo. GoAffPro (fallback). Refersion (only if scaling past UpPromote). |
| **Commission structure: Fixed tiers (5%, 10%, 15%) or custom per-affiliate?** | **Fixed tiers 5% / 10% / 15%** by default, WITH per-affiliate override capability. UpPromote supports both. |
| **Payout integration: InstaPay for weekly, or bank transfer fallback for monthly?** | **InstaPay for weekly** (if Egyptian bank confirms business bulk payout capability) **OR bank transfer for monthly** (fallback). NO PayPal, NO Stripe for Egypt. |
| **Dashboard features: Affiliate dashboard in Hex-Diva or embedded from UpPromote?** | **Both**: UpPromote self-serve (clicks, conversions, commissions) + **Hex-Diva native dashboard** (branded UX, custom reporting). |

---

## Summary Table

| Area | Decision |
|------|----------|
| **Code** | Keep hex-diva, integrate Shopify backend |
| **Tech Stack** | Next.js 16 + Tailwind + Supabase (affiliate-only) + Shopify (orders/inventory) |
| **Infrastructure** | Vercel + Shopify + Supabase |
| **Phase 1 Build Order** | Landing ✅ → Catalog → Cart/Checkout → Payments → Dashboards → B2B → Affiliate → Admin |
| **Design Tokens** | All 4 formats (CSS + Tailwind + JSON + TS) |
| **Handoff** | Git-ready + /outputs/ + structured imports |
| **Shopify Plan** | Grow ($59/mo) — no Plus needed at launch |
| **Shopify B2B** | Native (April 2026 expansion to all paid plans) |
| **Commerce** | Single store (Egypt) → multi-channel Phase-2 |
| **Checkout** | Shopify native extensibility (not custom headless) |
| **Affiliate App** | UpPromote (free tier) |
| **Commission** | 5% / 10% / 15% tiers + per-affiliate overrides |
| **Payout** | InstaPay weekly OR bank transfer monthly (no PayPal/Stripe) |
| **Dashboard** | UpPromote self-serve + Hex-Diva native UI |

