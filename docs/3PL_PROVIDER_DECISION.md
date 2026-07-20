# 3PL Fulfillment Provider Decision

**Date**: 2026-07-20
**Context**: hex-diva + 2 sibling stores (car accessories, apparel) — Egypt-founder, no company papers, National ID + bank account only, pre-incorporation.

---

## Provider Comparison Table

### Couriers / Last-Mile Delivery Only

| Provider | Founder Eligibility | Shopify | API | COD | Pricing | Coverage | Employees / Funding | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Bosta** | ✅ **National ID only** (confirmed in their own support article) | ✅ Shopify app | ✅ docs.bosta.co, Node.js/PHP SDKs | ✅ Next-day | Pay-per-shipment (volume-based) | Egypt, KSA, UAE | 686 emp, est. $10M+ funding | **TIER 1** |
| **Deliveric Egypt** | ❓ **Unconfirmed** — courier network, 5.0★ (4 reviews) on Shopify. Covers Egypt only. | ✅ Free Shopify app | ❓ Unknown | ✅ Yes | Free app + delivery fees | Egypt | Unknown | **TIER 2** — call to confirm KYC |
| **J&T Express Egypt** | ✅ **States "individual users"** — "express and logistics for individual users and companies" | ✅ Free Shopify app (1.0★, 1 review) | ❓ Unknown | ✅ Yes | Free app + delivery fees | Egypt | J&T global, Egypt LLC | **TIER 2** — call to confirm |
| **Presto Services** | ✅ **Explicitly serves individuals** (LinkedIn: "services for... individuals in Egypt") | ❓ No Shopify app | ❓ Unknown | ✅ Yes | Unknown | Egypt | 4 emp (small) | **TIER 3** — call to confirm |
| **YFS Logistics** | ❓ **Unconfirmed** — e-commerce/SME courier, free Shopify app, auto-sync, real-time tracking | ✅ Free Shopify app | ✅ API docs | ✅ Yes | Free app + delivery fees | Egypt | Unknown | **TIER 3** — call to confirm KYC |
| **RAMP Logistics** | ❓ **Unconfirmed** — last-mile delivery, free Shopify app, waybill labels, scheduling | ✅ Free Shopify app | ❓ Unknown | ✅ Yes | Free app + delivery fees | Egypt | Dev: Logixgrid | **TIER 3** — call to confirm KYC |
| **Mylerz** | ❓ Unknown — signup JS-rendered, no public KYC docs | ✅ Shopify app (1.5★, 3 reviews) | ❓ Unknown | ✅ Yes | Unknown | Egypt, Morocco, Jordan, Tunisia, Algeria | 217 emp, $9.6M funding | **SKIP** — poor reviews |
| **ShipBlu** | ❓ Unknown | ✅ Shopify app (1.0★, 1 review) | ✅ docs.shipblu.com | ✅ Next-day | Unknown | Egypt | 64 emp, $2.7M funding | **SKIP** — terrible reviews |
| **Sprint Logistics** | ❓ Unknown | ✅ Free Shopify app (0.0★, 0 reviews) | ❓ Unknown | ✅ Yes | Unknown | Egypt | 30 emp | **SKIP** — tiny, no data |
| **Milezmore** | ❓ Unknown — $5M pre-seed, fulfillment solutions, 12 employees | ❓ No Shopify app | ❓ Unknown | ✅ Yes | Unknown | Egypt | 12 emp, $5M funding | **SKIP** — no Shopify, tiny |
| **Filtareeq** | ❓ Unknown — AI-powered delivery optimization, works with Aramex/DHL | ❓ No Shopify app | ❓ Unknown | ✅ Yes | Unknown | Egypt | 11-50 emp, 2021 | **SKIP** — optimization platform, not a courier |

### Full 3PL (Warehousing + Pick-Pack-Ship + Last-Mile)

