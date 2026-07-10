# Product Research Plan: Hex-Diva 100 SKU MVP
**Track A - Hours 0-8 Execution**

**Date**: 2026-07-10  
**Status**: Hour 0 Checkpoint - Methodology Confirmed  
**Researcher**: Claude Code (Autonomous Agent)

---

## MISSION STATEMENT

Finalize and validate a luxury cosmetics product database of exactly 100 SKUs across 4 categories:
- **Eyelashes**: 40 SKUs
- **Nails**: 35 SKUs
- **Makeup Sponges**: 15 SKUs
- **Premium Packaging**: 10 SKUs

All products must have complete metadata (name, category, price, cost, images, descriptions) and pricing validation complete (retail, wholesale multipliers, margin calculations).

---

## RESEARCH METHODOLOGY

### Phase 1: Product Database Construction (Hours 0-2)
**Objective**: Build the complete 100 SKU product matrix

**Approach**:
1. Leverage existing PRODUCT_SCHEMA.md variant structure as template
2. Generate realistic product names following luxury brand conventions
3. Create realistic supplier cost estimates based on market research
4. Calculate B2C retail prices using 400-600% markup strategy
5. Verify 70-80% gross margin targets
6. Assign B2B tier pricing (Bronze 0.75x, Silver 0.65x, Gold 0.50x)

**Data Collection**:
- Product name format: `[Brand/Style] [Product Type] - [Key Attribute]`
- Supplier source: Mix of AliExpress, Chinese manufacturers, Korean beauty suppliers
- Cost basis: Existing market research supplemented by plausible estimates
- Price validation: Mathematical verification of margin calculations

**Output**: Structured JSON/CSV with all 100 SKUs

---

### Phase 2: Pricing Validation (Hours 2-4)
**Objective**: Verify pricing strategy achieves financial targets

**Validation Framework**:

```
Step 1: Supplier Cost Analysis
├─ Eyelashes: $8-12/pair
├─ Nails: $12-20/set
├─ Sponges: $2-5/item
└─ Packaging: $3-8/box

Step 2: Retail Price Calculation
├─ Apply 400-600% markup to supplier cost
├─ Category-specific pricing bands
└─ Psychology pricing (e.g., $34.99, $49.99, not round numbers)

Step 3: Margin Verification
├─ Gross Margin = (Retail Price - Supplier Cost) / Retail Price
├─ Target: 70-80% gross margin
├─ Format: Gross Margin % after supplier cost

Step 4: B2B Tier Pricing
├─ Bronze: Retail Price × 0.75 (25% discount)
├─ Silver: Retail Price × 0.65 (35% discount)
├─ Gold: Retail Price × 0.50 (50% discount)
└─ Maintain >50% margin even at Gold tier

Step 5: Financial Sanity Check
├─ Verify all margins >= 50% (minimum operational threshold)
├─ Spot-check 10 random SKUs for mathematical accuracy
└─ Document any outliers
```

**Validation Targets**:
- 100% of products have retail price ≥ $12 USD
- 100% of products have gross margin ≥ 70%
- 100% of products have Gold-tier pricing ≥ supplier cost × 1.5x
- All four categories represented in final product mix

---

### Phase 3: Competitor Analysis & Market Validation (Hours 4-6)
**Objective**: Validate product mix against competitive landscape

**Methodology**:
1. Reference existing BOUTIQUE_RESEARCH.md for market leaders
2. Apply DATA_VERIFICATION_ANALYSIS.md framework:
   - Monthly Revenue = Traffic × Conversion Rate × Basket Size
   - Conservative: 200K traffic × 1% conversion × 400 EGP = $15.7K/month
   - Moderate: 500K traffic × 1.5% conversion × 450 EGP = $66K/month
   - Optimistic: 1M traffic × 2% conversion × 500 EGP = $196K/month

3. Hex-Diva positioning:
   - Premium niche (target: customers paying 2-3x for curated luxury)
   - Year 1 goal: $50K-$200K USD annually (realistic)
   - Differentiation: Aesthetic + brand story + curation

**Competitive Differentiation**:
- NOT competing on volume with market leaders
- Focus: Premium segment with higher margins
- Strategy: Luxury brand positioning throughout
- Community: Lifestyle emphasis over transactional

**Data Validation**:
- Product mix reflects competitive gaps (premium positioning)
- Pricing aligns with Egyptian luxury market expectations
- Category mix matches platform capabilities (4 collections)

---

### Phase 4: Final Validation & Documentation (Hours 6-8)
**Objective**: Create production-ready import specifications

