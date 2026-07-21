# ADR-012: Shopify-Native Checkout/Payment/Fulfillment (Option B) vs. Custom ("Optimus")

**Status**: Accepted
**Date**: 2026-07-21
**Supersedes**: The undocumented drift away from `docs/SHOPIFY_ARCHITECTURE.md`'s
Pattern 3 (Shopify-hosted checkout) that occurred across this project's
history without ever being recorded as a decision.

---

## Context

`docs/SHOPIFY_ARCHITECTURE.md` (original planning doc) documented a clear
decision: custom React frontend for design freedom, but **Shopify's hosted
checkout, Shopify Payments/gateways, and Shopify fulfillment** for the
actual commerce mechanics. Its own words: "Keep Shopify ecosystem
(inventory, checkout, payments, webhooks)."

What actually got built, discovered mid-session on 2026-07-20/21: a fully
custom cart, orders schema, `/api/checkout`, a custom Stripe integration
(later found non-viable for Egypt, archived dormant), a custom PayTabs
integration built to replace it, and a custom multi-provider fulfillment
engine (Bosta, SIDEUP adapters, governorate-routing, eligibility
tracking). None of this was a documented decision — it was organic drift,
feature by feature, never checked back against the original architecture
doc. It cost real engineering time and, per the founder's own account,
meaningful budget, on infrastructure (idempotency systems, RLS policies,
oversell-bug fixes, OAuth token handling) that a Shopify app might have
provided for free or near-free.

Verified during this ADR's drafting:
- Shopify Payments does not support Egypt (confirmed against Shopify's own
  39-country list) — same constraint that made Stripe non-viable.
- PayTabs, Bosta, SIDEUP, Fincart, and most other researched Egyptian
  payment/fulfillment providers **do publish native Shopify apps** —
  Shopify checkout does not require Shopify Payments specifically, it
  requires a supported gateway app, which these providers already are.
- The founder has independently installed and begun evaluating Fawaterak,
  PayMob, and PayTabs as Shopify payment apps, and confirms SIDEUP is
  ready as a fulfillment option pending Bosta's own evaluation.
- The connected Shopify store is currently blocked from Admin API access
  by an unresolved billing/plan issue — this ADR cannot yet be verified
  against live app-installation state and should be re-checked once
  that's resolved.

## Decision

**Adopt Option B**: route checkout, payment, and fulfillment through
Shopify's native commerce stack (hosted checkout + payment/fulfillment
apps), reserving custom engineering ("Optimus," defined below) strictly
for capabilities Shopify + installed apps cannot provide — proven, not
assumed.

This directly reverses the undocumented drift. It does not reverse the
original `SHOPIFY_ARCHITECTURE.md` decision — it restores it.

### Why Option B over Option C (Shopify checkout/payment, custom fulfillment)

Shopify's native Shipping & Delivery settings (shipping profiles → zones
→ rates, plus carrier-calculated-rate apps) is the out-of-the-box
mechanism for tiered delivery pricing by provider/region — the same
capability the custom fulfillment engine (migrations/019, `src/lib/
fulfillment/`) was built to provide. Until there's evidence Shopify +
fulfillment apps (SIDEUP, Bosta, Fincart) genuinely cannot express the
routing/tiering this business needs, there is no basis for owning that
complexity ourselves. Fincart specifically offers auto-selection across
35 delivery providers by performance — this may cover the "cascading
fallback" need natively, the same way a Shopify payment app could cover
payment-channel routing.

### Why not straight to Option A status quo (keep building custom)

Explicitly rejected. This is the drift being corrected, not a viable
default. Custom code is justified only against the triggers below, per
provider/capability, not as a blanket architecture choice.

## "Optimus" — the custom-engineering fallback, defined

Optimus is not a rejected option — it is the **name for the fallback
path**, invoked only when a specific, provable gap exists between what
the business needs and what Shopify + installed apps deliver. Every
invocation of Optimus must cite which trigger below fired, for which
specific capability, with which specific provider — never invoked as a
blanket "let's just build it" default.