| Provider | Founder Eligibility | Shopify | API | COD | Pricing | Coverage | Employees / Funding | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Flextock** | ❌ **Incorporation-gated** — Privacy Policy confirms: collects "legal entity documents, company name" from merchants. Requires signed warehousing/storage agreement. | ✅ Free Shopify app (launched Feb 2026) | ✅ Own tech platform, real-time command center | ✅ Next-day | Basic Plan (free) + fulfillment/shipping fees (separate) | Egypt + cross-border | YC-backed, Capria Ventures, undisclosed funding | **POST-INC** |
| **Khazenly** | ❓ **Unconfirmed, likely incorporation-gated** — on-demand warehousing + fulfillment, $2.5M seed. Same model as Flextock | ✅ Free Shopify app (launched Jun 2025) | ✅ APIs (learn.khazenly.com) | ✅ Yes | Free app + separate fulfillment/shipping fees | Egypt | $2.5M seed (2022) | **POST-INC** |
| **Turuq** | ✅ **Likely individual-friendly** — pay-per-delivery, built for small businesses, launched 2023, self-funded | ✅ Free Shopify app | ✅ Own tech platform, AI-powered | ✅ Yes | Pay-per-delivery (no fixed plans) | Egypt nationwide | Self-funded, 0 employees listed | **TIER 3** — needs KYC verification call |
| **STOX** | ❓ **Unconfirmed** — fulfillment company, 11-50 employees. No public KYC/docs found. Sales-led model | ❓ No Shopify app | ❓ Unknown | ✅ Yes | Unknown (sales-led) | Egypt | 11-50 emp | **SKIP** — no Shopify, no public info |
| **FreePL** | ❓ **Unconfirmed** — trade logistics, 49 employees, Cairo Airport. Enterprise-focused | ❓ No Shopify app | ❓ Unknown | ❓ Unknown | Enterprise contracts | Egypt + Middle East/Africa | 49 emp, 2023 | **SKIP** — enterprise trade logistics |
| **FULFLY** | ❓ Unknown | ✅ Shopify app (5.0★, 1 review) | ❓ Unknown | ❓ Unknown | Unknown | Egypt | 3 emp | **SKIP** — too small |
| **ZUGOOO** | ❌ B2B/enterprise focused | ❓ No | ❓ No | ❓ No | Enterprise contracts | Egypt + Gulf | Unknown | **SKIP** — wrong segment |
| **ELNgoom** | ❓ Unknown — international shipping focused | ❓ No | ❓ No | ❓ No | Unknown | Egypt + International | Unknown | **SKIP** — wrong segment |
| **Nacita Logistics** | ❌ Enterprise/corporate logistics | ❓ No | ❓ No | ❓ No | Enterprise contracts | Egypt | Unknown | **SKIP** — enterprise only |
| **EF Logistics** | ❌ Enterprise/corporate logistics | ❓ No | ❓ No | ❓ No | Enterprise contracts | Egypt | Unknown | **SKIP** — enterprise only |
| **Logistica (DP World)** | ❌ Enterprise 3PL — DP World company, 65 emp, 50,000 SQM warehouse, cold chain. Enterprise contracts only. | ❓ No | ❓ No | ❓ No | Enterprise contracts | Egypt | 65 emp, DP World subsidiary | **SKIP** — enterprise only |
| **Ramp Logistics** | ❌ Enterprise logistics — healthcare, FMCG, electronics. Warehousing, fulfillment, distribution. | ❓ No | ❓ No | ❓ No | Enterprise contracts | Egypt | Unknown | **SKIP** — enterprise only |
| **Alfa Logistics** | ❌ Enterprise 3PL — 48,900 SQM warehouse, 56,800 pallet capacity, 35 trailers. Infor WMS. | ❓ No | ❓ No | ❓ No | Enterprise contracts | Egypt | Unknown | **SKIP** — enterprise only |
| **MB Logistics** | ❓ Unknown — last mile, warehousing, fulfillment. 6 employees. Hotline: 19015. | ❓ No | ❓ No | ✅ Yes | Unknown | Egypt | 6 emp | **SKIP** — too small, no Shopify |
| **VOOOM** | ❌ FMCG supply chain OS — B2B distribution, not e-commerce fulfillment | ❓ No | ❓ No | ❓ No | Enterprise | Egypt | 2019, B2B | **SKIP** — wrong segment |
| **Flottex** | ❌ Zero-emission transport company. 3 employees. Not e-commerce logistics. | ❓ No | ❓ No | ❓ No | Unknown | Egypt | 3 emp | **SKIP** — wrong segment |
| **Takhzin** | ❓ Unknown — JS-rendered site, no details extracted | ❓ No | ❓ No | ❓ No | Unknown | Egypt | Unknown | **SKIP** — no data |

