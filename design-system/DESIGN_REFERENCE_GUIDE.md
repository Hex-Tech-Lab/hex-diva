# GlamD - Design Reference & Image Generation Guide

**Project**: Hex-Diva (Luxury Beauty E-Commerce)  
**Brand**: GlamD - Diva - A7la Diva (undecided) - Luxury Beauty  
**Market**: Egypt/MENA  
**Aesthetic**: Old-money luxury, sensual, Sephora meets Aesop  

---

## Design System

### Color Palette
- **Primary**: Antique Gold (#D4AF37)
- **Background**: White (#FFFFFF) / Black (#000000)
- **Neutrals**: Warm grays (sand, taupe, stone, smoke)

### Typography
- **Display/Headers**: Playfair Display (serif)
- **Body/UI**: Inter (sans-serif)
- **Hierarchy**: Strong contrast, generous negative space

---

## Image Generation Briefs

These briefs are ready to use with Claude's image generation (or ChatGPT Images). Paste the relevant SKILL.md + brief into Claude and request images.

### 1. Web Components (Landing Page/Shop)

**Using**: `imagegen-frontend-web` skill (located at `~/.claude/skills/taste-skill/skills/imagegen-frontend-web/SKILL.md`)

**Brief**:
```
Luxury beauty e-commerce for premium nails and eyelash extensions. 
Market: Egypt/MENA affluent women, 25-45, old-money aesthetic.
Brand: Sephora meets Aesop luxury. Sensual, not provocative.

Generate 4 sections:
1. Hero: 60/40 split (text left, cinematic hand/wrist imagery right showing makeup detail)
   - Antique gold (#D4AF37) text on white background
   - Playfair Display headline
   - Minimalist CTA button
   
2. Product Grid: 3-column flat-lay photography
   - Premium nails and eyelash extension close-ups
   - Antique gold accents/branding
   - Generous whitespace between items
   
3. Testimonials: Star ratings + client quotes
   - Antique gold stars
   - Client names (first name only)
   - Premium serif quotes
   
4. Footer: Contact, about, referral information
   - Dark background option
   - Clean typography
   - Secondary navigation

Style: Cinematic, art-directed, strong negative space, ease-out motion on hover.
Design variance: 8, Visual density: 4, Implementation clarity: 9
```

### 2. Mobile Flows (B2B + Affiliate)

**Using**: `imagegen-frontend-mobile` skill (located at `~/.claude/skills/taste-skill/skills/imagegen-frontend-mobile/SKILL.md`)

**Brief**:
```
Premium mobile app for B2B wholesale portal + affiliate commission dashboard.
Same antique gold + white design system as web.

B2B Portal Screens (3 screens):
1. Company Account Login
   - Email + password
   - "Login as Wholesaler" CTA
   - Simple, trustworthy
   
2. Product Catalog (iOS-native aesthetic)
   - Product grid (2 columns)
   - Filter/sort options
   - Quantity selector
   - Add to bulk order button
   
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
   - Visual commission tracking (line or bar chart)
   - Tier breakdown (5%, 10%, 15%)
   - YTD total
   
3. Stats Cards
   - Total clicks
   - Total conversions
   - Revenue generated
   - Payout pending

All: 375px viewport, dark mode toggle shown, Playfair/Inter typography,
touch-friendly spacing, platform-native (iOS premium feel).
Density: 3, Clarity: 10, Color discipline: 10
```

### 3. Brand Kit

**Using**: `brandkit` skill (located at `~/.claude/skills/taste-skill/skills/brandkit/SKILL.md`)

**Brief**:
```
Luxury beauty brand system for GlamD.

Brand Identity Board (3×3 grid):
1. Logo Concept
   - Wordmark: "GlamD" in Playfair Display
   - Mark: Simple, elegant, premium
   - Option: Monogram "G" with subtle luxury symbol (gold leaf or lash flourish)
   
2. Color System
   - Primary: Antique Gold (#D4AF37)
   - Secondary: White (#FFFFFF), Black (#000000)
   - Tertiary: Warm neutrals (sand, taupe, stone)
   - Show swatches and application
   
3. Typography
   - Playfair Display (display sizes: 72px, 48px, 36px)
   - Inter (body: 16px, 14px, 12px)
   - Hierarchy examples
   
4. Logo Applications
   - Website header/hero
   - Business card (gold foil on cream)
   - Social media post (Instagram grid)
   
5. Packaging Mockup
   - Premium box with antique gold stamp
   - Product label (nail lacquer or lash serum)
   
6. UI Components
   - Button states (primary, hover, disabled)
   - Form inputs
   - Cards/sections
   
7. Icon System
   - 6-8 custom icons (cart, heart, user, settings, etc.)
   - Consistent stroke weight
   - Antique gold color
   
8. Photography Direction
   - Cinematic close-ups of hands/wrists
   - Flat-lay product photography
   - Tonal treatment (warm, premium)
   
9. Brand Atmosphere
   - Mood board panel showing overall brand energy
   - Premium, sensual, old-money aesthetic

Style: Minimal presentation, dark charcoal canvas, strong gutters,
sparse typography, cinematic brand atmosphere.
```

---

## How to Generate Images

### Method 1: Claude's Image Generation (Recommended)

1. Copy the appropriate SKILL.md file (all 3 located in `~/.claude/skills/taste-skill/skills/`)
2. Go to Claude.ai or Claude Code
3. Paste the SKILL.md content
4. Paste the relevant brief above
5. Request images (e.g., "Generate the 4 website sections as described")
6. Save generated images to `/home/kellyb_dev/projects/hex-diva/design-system/`

### Method 2: ChatGPT Images

1. Upload the SKILL.md file to ChatGPT
2. Paste your brief
3. Request images
4. Download and save to design-system folder

---

## Output Structure

Once images are generated, organize them:

```
design-system/
├── DESIGN_REFERENCE_GUIDE.md (this file)
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

## Taste-Skill SKILL.md Files

All three skills are available at:
- Web: `~/.claude/skills/taste-skill/skills/imagegen-frontend-web/SKILL.md`
- Mobile: `~/.claude/skills/taste-skill/skills/imagegen-frontend-mobile/SKILL.md`
- Brand: `~/.claude/skills/taste-skill/skills/brandkit/SKILL.md`

These files contain full art-direction guidance, configuration dials, and composition principles.

---

## Next Steps

1. Use the briefs above with Claude/ChatGPT to generate images
2. Save generated images to the folders above
3. Use images as reference for implementation
4. Feed the images to Claude Code for frontend development