### Trigger conditions (starting thresholds — tune with real data, not vibes)

**Payment**
1. **Channel gap**: a payment channel/method demonstrably needed by
   customers (e.g. a specific BNPL provider, bank transfer method) is not
   reachable through any installed Shopify payment app's channel set.
2. **Cost gap**: the blended MDR across installed payment apps, at actual
   transaction volume, exceeds a defined threshold — *and* a custom
   integration is shown to reduce it by a material margin (recommend:
   >1.5 percentage points) after accounting for engineering/maintenance
   cost. Not before real volume data exists to calculate this against.
3. **Multi-provider channel handoff**: if the "route each transaction to
   whichever installed provider owns the customer's chosen channel,
   avoiding harsh-condition providers" pattern (raised 2026-07-21,
   PayMob/Fawaterak/PayTabs channel differences) cannot be expressed
   through Shopify's own payment method prioritization, and is proven
   necessary by real KYC/production outcomes (not assumed pre-emptively).
4. **Compliance gap**: a required compliance capability (e.g. ETA
   e-invoicing) is unavailable via any installed app for the majority of
   transaction volume, and building it is cheaper than paying a
   third-party service for it. (Note: PayMob already has a native ETA
   e-invoicing app — a real point in its favor despite its harsher MDR
   terms.)

**Fulfillment**
5. **Coverage gap**: a specific governorate/region has no adequate
   courier coverage through any installed Shopify fulfillment app,
   evidenced by real order data (recommend: >10% delivery-failure or
   no-coverage rate in that region over a meaningful sample, not a single
   anecdote).
6. **Live-failover gap**: automatic mid-day failover between providers
   (switching when a provider's service visibly degrades) is needed and
   no aggregator app (SIDEUP, Fincart) provides it.
7. **Volume-driven contract gap**: order volume reaches a level where a
   directly negotiated courier contract is materially cheaper than
   aggregator/app fees, net of engineering and account-management cost to
   run it ourselves.
8. **Multi-store orchestration gap**: the three planned stores (cosmetics,
   car accessories, apparel) need shared/pooled fulfillment logic that
   independent per-store Shopify app configuration cannot express.

### What does NOT count as a trigger

- "It would be nice to have more control" — not a trigger.
- "We already built it" — not a trigger. Sunk cost is not a reason to
  keep something active; it's a reason to archive it well (see below).
- A provider's KYC/onboarding friction, on its own, without a channel/
  cost/coverage gap behind it — that's a provider problem, evaluate a
  different provider first.

## Archived, not deleted

Per explicit instruction: nothing built is lost. The following remain in
git history, fully intact, on their own branches, unmerged into `main`:

| What | Branch | State |
|---|---|---|
| PayTabs payment adapter (client, checkout, webhook, idempotency) | `feature/paytabs-payment-provider` | Complete, build-verified, never merged |
| Fulfillment engine (contract, selector, Bosta adapter, SIDEUP adapter, governorate schema) | `feature/fulfillment-engine` | Complete, build-verified, never merged |
| Stripe integration | `wave-6-inventory-payments` (merged to main via PR #24) | Dormant in place — lazy-init, throws only if invoked without config, never crashes the build. Different archive shape than the two above because it was already correctly dormant-by-design before this ADR, not because it's less archived. |

**To revive**: identify which trigger fired (numbered above), for which
specific capability. `git checkout` the relevant branch, rebase onto
current `main`, and treat it as a fresh PR against the specific proven
gap — not a wholesale "turn custom back on."

## Process correction

The root cause of the undocumented drift was the absence of this ADR
until a founder-level review caught it. Going forward: any new payment,
checkout, or fulfillment provider integration — before writing adapter
code — must first confirm (a) whether a Shopify app exists for it, (b)
whether that app is installable/configurable for this business's actual
KYC/legal status, and (c) which trigger condition above justifies custom
work if the app path is insufficient. This confirmation should be a
one-line note in the PR description, not a separate research doc, so it
can't silently get skipped again.