### Multi-Courier Aggregators (Cascading Fallback Built-In)

| Provider | Founder Eligibility | Shopify | API | COD | Pricing | Coverage | Employees / Funding | Verdict |
|---|---|---|---|---|---|---|---|---|
| **SIDEUP** | ✅ **Accepts individuals** (T&C: "whether an individual or a legally formed entity"). KYC: "Company register, Maroof, or Freelancing document." No National-ID-only path. | ✅ Shopify app (5.0★, 2 reviews), also WooCommerce/Zid/Magento | ✅ API (swaggerhub), custom integration with webhooks | ✅ Next-day (24hr) | Free signup, no fixed subscription. Pay-per-shipment. | Egypt, KSA, Oman. Domestic: DHL/J&T/SMB/Shipa. Intl: Aramex/FedEx/UBS | 27 emp, $1.4M funding | **TIER 4** — needs Freelance Certificate |
| **Fincart** | ❓ **Unconfirmed** — "Request a Call" onboarding, SMB-positioned startup (2023) | ✅ Free Shopify app | ✅ gitbook API docs | ✅ Next-day | EGP 1,584/mo (Essential, 300 orders/mo) / EGP 2,792/mo (Plus) / EGP 7,199/mo (Premium) | Egypt + 220 countries, 25+ couriers | Egypt-based, pre-seed/seed stage | **TIER 4** — needs KYC verification call |
| **OTO** | ✅ **Freelance Certificate accepted** (confirmed in their help center) | ✅ Integrations | ✅ apis.tryoto.com, full REST API | ✅ Yes | Unknown (sales-led) | 400+ carriers across MENA + Turkey. KSA/UAE domestic confirmed. Egypt domestic coverage unclear | MENA-based, growth stage | **TIER 5** — needs Freelance Certificate + Egypt coverage confirmation |

### E-Commerce Enablement / Courier Aggregators (Platform Connecting Sellers to Couriers)

| Provider | Founder Eligibility | Shopify | Model | Pricing | Coverage | Verdict |
|---|---|---|---|---|---|---|
| **Taager** | ✅ **Individual-friendly** — built for individual resellers with zero capital. But you sell THEIR products, not your own inventory | ❓ No (they are the platform) | Social e-commerce: they provide products, warehousing, shipping, cash collection. You market and sell. | Commission-based | Egypt, KSA, UAE, Iraq | **WRONG MODEL** — we need to sell our own cosmetics, car accessories, and apparel inventory |

### Print on Demand (Specialty — Only for Custom Print Products)

| Provider | Founder Eligibility | Shopify | API | Pricing | Verdict |
|---|---|---|---|---|---|
| **Printlet** | ✅ **Individual-friendly** (POD model, no inventory) | ❓ Unknown | ❓ Unknown | Unknown | **NICHE** — only for custom print products |

---

## Detailed Analysis of Full 3PL Providers (Flextock, Khazenly, STOX, FreePL, others)

### Newly Discovered: Presto Services — Explicitly Individual-Friendly

