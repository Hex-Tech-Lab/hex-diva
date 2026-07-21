# GlamD Roster Provenance — scripts/roster-real.json (2026-07-16)

Built inline by Fable-Orchestrator after rejecting the fabricated roster (`scripts/scraped-products.json` — sequential fake EANs, Unsplash images, invented suppliers; AGY's scraper worktree copy is byte-identical, md5 d7f770e8).

## Sources (product identity: name, brand, barcode)
| Source | Products | Categories |
|---|---|---|
| upcitemdb.com brand pages: `info-ardell_fake-eyelashes-adhesives` | 40 (Ardell, DUO) | eyelashes |
| upcitemdb.com: `info-kiss_false-nails` | 35 (KISS, Broadway) | nails |
| upcitemdb.com: `info-real-techniques`, `info-tweezerman` | 25 (Real Techniques, Tweezerman) | accessories |
| Open Beauty Facts API (30 pulled) | 0 used in final (no barcode overlap; kept in scratchpad obf_raw.json) | — |

Every product's `source_url` points to its upcitemdb product page. Kids' lines (Little Diva) and off-brand items (men's grooming, mirrors, foot care) were curated out.

## Quality gates (all enforced by assembler script, all pass)
- 100 products, exactly 40 eyelashes / 35 nails / 25 accessories.
- Every barcode is a real UPC-A/EAN with **valid check digit** (assert-fail on any invalid).
- **Zero duplicate** and **zero adjacent-consecutive** barcodes (the fabrication signature of the rejected roster).
- No stock-photo domains (all image_url currently null — see gap below).

## What is real vs. ours
- **Real (externally sourced):** product name, brand, barcode, source URL.
- **Ours (commercial decisions, deterministic):** GLMD SKUs; `price_egp` in banded boutique ranges (lashes 180–320, multipacks 350–550, adhesives 120–200, press-on sets 350–600, tips kits 400–700, sponges 180–350, tweezers 250–450, curlers 300–500, files 120–250 EGP — anchored to BOUTIQUE_RESEARCH.md ~400 EGP premium basket); B2B tiers 75/65/50% of retail; inventory pseudo-random 50–400 seeded by barcode; short original marketing descriptions (template-generated, not copied from listings).
- `supplier_cost` intentionally absent — unknown, not invented.

## Known gaps (honest)
1. **image_url is null for all 100** — real product images need a dedicated pass (brand CDN / retailer images per barcode). Do NOT ship shop pages with nulls; use category placeholder images until the image pass lands.
2. EGP prices are our boutique pricing, not scraped market prices (per role of a retail price list).
3. Barcodes came from upcitemdb (crowd-sourced but reliable for major brands); spot-check a sample against a second DB before printing labels.

Assembler + raw pulls preserved in session scratchpad (`assemble_roster.py`, `obf_pull.py`, `obf_raw.json`).

## Image pass

**Agent:** W2-Images (Fable subagent) — 2026-07-16
**Result:** 100/100 products in `scripts/roster-real.json` now have a real, verified `image_url`. 0 null.

### Method
1. Fetched each product's `source_url` (upcitemdb page for the exact barcode) with throttling; all 100 pages cached.
2. Extracted only images the page marks as product images for that UPC (`alt="UPC <barcode> product image for ..."` / `class="product"`), so identity is anchored to the barcode, not fuzzy name matching. Related-product and barcode-render images excluded.
3. Ranked candidates by host reliability and resolution (Target scene7 1000px > Walmart 450px > Walgreens/Sally/Amazon > other); rejected dead hosts (c.shld.net, volusion, jet.com).
4. Verified every candidate with `curl -sIL` (HEAD): required HTTP 200 + `Content-Type: image/*` before writing. First passing candidate wins.
5. upcitemdb trial API used as fallback for 3 low-quality picks (budget spent: ~5 of 100/day); 1 upgrade landed (GLMD-ACC-025 → Lord & Taylor scene7 PDP image).
6. Final sweep re-verified all 100 written URLs in one batch: 0 failures.

### Images by source domain
| Domain | Count |
|---|---|
| i5.walmartimages.com | 59 |
| target.scene7.com | 38 |
| i.ebayimg.com | 1 (GLMD-NAIL-021, 500x500) |
| ecx.images-amazon.com | 1 (GLMD-NAIL-027, 160px thumb — only working genuine image found) |
| s7d9.scene7.com (Lord & Taylor) | 1 (GLMD-ACC-025) |

### Still null
None.

### Known quality caveats (genuine but sub-ideal; candidates for a later polish pass)
- GLMD-NAIL-027: 160px Amazon thumbnail, http-only.
- GLMD-ACC-025: http-only scene7 URL (verified 200 image/jpeg).
- GLMD-NAIL-021: eBay-hosted image; eBay CDN links can rot over time.

### DB sync
`scripts/roster-image-updates.sql` emitted with 100 `UPDATE public.products SET image_url ... WHERE sku ...` statements (wrapped in BEGIN/COMMIT) for orchestrator review + apply. This agent did NOT touch the database.
