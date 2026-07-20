# Multi-Provider Roadmap: Payments + 3PL Fulfillment

**Created**: 2026-07-20
**Context**: hex-diva (and 2 sibling stores on the same architecture — car
accessories, apparel) are Egypt-founder businesses, no foreign corporate
entity, selling only within Egypt. Every external-provider decision must be
verified against founder-eligibility (no Commercial Register / Tax Card
required) before being adopted, the same way PayTabs was verified — not
assumed from marketing copy.

---

## Recommended Sequencing

**Wave 9 (next): 3PL fulfillment — before Wave 10.** A customer can now pay
successfully (PayTabs is live) but there is currently no shipping/fulfillment
integration anywhere in this codebase — no carrier, no rate lookup, no label
generation, no delivery-status webhook. That's a harder blocker to launch
than payment redundancy: one working payment provider is enough to take an
order; zero logistics providers means no order can ever be delivered.

**Wave 10 (after): Payment cascade completion.** PayTabs already fully
handles checkout end-to-end. Adding PayMob (tier 2) and a tier-3 fallback is
resilience for when there's real transaction volume, not a pilot blocker —
defer until Wave 9 is done or until PayTabs actually has an outage that
matters.

---

## Wave 9: 3PL Fulfillment Provider(s)

### Research findings (2026-07-20)

There are two distinct categories here, with very different eligibility
profiles — do not conflate them:

**Category A: Last-mile courier only** (merchant handles their own
inventory/storage/packing; the provider just picks up and delivers).

- **Bosta** — ✅ **Verified individual-friendly.** Their own support
  documentation (Freshdesk) confirms: "To activate a shipping service,
  users need to confirm if they are an individual or a company. If the
  business is individual (in Egypt), they have to upload their National ID
  photo" — no Commercial Register or Tax Card required for the individual
  path. Has a real API (`docs.bosta.co`, official Node.js SDK on GitHub —
  `bostaapp/bosta-nodejs`) with delivery creation, tracking, COD amount
  auto-calculation from orders, and **next-day COD transfers**. This is
  the strongest candidate found — same "individual + one ID document"
  pattern as PayTabs.
- **Mylerz** — Has a merchant registration page (`mylerz.net/register`)
  and a Shopify app, but the page is JS-rendered and its actual
  individual-vs-company eligibility could not be verified through search
  or fetch. **Not confirmed either way** — needs a real signup attempt or
  direct contact to check, don't assume parity with Bosta.
- **Aramex Egypt / J&T Express Egypt** — not independently checked this
  pass; likely more formal onboarding given their international/enterprise
  profile, but unconfirmed.

**Category B: Full 3PL warehousing (pick-pack-ship)** — merchant ships
inventory *to* the provider's warehouse; they store, pack, and hand off to
a courier (sometimes with integrated last-mile).

- **Flextock**, **Misr Logistics**, **Logistica**, **FreePL** — every one
  of these has a "Book a call" / sales-led model with **no public
  self-serve signup or disclosed eligibility criteria**. This pattern
  itself is a meaningful signal, not just an information gap: warehousing
  means the provider takes physical custody of and liability for your
  inventory, which commercially almost always requires a signed agreement
  with a registered legal entity (storage/consignment terms, invoicing) —
  unlike a simple pay-per-shipment courier relationship. **Not confirmed
  as a hard requirement** (no direct contact made), but treat as likely
  incorporation-gated until proven otherwise. Don't build integration code
  against this category pre-incorporation.