**Presto Services** (Cairo, 2017, 251-500 employees) — their LinkedIn description states:
> "We provide same day delivery, warehousing, fulfillment and transportation. We provide these range of services for E-commerce companies and **individuals** in Egypt."

This is the **second confirmed individual-friendly provider** after Bosta. However, they have no Shopify app, no public API docs found, and their size (4 employees on LinkedIn vs 251-500 on ensun — discrepancy) needs verification. Worth a call to confirm API and onboarding.

### Flextock — Confirmed Incorporation-Gated (from Privacy Policy)

Flextock's own Privacy Policy (December 2025) confirms they collect:
> "Account and Contact Data: Full name, business email address, billing address, business phone number, **company name, legal entity documents**, and password/login credentials."

And they process payments for "billing our fulfillment services" — this is a contracted warehousing relationship, not a pay-per-shipment courier. **This confirms they require a registered entity.**

### Why Flextock, Khazenly, STOX, FreePL, and others are post-incorporation

All full 3PL warehousing providers share the same structural requirement:
1. **Physical custody of inventory** — requires signed warehousing/storage agreement with liability terms
2. **Legal entity documents** — Flextock's privacy policy explicitly confirms this
3. **Invoicing** — monthly warehousing fees, storage fees, pick fees invoiced to a registered entity
4. **Insurance** — warehousing requires insurance naming the legal entity

### Exception: Turuq

Turuq is different — they offer 3PL warehousing **but** their pay-per-delivery model and small-business focus may mean they have a lighter onboarding path. Their Shopify app is categorized as "Third-party logistics (3PL)" but their pricing is pay-per-delivery, not monthly warehousing fees. This needs a direct call to confirm.

---

## Use Case Analysis

### Our specific needs

| Requirement | Our Case |
|---|---|
| **Products** | Cosmetics (nails, lashes, accessories), car accessories, apparel (pants, shirts, t-shirts) |
| **Stores** | 3 separate Shopify stores |
| **Geography** | Egypt only (sell and deliver within Egypt) |
| **Founder status** | Individual, no company papers, National ID + bank account |
| **Timeline** | 6-month window before LLC formation |
| **Volume** | Unknown (pre-PMF), starting near zero |
| **COD** | Critical — dominant payment method in Egyptian e-commerce |
| **API needed** | Yes — need to integrate into our Next.js codebase |
| **Shopify integration** | Important but not critical (we can build custom API integration) |

### What we actually need at each phase

**Phase 1 (Months 1-3, 0-100 orders/mo):**
- Someone to pick up packages from us and deliver to customers
- Collect COD and remit it back to our bank account
- No warehousing needed (we store inventory at home/small space)
- No fancy tech needed — basic API to create shipments

**Phase 2 (Months 3-6, 100-500 orders/mo):**
- Same as above but with fallback/redundancy
- Maybe start needing warehousing if inventory grows

**Phase 3 (Months 6-12, 500-2,000 orders/mo):**
- Multi-carrier routing for best rates/coverage
- International shipping capability
- Still probably no warehousing (can use 3PL or keep in-house)

**Year 2 (Post-LLC, 2,000-10,000+ orders/mo):**
- Full 3PL warehousing (Flextock, Khazenly, or similar)
- Volume contracts with couriers
- True pick-pack-ship at scale

---

## Decision: Recommended Provider Stack

### Phase 1 — Pre-Incorporation (Months 1-3) — Zero Paperwork

**Primary: Bosta**
- **Why**: Only provider with **verified National-ID-only onboarding**
- **KYC**: National ID photo (uploaded during shipping activation)
- **COD**: Next-day bank transfer
- **API**: docs.bosta.co — Node.js SDK, PHP SDK, REST API
- **Pricing**: Pay-per-shipment, volume-based
- **Coverage**: Egypt nationwide

