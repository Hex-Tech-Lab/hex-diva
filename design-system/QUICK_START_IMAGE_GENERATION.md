# Quick Start: Generate Design Images with Taste-Skill + Claude

This guide walks you through generating your three design reference boards.

---

## 📋 What You Have

✅ **3 Taste-Skill SKILL.md files** (in `./skills/`)
- `SKILL_imagegen-frontend-web.md` — Website components
- `SKILL_imagegen-frontend-mobile.md` — Mobile app screens  
- `SKILL_brandkit.md` — Brand identity system

✅ **3 Design Briefs** (in `DESIGN_REFERENCE_GUIDE.md`)
- Web components brief
- Mobile flows brief
- Brand kit brief

---

## 🎨 How to Generate Each Set

### Step 1: Web Components (Hero + Grid + Testimonials)

**Go to Claude.ai** (or Claude Code with image generation enabled)

1. Copy and paste the contents of:
   - `./skills/SKILL_imagegen-frontend-web.md`

2. Then paste this brief:
   ```
   Luxury beauty e-commerce for premium nails and eyelash extensions. 
   Market: Egypt/MENA affluent women, 25-45, old-money aesthetic.
   Brand: Sephora meets Aesop luxury. Sensual, not provocative.

   Generate 4 sections:
   1. Hero: 60/40 split (text left, cinematic hand/wrist imagery right)
      - Antique gold (#D4AF37) text on white background
      - Playfair Display headline
      - Minimalist CTA button
      
   2. Product Grid: 3-column flat-lay photography
      - Premium nails and eyelash extension close-ups
      - Antique gold accents
      - Generous whitespace
      
   3. Testimonials: Star ratings + client quotes
      - Antique gold stars
      - Client names
      - Premium serif quotes
      
   4. Footer: Contact, about, referral info
      - Dark background option
      - Clean typography

   Style: Cinematic, art-directed, strong negative space, ease-out motion.
   ```

3. Request: "Generate the 4 website sections as separate images"

4. Save images to: `./web-components/`
   - `hero-section.png`
   - `product-grid.png`
   - `testimonials.png`
   - `footer.png`

---

### Step 2: Mobile Flows (B2B + Affiliate Dashboard)

**Go to Claude.ai** (or Claude Code with image generation enabled)

1. Copy and paste the contents of:
   - `./skills/SKILL_imagegen-frontend-mobile.md`

2. Then paste this brief:
   ```
   Premium mobile app for B2B wholesale portal + affiliate commission dashboard.
   Design system: Antique gold (#D4AF37) + white, Playfair/Inter typography.

   B2B Portal Screens (iOS-native, 3 screens):
   1. Company Account Login
      - Email + password
      - "Login as Wholesaler" CTA
      - Simple, trustworthy
      
   2. Product Catalog
      - Product grid (2 columns)
      - Filter/sort options
      - Quantity selector
      
   3. Bulk Order Form
      - Product selection
      - Quantity input (44px min tap targets)
      - Order summary
      - Net-30 terms note

   Affiliate Dashboard Screens (3 screens):
   1. Referral Overview
      - Unique referral code (highlighted, copyable)
      - "Share code" button
      
   2. Commission Chart
      - Visual commission tracking
      - Tier breakdown (5%, 10%, 15%)
      - YTD total
      
   3. Stats Cards
      - Total clicks
      - Total conversions
      - Revenue generated
      - Payout pending

   All: 375px viewport, dark mode toggle, Playfair/Inter, touch-friendly.
   Platform: iOS-native premium feel.
   ```

3. Request: "Generate all 6 mobile app screens as separate images inside iPhone mockups"

4. Save images to:
   - `./mobile-flows/b2b-portal/`
     - `login.png`
     - `product-catalog.png`
     - `bulk-order.png`
   - `./mobile-flows/affiliate-dashboard/`
     - `referral-overview.png`
     - `commission-chart.png`
     - `stats-cards.png`

---

### Step 3: Brand Kit (Logo + Colors + Typography)

**Go to Claude.ai** (or Claude Code with image generation enabled)

1. Copy and paste the contents of:
   - `./skills/SKILL_brandkit.md`

2. Then paste this brief:
   ```
   Luxury beauty brand system for GlamD.

   Create a 3×3 brand identity board with:

   Row 1:
   - Logo Concept (wordmark "GlamD" + elegant mark)
   - Color System (gold, white, black, warm neutrals with swatches)
   - Typography (Playfair Display + Inter hierarchy examples)

   Row 2:
   - Logo Applications (website header, business card, social media)
   - Packaging Mockup (luxury gold-foil box)
   - UI Components (buttons, inputs, cards)

   Row 3:
   - Icon System (6-8 custom icons: cart, heart, user, settings, etc.)
   - Photography Direction (cinematic hands, flat-lay product mood)
   - Brand Atmosphere (mood panel showing old-money luxury aesthetic)

   Color palette: Antique gold (#D4AF37), white, black, warm grays.
   Typography: Playfair Display (serif), Inter (sans).
   Aesthetic: Premium, minimal, sensual, Sephora meets Aesop.
   ```

3. Request: "Generate one comprehensive 3×3 brand-kit board as a single image with all 9 panels"

4. Save image to:
   - `./brand-kit/brand-identity-board.png`

---

## 📸 After Generation

1. **Download** the images from Claude
2. **Rename** them according to the file structure above
3. **Save** to the appropriate subdirectories
4. **Commit** to git (or share with team)

```bash
# From project root:
git add design-system/
git commit -m "Add taste-skill generated design reference boards"
```

---

## 🔄 Iterating on Designs

If you need to regenerate or adjust:

1. Reference the appropriate SKILL.md file
2. Modify the brief with new requirements
3. Re-paste into Claude with updated brief
4. Generate new images
5. Save with version suffix if needed (e.g., `hero-section-v2.png`)

---

## ✅ What's Next

Once you have the 8-9 design reference images:

1. **Share with team** — Use these as reference for all frontend development
2. **Implement from images** — Feed images + frontend brief to Claude Code for HTML/React
3. **Keep as source of truth** — These become your design canon until final implementation

---

## 🎯 Tips

- **Keep it focused** — One Claude conversation per skill (web, mobile, brand)
- **Be specific** — Use the exact color codes (#D4AF37) in your briefs
- **Iterate fast** — Don't aim for perfect on first generation
- **Reference often** — Use these images in all future Claude conversations about this project

---

## 📂 Project Structure After Generation

```
design-system/
├── DESIGN_REFERENCE_GUIDE.md
├── QUICK_START_IMAGE_GENERATION.md (this file)
├── skills/
│   ├── SKILL_imagegen-frontend-web.md
│   ├── SKILL_imagegen-frontend-mobile.md
│   └── SKILL_brandkit.md
├── web-components/
│   ├── hero-section.png
│   ├── product-grid.png
│   ├── testimonials.png
│   └── footer.png
├── mobile-flows/
│   ├── b2b-portal/
│   │   ├── login.png
│   │   ├── product-catalog.png
│   │   └── bulk-order.png
│   └── affiliate-dashboard/
│       ├── referral-overview.png
│       ├── commission-chart.png
│       └── stats-cards.png
└── brand-kit/
    └── brand-identity-board.png
```

---

**Ready?** Go generate your design boards! 🚀