**Category C: Multi-courier aggregators** (own no vehicles/warehouses;
sit on top of Category A couriers with a single dashboard/API and a rate/
carrier-recommendation engine — this is Egypt's actual answer to "the
cascading fallback pattern," built by someone else already).

- **Fincart** (fincart.io — do not confuse with fincart.com, an unrelated
  Indian fintech that surfaces in search) — Egypt-founded (2023),
  aggregates 25–30+ couriers, free Shopify app, next-day COD, "onboarded
  400+ merchants." **Individual-eligibility not confirmed** — no public
  FAQ/help-center content found, onboarding is "Request a Call." Promising
  (fast-growing local startup, exactly the SMB-friendly positioning that
  correlates with lighter KYC elsewhere), but unlike Bosta this is
  inference, not verification.
- **OTO** (tryoto.com — do not confuse with oto.com, an unrelated
  Indonesian car marketplace) — much larger network (400+ carrier
  integrations across MENA + Turkey, including Aramex/UPS/DHL/FedEx),
  real REST API (`apis.tryoto.com`), Shopify/WooCommerce/Magento/Salla/Zid
  integrations. **Two real findings, one favorable one not:**
  - ✅ Their own help-center article states signup requires verifying
    "your Commercial Registration **or Freelance Certificate**" — i.e. a
    Freelance Certificate (Egypt's individual/natural-person tax
    registration with the Tax Authority) is an accepted alternative to
    full company registration. This is real paperwork (unlike Bosta's
    zero-document National-ID-only path) but lighter than incorporating a
    company — closer to PayTabs' Freelancer-KYC tier than to full
    Commercial Registration.
  - ⚠️ OTO's own coverage documentation states full domestic+international
    shipping is currently confirmed for KSA and UAE specifically; Egypt is
    listed among operating countries but exact domestic/international
    parity for Egypt-origin shipments was not confirmed in what's public.
    Needs direct confirmation before relying on it for Egypt-origin
    orders specifically.
- **ShipBlu, Edfa3ly, YFS** — surfaced as competitors in the same
  aggregator space; not evaluated this pass.

### Recommendation

Two viable near-term paths, not mutually exclusive:

1. **Bosta directly** — zero paperwork beyond National ID, verified, but
   single-courier (no built-in fallback if Bosta has an outage or poor
   coverage in a specific area).
2. **Fincart or OTO as the aggregator layer** — gets courier-level
   redundancy "for free" (their recommendation engine already does what
   Wave 10's payment selector aims to do for payments), but Fincart's
   eligibility is unconfirmed and OTO explicitly wants at least a
   Freelance Certificate, and has an open question on Egypt-origin
   shipping parity.

Given the zero-paperwork constraint is the hard requirement right now
(pre-incorporation, PMF-validation phase), **start with Bosta** as Wave 9
implementation target — it's the only Category A/C candidate with a fully
verified, zero-paperwork individual path. Revisit Fincart/OTO once either
(a) their eligibility gets directly confirmed, or (b) a Freelance
Certificate gets obtained anyway (a much smaller step than full
incorporation, worth doing early regardless since it also unlocks
e-invoicing compliance and is likely needed for tax purposes past the
60,000 EGP/year threshold mentioned in the PayTabs research).

### Further research required (same rigor as PayTabs — verify via official docs, not secondhand claims)

For each candidate, confirm:
1. **Founder eligibility**: does onboarding require Commercial Register / Tax
   Card, or is there an individual/small-merchant path (analogous to
   PayTabs' Freelancer KYC)?
2. **Coverage**: does it deliver nationwide in Egypt, or specific
   governorates only?
3. **COD support**: Cash-on-delivery is dominant in Egyptian e-commerce —
   confirm the provider remits COD collections back to the merchant and on
   what schedule.
4. **API quality**: rate lookup, label/waybill generation, tracking webhook
   — does it have a real API or just a merchant portal?
5. **Pricing model**: per-shipment vs. volume contracts (volume contracts
   often require a registered business — another founder-eligibility
   trapdoor to check).

### Still open before implementation

1. Bosta's API auth header name and full endpoint paths weren't
   confirmed (docs.bosta.co is JS-rendered, not fetchable) — get these
   from the actual dashboard/docs once a Bosta account exists, same as
   PayTabs' base URL needed dashboard confirmation.
2. Whether to also integrate Mylerz as a Bosta fallback (courier-level
   redundancy, same cascade logic as payments) — worth it once Bosta
   eligibility for individuals is confirmed by actually signing up, and
   only if Mylerz's own eligibility gets separately confirmed.
3. Aramex Egypt / J&T Express Egypt — not evaluated, lower priority given
   Bosta already looks like a strong single-provider fit.

### Deliverable shape (mirrors src/lib/paytabs/)

- `src/lib/fulfillment/<provider>/client.ts` — same lazy-init,
  dormant-safe pattern as `stripe/client.ts` / `paytabs/client.ts`: never
  throws at module load, only when actually invoked without config.
- `src/lib/fulfillment/<provider>/shipment.ts` — create shipment / get
  rate / generate waybill.
- `src/app/api/webhooks/<provider>/route.ts` — delivery status updates
  (out for delivery, delivered, returned, COD collected).
- Migration: `shipments` table (order_id, provider, tracking_ref, status,
  cod_amount, cod_collected_at) — provider-agnostic shape, same reasoning
  as `payment_provider`/`provider_transaction_ref` on `orders`.
- Wire into order fulfillment flow: once `payment_status = 'succeeded'`
  (or immediately for COD orders, which don't wait on payment), create a
  shipment.

---

## Wave 10: Payment Cascade Completion

Prerequisite reading: `docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md` (already
fixed for correctness in an earlier pass — the design is sound, just not
implemented as a live selector yet).

### Scope

1. **PayMob adapter** (`src/lib/paymob/`) — same shape as
   `src/lib/paytabs/`. Verify PayMob's actual individual/freelancer
   onboarding path before building against it (earlier research found
   PayMob's *standard* path requires Commercial Register + Tax Card; their
   community forum mentioned an "Individuals" option on the POS signup page
   that was never independently confirmed — confirm this first).
2. **Third provider**: Tap Payments' Solopreneur product was surfaced by
   research but never independently verified the way PayTabs was — same
   verification bar applies before adopting it.
3. **`IPaymentProvider` interface**: currently only exists as documentation
   in `docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md`, never implemented as an
   actual TypeScript contract. Create
   `src/lib/contracts/payment-provider.ts` and have PayTabs (retrofit) and
   PayMob implement it.
4. **`payment_providers` table + selector**: the DB-driven priority/
   fallback/health-check system described in the architecture doc. This is
   the part that turns "3 separate provider modules" into an actual
   cascade — without it, adding PayMob just gives you 2 independent
   payment paths, not a fallback chain.
5. **Migration reconciliation**: `orders.payment_provider` /
   `provider_transaction_ref` (migration 017) were deliberately built
   provider-agnostic for this — no schema rework needed, just population
   by whichever provider actually processed the order.

### Explicit non-goal for Wave 10

Do not build a generic "any provider in the world" abstraction. Scope is
exactly: PayTabs (done) → PayMob → one more Egypt-eligible fallback. Stripe
stays dormant/archived, not part of the active cascade.

---

## Cross-Wave Constraint (applies to both)

Every new provider module must follow the dormant-safe pattern established
in `src/lib/stripe/client.ts` and `src/lib/paytabs/client.ts`: config read
lazily, never at module load, throws a named `*NotConfiguredError` (not a
generic `Error`) that calling routes catch and turn into a graceful 503.
This is not optional — the Vercel build failures earlier in this project's
history were caused by exactly the opposite pattern (module-load throws),
and every future provider addition risks reintroducing that bug if this
isn't followed by default.