**Implementation:**
```
src/lib/fulfillment/bosta/
  client.ts        — lazy-init, dormant-safe
  shipment.ts      — create shipment, get rate, generate waybill
  tracking.ts      — tracking webhook handler
  types.ts         — Bosta-specific types
src/app/api/webhooks/bosta/route.ts  — delivery status updates
schema: shipments table (order_id, provider, tracking_ref, status, cod_amount, cod_collected_at)
```

### Phase 2 — Growth (Months 3-6) — Add Fallback

**Priority A: Presto Services** (confirmed individual-friendly per LinkedIn, but needs KYC call)
- Explicitly states they serve "individuals" in Egypt
- Same-day delivery, warehousing, fulfillment
- **Call**: confirm API exists, pricing model, and actual KYC docs needed

**Priority B: Turuq** (if KYC call confirms individual path)
- Full 3PL warehousing + last-mile in one provider
- Pay-per-delivery, no fixed plans
- Free Shopify app
- Built for small businesses, expanding to cosmetics/lifestyle
- **Call**: `admin@turuq.co` — "Can an individual with just National ID sign up?"

**Priority C: Fincart** (if KYC call confirms individual path)
- Multi-courier aggregation (25+ couriers) — built-in fallback
- AI courier recommendation engine
- Free Shopify app
- **Pricing**: EGP 1,584/mo (Essential, 300 orders/mo), EGP 2,792/mo (Plus)
- **Call**: `merchant.fincart.io/get-started` — "What KYC for individuals?"

### Phase 3 — Scale (Months 6-12) — Add Aggregator Layer

**Add: Fincart** (once volume justifies EGP 1,584+/mo)
- Automatically cascades across 25+ couriers (Aramex, J&T, FedEx, etc.)
- International shipping to 220+ countries
- Next-day COD, branded tracking, WhatsApp/SMS updates
- AI-powered courier selection

**OR: OTO** (once Freelance Certificate is obtained)
- 400+ carrier network across MENA + Turkey
- Full REST API at apis.tryoto.com
- Includes Aramex/UPS/DHL/FedEx in their network
- **Note**: Confirm Egypt domestic coverage before committing

### Year 2 — Post-Incorporation (After LLC Formation)

**Add: Flextock** (primary full 3PL target)
- YC-backed (2021), real tech platform, real-time command center
- End-to-end: warehousing, fulfillment, last-mile, cross-border
- Free Shopify app
- Next-day COD
- **Requires**: LLC/company registration for warehousing contracts

**Add: Khazenly** (secondary full 3PL option)
- $2.5M seed, on-demand warehousing
- Free Shopify app, APIs
- Same post-incorporation requirement

---

## Ramp-Up Plan

| Timeline | Provider | Monthly Orders | Est. Monthly Cost | Est. Cumulative Cost | Milestone |
|---|---|---|---|---|---|
| **Month 1-3** | Bosta (primary) | 0-100 | ~EGP 0-2,500 | ~EGP 7,500 | Live shipping, PMF validation |
| **Month 3-6** | Bosta + Turuq or Fincart | 100-500 | ~EGP 2,500-8,000 | ~EGP 30,000 | Fallback active, redundancy |
| **Month 6-12** | Bosta + Fincart (aggregator) | 500-2,000 | ~EGP 1,584-8,000 | ~EGP 80,000 | Multi-courier cascade, intl shipping |
| **Year 1-2** | Bosta + Fincart + Flextock (3PL) | 2,000-10,000+ | ~EGP 8,000-30,000 | ~EGP 250,000 | LLC formed, warehousing, volume contracts |

---

## Immediate Action Items