**Deliverables**:
1. **docs/PRODUCT_VALIDATION_FINAL.md**: Complete product list
   - All 100 SKUs with metadata
   - Pricing breakdown (retail, costs, margins)
   - B2B tier pricing for each product
   - Import specifications for Track D

2. **Product Data Structure**:
   ```json
   {
     "sku": "EL-NAT-BLK-8MM-01",
     "title": "Italian Luxury Eyelashes - Natural Black 8mm",
     "collection": "Sculpted Lashes",
     "category": "Eyelashes",
     "description": "Handcrafted dramatic eyelashes with natural weaving...",
     "supplier": "AliExpress Vendor #XYZ",
     "supplier_cost_usd": 8.50,
     "retail_price_usd": 44.99,
     "gross_margin_percent": 81.1,
     "b2b_pricing": {
       "bronze_0_75x": 33.74,
       "silver_0_65x": 29.24,
       "gold_0_50x": 22.49
     },
     "variants": {
       "shade": "Black",
       "length": "8mm",
       "style": "Natural",
       "quantity": "1 Pair"
     },
     "image_url": "https://images.cdn.shopify.com/...",
     "search_tags": ["eyelashes", "italian", "luxury", "natural"],
     "trending_signals": {
       "tiktok": true,
       "instagram": false,
       "viral_score": 8.2
     }
   }
   ```

3. **Commit to Branch**: Push to `claude/hex-diva-track-a-product-research`

4. **PR Readiness**: Prepare merge to main with full documentation

---

## DATA SOURCES & VALIDATION

### Primary Sources
1. **PRODUCT_SCHEMA.md**: Variant structure and category definitions
2. **BOUTIQUE_RESEARCH.md**: Competitive landscape and positioning
3. **DATA_VERIFICATION_ANALYSIS.md**: Mathematical validation framework
4. **Market research**: AliExpress pricing, beauty industry benchmarks

### Assumptions & Basis
- Supplier costs based on AliExpress wholesale tier (bulk ordering)
- Retail prices calibrated to luxury beauty market expectations
- Markup percentages (400-600%) validated against gross margin targets
- B2B tier multipliers ensure profitable wholesale operations

### Validation Checkpoints
- ✅ Exact 100 SKU count (40, 35, 15, 10 split)
- ✅ All pricing mathematically consistent
- ✅ All margins >= 70% B2C, >= 50% B2B Gold
- ✅ Product diversity across categories
- ✅ Realistic product names and descriptions
- ✅ Competitor positioning alignment

---

## HOUR BREAKDOWN

| Hour | Task | Deliverable |
|------|------|-------------|
| 0 | Research methodology + market validation approach | **docs/PRODUCT_RESEARCH_PLAN.md** (this doc) |
| 1-2 | Product database construction (100 SKUs) | Structured data with names, costs, prices |
| 2-4 | Pricing validation + margin verification | All 100 products with validated margins |
| 4-6 | Competitor analysis + market validation | Positioning strategy confirmed |
| 6-8 | Final documentation + PR preparation | **docs/PRODUCT_VALIDATION_FINAL.md** + merge PR |

---

## SUCCESS CRITERIA

At Hour 8, success is defined as:

1. ✅ **100 SKU Database Complete**
   - 40 Eyelashes, 35 Nails, 15 Sponges, 10 Packaging
   - All with name, category, cost, retail price, description
   - All with images/CDN URLs (or placeholders)

2. ✅ **Pricing Validated**
   - All products >= $12 USD retail
   - All products >= 70% gross margin (B2C)
   - All products >= 50% margin at Gold tier (B2B)
   - Mathematical accuracy spot-checked

3. ✅ **Competitor Analysis Complete**
   - Product mix validated against market leaders
   - Pricing positioned correctly for premium niche
   - Collection structure confirmed ready for Shopify

4. ✅ **Documentation Production-Ready**
   - **docs/PRODUCT_VALIDATION_FINAL.md** with full specifications
   - All data structured for Track D import
   - B2B tier pricing calculated for all SKUs
   - PR ready to merge to main

---

## NOTES ON AUTONOMY

This agent operates fully autonomously within Hours 0-8:
- No permission requests needed for research decisions
- Pricing estimates made using published market data
- Product names generated following luxury brand conventions
- Validation done using mathematical framework from existing docs
- All commits to `claude/hex-diva-track-a-product-research` branch

---

**Document Version**: 1.0  
**Status**: Ready for Phase 1 (Product Database Construction)  
**Next Checkpoint**: Hour 4 - 100 SKU database with base pricing
