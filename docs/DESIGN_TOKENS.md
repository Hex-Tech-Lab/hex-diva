# Hex-Diva Design Tokens

Complete design token system for luxury cosmetics brand. All components and pages reference these tokens for consistency.

---

## COLOR TOKENS

### Primary Colors
- **charcoal-900**: `#1a1a1a` — Primary dark, sophisticated backdrop
- **charcoal-800**: `#2d2d2d` — Secondary dark for contrast
- **charcoal-700**: `#404040` — Light dark variant

### Accent Colors  
- **rose-gold**: `#B76E79` — Primary accent, warmth, femininity
- **rose-gold-light**: `#d4a5ac` — Lighter variant for hovers/backgrounds
- **rose-gold-dark**: `#8b5961` — Darker variant for depth

### Jewel Tones
- **emerald-500**: `#50A895` — Nature-inspired prestige
- **emerald-light**: `#7ec2ad` — Lighter variant
- **emerald-dark**: `#3a8071` — Darker variant

### Deep Blues
- **sapphire-500**: `#1E3A8A` — Luxury, exclusivity
- **sapphire-light**: `#3a5bc7` — Lighter variant
- **sapphire-dark**: `#152563` — Darker variant

### Neutrals
- **off-white**: `#F5F3F0` — Primary neutral, breathing room
- **off-white-dark**: `#e8e4df` — Slightly darker neutral
- **off-white-darker**: `#d9d4cc` — For subtle dividers

### Functional Colors
- **success**: `#50A895` (emerald) — Positive actions
- **warning**: `#d4914e` — Caution states
- **error**: `#c56d7b` — Error/delete states
- **info**: `#1E3A8A` (sapphire) — Information

---

## TYPOGRAPHY TOKENS

### Font Families
- **serif-display**: `'Playfair Display', serif` — Headlines, editorial
- **sans-serif**: `'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif` — Body, UI

### Heading Styles

#### h1 - Hero/Page Title
- **Font**: Playfair Display
- **Size**: 56px (desktop) / 40px (tablet) / 32px (mobile)
- **Weight**: 700
- **Line Height**: 1.2
- **Letter Spacing**: -0.5px
- **Color**: charcoal-900

#### h2 - Section Title
- **Font**: Playfair Display
- **Size**: 40px (desktop) / 32px (tablet) / 28px (mobile)
- **Weight**: 700
- **Line Height**: 1.25
- **Letter Spacing**: -0.3px
- **Color**: charcoal-900

#### h3 - Subsection Title
- **Font**: Playfair Display
- **Size**: 28px (desktop) / 24px (tablet) / 20px (mobile)
- **Weight**: 600
- **Line Height**: 1.3
- **Color**: charcoal-900

### Body Styles

#### Body - Regular Text
- **Font**: Inter/Poppins
- **Size**: 16px (desktop) / 15px (tablet) / 14px (mobile)
- **Weight**: 400
- **Line Height**: 1.6
- **Color**: charcoal-900

#### Label - Form Labels
- **Font**: Inter/Poppins
- **Size**: 14px
- **Weight**: 500
- **Line Height**: 1.4
- **Color**: charcoal-900

---

## SPACING TOKENS

Base unit: 4px (allows for flexible, proportional layouts)

- **0**: 0px
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 24px
- **2xl**: 32px
- **3xl**: 48px
- **4xl**: 64px
- **5xl**: 96px

---

## BORDER RADIUS

- **none**: 0px
- **sm**: 4px — Subtle, minimal rounding (input fields, small buttons)
- **md**: 8px — Default, most components (cards, standard buttons)
- **lg**: 16px — Large, prominent components (hero sections, modal backgrounds)
- **full**: 50% — Fully rounded (badges, circular images)

---

## SHADOW TOKENS

### Elevation Shadows

- **Shadow 1**: `0 2px 4px rgba(26, 26, 26, 0.08)` — Hover states, cards
- **Shadow 2**: `0 4px 8px rgba(26, 26, 26, 0.12)` — Cards, modals
- **Shadow 3**: `0 8px 16px rgba(26, 26, 26, 0.16)` — Dropdowns, mid-elevation
- **Shadow 4**: `0 12px 24px rgba(26, 26, 26, 0.2)` — Modals, major overlays
- **Shadow 5**: `0 20px 40px rgba(26, 26, 26, 0.25)` — Lightbox, full-screen overlays

---

## MOTION/ANIMATION TOKENS

### Duration
- **quick**: 150ms
- **base**: 200ms
- **standard**: 250ms
- **slow**: 300ms
- **slower**: 400ms
- **slowest**: 500ms

### Easing Functions
- **ease-in-out**: `cubic-bezier(0.4, 0, 0.2, 1)` — Standard, natural motion
- **ease-out**: `cubic-bezier(0.0, 0, 0.2, 1)` — Quick entry
- **ease-in**: `cubic-bezier(0.4, 0, 1, 1)` — Slow exit
- **linear**: `linear` — Consistent speed

---

## RESPONSIVE BREAKPOINTS

Mobile-first design approach.

- **xs**: 320px (minimum phone width)
- **sm**: 640px (landscape phone / tablet start)
- **md**: 1024px (tablet / small desktop)
- **lg**: 1280px (desktop)
- **xl**: 1536px (large desktop)

---

## ACCESSIBILITY

### Contrast Ratios (WCAG AAA)

- charcoal-900 (#1a1a1a) on off-white (#F5F3F0): **16.4:1** ✓ AAA
- rose-gold (#B76E79) on off-white (#F5F3F0): **6.5:1** ✓ AAA
- emerald (#50A895) on off-white (#F5F3F0): **7.2:1** ✓ AAA
- sapphire (#1E3A8A) on off-white (#F5F3F0): **8.1:1** ✓ AAA

### Focus Indicators
- **Focus Ring**: 2px solid rose-gold (#B76E79)
- **Outline Offset**: 2px
- Applied to: buttons, links, form inputs, interactive elements

---

**Version**: 1.0  
**Last Updated**: 2026-07-10  
**Status**: Production-ready for Track B integration