1. **Sign up for Bosta** — `bosta.co/en-eg/home` — upload National ID, activate shipping
2. **Call Deliveric Egypt** — 5.0★ Shopify app, ask "What KYC for individuals?"
3. **Call J&T Express Egypt** — they say "individual users" — confirm KYC docs needed
4. **Call Presto Services** — LinkedIn says "services for individuals" — confirm API and pricing
5. **Call YFS Logistics** — free Shopify app, e-commerce/SME courier — confirm KYC
6. **Call RAMP Logistics** — free Shopify app, last-mile — confirm KYC
7. **Call SIDEUP** — asks if National ID alone works during 6-month pilot (they accept individuals but want Freelance Certificate normally)
8. **Call Turuq** — `admin@turuq.co` — confirm: "Can an individual with just National ID sign up?"
9. **Call Fincart** — `merchant.fincart.io/get-started` — "What KYC documents for individuals?"
10. **Build Bosta provider module** — mirror `src/lib/stripe/` pattern, dormant-safe
11. **Revisit Flextock/Khazenly** — post-LLC formation targets
12. **Revisit Paymob Agent** — for e-receipt/ETA tax compliance when needed later

---

## Key URLs

| Provider | URLs |
|---|---|
| **Bosta** | `bosta.co/en-eg/home`, `bosta.co/en-eg/smes`, `bosta.co/en-eg/pricing`, `bosta.co/en-eg/fulfillment`, `docs.bosta.co`, `bosta.freshdesk.com` |
| **Presto Services** | `prestoservices.com` (LinkedIn: "services for... individuals in Egypt") |
| **Turuq** | `turuq.co`, `apps.shopify.com/turuq` |
| **Fincart** | `fincart.io`, `fincart.io/plans`, `apps.shopify.com/fincart-shipping-app`, `fincart.gitbook.io/fincart-api` |
| **Flextock** | `flextock.com`, `flextock.com/privacy-policy` (confirms legal entity docs required), `apps.shopify.com/flextock`, `techcrunch.com/2021/03/03/flextock...` |
| **Khazenly** | `khazenly.com`, `apps.shopify.com/khazenly`, `learn.khazenly.com`, `techcrunch.com/2022/06/15/khazenly...` |
| **STOX** | `stox-eg.com`, `merchants.stox-eg.com` (merchant portal) |
| **Milezmore** | `milezmore.com` ($5M pre-seed, 12 emp, fulfillment) |
| **Filtareeq** | `filtareeq.com` (AI delivery optimization, works with Aramex/DHL) |
| **FreePL** | `freepl.com` (trade logistics, 49 emp, Cairo Airport) |
| **SIDEUP** | `eg.sideup.co`, `eg.sideup.co/faq/`, `new.portal.sideup.co/integrations`, `app.swaggerhub.com/apis-docs/sideup-aa3/Sideup2.1`, `apps.shopify.com/voo-1` (Shopify app 5.0★) |
| **YFS Logistics** | `yfs-logistics.com`, `yfs-logistics.com/services/e-commerce-and-smes`, `apps.shopify.com/yfs-logistics` (Shopify app) |
| **Deliveric Egypt** | `apps.shopify.com` search "Deliveric Egypt" (5.0★, 4 reviews, Shopify app) |
| **J&T Express Egypt** | `apps.shopify.com` search "J&T Egypt" (Shopify app, "individual users and companies") |
| **RAMP Logistics** | `ramp-logistics.com`, `apps.shopify.com` search "RAMP Logistics" (Shopify app) |
| **OTO** | `tryoto.com`, `help.tryoto.com`, `apis.tryoto.com` |
| **Taager** | `taager.com` (platform for resellers, not our use case) |
| **Printlet** | `printleteg.com` (POD, niche use case) |
| **Logistica** | `logistica.com.eg` (DP World company, enterprise 3PL) |
| **Ramp Logistics** | `ramp-logistics.com` (enterprise logistics) |
| **Alfa Logistics** | `alfa-logistics.com` (enterprise 3PL, 48,900 SQM warehouse) |
| **MB Logistics** | `mbg-logistics.com` (small last-mile + warehousing, 6 emp) |
| **VOOOM** | `vooomapp.com` (FMCG supply chain OS, wrong segment) |