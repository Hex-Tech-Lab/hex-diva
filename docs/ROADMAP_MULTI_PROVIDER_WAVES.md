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

### Research required (same rigor as PayTabs — verify via official docs, not secondhand claims)

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

### Candidates to evaluate (not yet verified — do not build against these
until confirmed, same standard as the PayTabs verification)

- **Bosta** — API-first, popular with Egyptian D2C/Shopify-style merchants,
  worth checking their onboarding tier for individuals.
- **Mylerz** — similar profile to Bosta, API + COD reconciliation.
- **Aramex Egypt** — established international carrier with Egypt
  operations; likely requires more formal onboarding (worth confirming,
  don't assume).
- **J&T Express Egypt** — newer entrant, aggressive on price, unclear API
  maturity — needs checking.

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
