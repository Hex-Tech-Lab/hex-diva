# Archived: pre-Astryx design system

**Archived**: 2026-07-23
**Why**: Superseded by `src/styles/glamd-tokens.css` + `@astryxdesign/core`.

These files were the storefront's original hand-rolled design system —
built before `glamd-tokens.css` was established as the single source of
truth (gold `#D4AF37` / cream `#F7F3EC` / charcoal `#1A1611`, Playfair
Display + Inter). They used a different, conflicting palette (rose-gold
`#B76E79`, emerald, sapphire, Poppins) and were never reconciled with the
canonical system before this migration.

Contents:
- `docs/DESIGN_TOKENS.md` — the old token documentation.
- `styles/design-system.css` — the old CSS custom properties.
- `components/ui/*.tsx` — the old hand-rolled shadcn-style primitives
  (button, card, input, select, badge, table, alert, skeleton), replaced
  repo-wide by `@astryxdesign/core` components.

Kept per this project's "archived, not deleted" rule (same pattern as the
Stripe integration and the PayTabs/fulfillment-engine branches noted in
`docs/adr/ADR-012-shopify-native-commerce-vs-custom.md`'s archive table) —
nothing built is thrown away, it's kept discoverable in case any part of
it is ever needed for reference.

**Not imported by any live code.** This directory is for reference only.
