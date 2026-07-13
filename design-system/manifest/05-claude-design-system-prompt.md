# Claude Design — GlamD System Setup Prompt

**Copy this entire prompt into Claude Design's "Setup Design System" field.**

---

## System Setup

**Project Name**: GlamD Luxury Beauty E-Commerce  
**Brand**: Hex-Diva (legal) / GlamD (brand)  
**Market**: Egypt/MENA + International  
**Stack**: React 19.2.7, Next.js 16.2.6, TypeScript 6.0.3, Tailwind 4.3.0, shadcn/ui  
**Breakpoints**: Mobile 320px, Tablet 640px, Desktop 1024px  

### Strategic Context (CRITICAL)

**GlamD bridges two luxury archetypes — 70/30 lean toward Sephora:**
1. **Sephora (Mass-Prestige)**: Accessible, trend-responsive, influencer-driven, promotional calendar (40% of strategy)
2. **Aesop (Ultra-Premium Niche)**: Architectural design, sensory/intellectual, quiet aesthetic (60% of strategy... wait, that's wrong)

**Correct Split**: 70% Sephora (accessibility, trends, promos, influencers, urgency) + 30% Aesop (architectural rigor, quietness, functional minimalism).

**Why 70/30?** Egyptian market realities: trend-based SKU availability, mixed consumer base (trend-followers + quality seekers), Year 1 launch phase requires promotional mechanics (free shipping, seasonal events).

**GlamD's Positioning**: Combine Sephora's **democratic accessibility, trend-responsiveness, influencer networks + promotional seasons** with Aesop's **architectural rigor, sensory specificity + intellectual positioning**.

**Geographic Boundary**: Egypt-only. All infrastructure, checkout, fulfillment frozen for local consumer. No worldwide shipping.

**Design Implication**: Intentional commercialization (not hyper-commercial noise). Seasonal energy cycles (not trend-chasing). Influencer-curated discovery (not algorithmic). Luxury without gatekeeping. Accessibility without dilution.  

---

## Brand Identity & Market Positioning

### Positioning: The Sephora/Aesop Intersection (70/30 Sephora-Lean)

**GlamD operates at the convergence of two luxury beauty archetypes — with deliberate 70/30 lean toward Sephora:**

- **Sephora Model (70%)**: Accessible luxury, trend-responsiveness, influencer-curated discovery, seasonal promotional calendar, intentional urgency language
- **Aesop Model (30%)**: Architectural design, functional minimalism, sensory/intellectual positioning, quiet aesthetic, premium pricing

**Why 70/30?** Egyptian market demands trend participation (sister company SKU availability), mixed consumer base (trend-followers + quality seekers), and Year 1 promotional mechanics (free shipping, Black Friday, GlamD Day events).

**GlamD's Synthesis**: Combine Sephora's **accessibility, influencer networks, seasonal urgency** with Aesop's **architectural rigor, sensory specificity + intellectual restraint**.

**Strategic Outcome**: Intentional commercialization (not hyper-commercial noise). Design-first beauty with seasonal presence + influencer curation + deliberate promotional moments.

**What This Means Visually**:
- ✅ Intentional commercialization (seasonal promos, launch specials, urgency language — but deliberate, not constant)
- ✅ Influencer dependency (core to GTM, Sephora-model affiliate network)
- ❌ Hyper-commercialization (Sephora's noise/visual clutter risk)
- ❌ Growth-limiting exclusivity (Aesop's scarcity risk)
- Instead: **Architectural design + seasonal energy + influencer-curated discovery**

**Market Audience**: 
- **Demographic**: Gender-fluid professionals (28–45), top-tier urban environments (Egypt/MENA primary, international secondary)
- **Psychographic**: Aesthetic purists, intellectual minimalists; motivated by design, environmental consciousness, quiet luxury
- **Behavioral**: Routine-driven repeat purchases, discovery via trusted curators (influencers/editorial, not algorithms), loyalty rooted in product performance + sensory consistency

### Seasonal Energy Cycles Framework

GlamD design philosophy rotates with 4-season rhythm, with 1 intentional trend per season (not continuous trend-chasing):

**Summer (Spring/Summer)**:
- Design energy: High vibrance, action-oriented
- Visual language: Seaside, blue sky, golden hour lighting
- Tone: Effusive, playful (restrained), exploratory
- Trend participation: 1 curated summer trend (e.g., color palette, luminosity)
- Secondary palette: Warm terracotta, coral undertones, golden accents

**Winter (Autumn/Winter)**:
- Design energy: Rustic, introspective, cozy
- Visual language: Natural materials, darker tones, firelight, stillness
- Tone: Prudent, measured, reflective, grounded
- Trend participation: 1 curated winter trend (e.g., heritage luxe, texture)
- Secondary palette: Deep forest, jewel tones, warm golds (not bright)

**Design Application**:
- **Color**: Rotate secondary palette seasonally; primary gold remains constant
- **Typography**: Playfair/Inter remain constant; weight/sizing emphasis rotates (summer lighter, winter bolder)
- **Photography**: Seasonal lighting for hands/wrists; product flat-lay backgrounds rotate (white/light summer, cream/warm winter)
- **Copy Tone**: Brand voice consistent; seasonal urgency calibrated ("season of discovery" vs. "season of refinement")
- **Motion**: 200ms ease-out baseline; spring/ease intensity varies (summer more lively, winter more restrained)

**What This Achieves**:
- Not static like Aesop (prevents brand stagnation)
- Not reactive trend-chasing like Sephora (maintains coherence)
- Positions GlamD to eventually set trends rather than chase them

---

### Messaging Firewall (Execution vs. Marketing)

**What We Execute Internally** (GTM/Operations):
- Premium delivery packaging (ribbons, custom cards, gifts)
- Repackaged products in upgraded containers (magnetic boxes, embellished cardboard)
- Unboxing ritual designed to reinforce luxury positioning

**What We Tell Customers** (Marketing Copy — NEVER mention packaging explicitly):
- ✅ "Immaculate sensory experience in every interaction"
- ✅ "Highest quality, refined ritual"
- ✅ "Architectural precision meets sensory intelligence"
- ❌ "Special packaging included"
- ❌ "Premium unboxing experience"
- ❌ Explicit promises of packaging upgrades

**The Principle**: Luxury is *experienced*, not *declared*. The packaging is executed flawlessly; the marketing emphasizes the sensory ritual, not the mechanics.

---

### How Sephora/Aesop Synthesis Informs Design

| Dimension | Sephora Approach (70%) | Aesop Approach (30%) | GlamD Rule |
|---|---|---|---|
| **Layout Density** | Discovery-dense (product grid, high information) | Intentional scarcity (whitespace as feature) | 8px grid base + generous breathing room (leans Aesop) |
| **Typography** | Trend-responsive (sans-serif, modern) | Timeless, intellectual (serif display, functional body) | Playfair Display (serif, heritage) + Inter (modern, accessible) |
| **Primary Color** | Bright, high-saturation accents (pop) | Refined, warm (muted apothecary) | Antique gold (#D4AF37) + warm neutrals (never bright/neon) |
| **Seasonal Color Palette** | No seasonal rotation (constant trend) | No seasonal rotation (static forever) | **Secondary palette rotates by season** (summer: warm terracotta/coral; winter: jewel tones/forest) — 1 trend per season max |
| **Imagery** | Polished, stylized, celebrity-driven | Raw, textural, architectural detail | Cinematic hands/wrists + flat-lay precision + texture close-up (leans Aesop) |
| **Commercialization Signals** | Hyper-commercial (constant urgency, noise) | Zero commercialization (no urgency) | **Intentional commercialization** (seasonal promos, launch free shipping, Black Friday, GlamD Day — deliberate, not constant) |
| **Interaction Motion** | Fast, playful, surprise (bounces, tweens) | Deliberate, sensual, confident (ease-out) | 200ms ease-out (luxury confidence), no spinning/pulsing. Spring motion optional. |
| **Trust & Discovery** | Data-driven algorithms ("just for you") | Curatorial expertise (editorial, uncompromising) | **Influencer-curated discovery** (affiliate network, transparent partnerships, editorial-first) — leans Sephora |

### Structural Synergy: Resolving the Tension

**Sephora's Risk**: Hyper-commercialization + visual noise → **GlamD Solution**: Quiet curation (fewer brands, influencer vetting, content-first, not algorithmic noise)

**Aesop's Risk**: Scale limits + exclusivity illusion → **GlamD Solution**: Platform model (B2B wholesale scale + affiliate network distribution) while maintaining architectural rigor in design system

**Result**: A **niche platform** — exclusive through rigorous curation, scalable through trust networks, not algorithms.

---

### Brand Positioning Details

### Color Palette

**Primary: Antique Gold (#D4AF37)**
- Never neon, never bright
- For buttons, icons, hover states, accents
- 4.1:1 contrast on white (AA for accents), 5.8:1 on black (AA for all uses)

**Light Background: #FFFFFF**  
**Dark Background: #0D0D0D**  

**Text (Light Mode)**:
- Headings: #2A2420 (neutral-700)
- Body: #4A4138 (neutral-600) — 6.8:1 contrast ✅
- Secondary: #776E66 (neutral-500) — 5.2:1 contrast ✅

**Text (Dark Mode)**:
- Headings: #FAFAF8 (neutral-50)
- Body: #E8E5E0 (neutral-200) — 8.4:1 contrast ✅
- Secondary: #D9D5D0 (neutral-300)

**Borders**: #D9D5D0 (light) / #4A4138 (dark)

### How Positioning Informs Design Choices

**From Aesop (Architectural Rigor)**:
- Negative space is intentional, not decorative
- Typography conveys intellectual authority (serif display font = heritage + precision)
- No visual noise, no hyper-commercialization
- Functional minimalism: every design element serves a purpose
- Sensory depth: imagery (hands, wrists, texture) evokes tactile/visceral response

**From Sephora (Democratic Accessibility)**:
- Clear navigation and information hierarchy
- Responsive, touch-first design (44px tap targets, mobile-first)
- Data transparency (B2B pricing, affiliate performance metrics visible)
- Accessible forms and checkout (no gatekeeping via complexity)

**Synthesis in GlamD Design**:
- Gold accent signals prestige; but used sparingly (Aesop restraint)
- Whitespace breathes (not cluttered like trend-driven retail)
- Typography is authoritative but warm (intellectual + sensual)
- Motion is deliberate, not frenetic (200ms ease-out, spring motion = sensory precision, not urgency)
- Data is transparent (B2B + affiliate) but never aggressive (no dark patterns)

---

### Typography

**Display Font**: Playfair Display (serif, luxury, heritage, intellectual authority)  
**Body Font**: Inter (sans-serif, modern, accessible, functional clarity)  
**Mono Font**: IBM Plex Mono (code, referral codes, technical transparency)

**Scale (Major Third 1.25 ratio)**:
- h1: 80px, Playfair Display, weight 700
- h2: 40px, Playfair Display, weight 700
- h3: 32px, Playfair Display, weight 700
- h4: 25px, Playfair Display, weight 600
- h5: 20px, Playfair Display, weight 600
- h6: 18px, Playfair Display, weight 500
- Body: 16px, Inter, weight 400
- Caption: 14px, Inter, weight 400

**Line heights decrease with size** (looser for body, tighter for display):
- Body (16px): 1.6
- H6 (18px): 1.4
- H3 (32px): 1.1
- H1 (80px): 0.95

**No all-caps body text.** Headings use title-case or sentence-case.

### Motion & Interaction

**Default transition**: 200ms ease-out  
**Button hover**: +2px lift (translateY), color shift to gold (#C9A442)  
**Form focus**: 2px solid gold outline, 2px offset  
**Card hover**: +4px lift, shadow elevation  
**Modal**: Scale-up + fade (250ms ease-out), no bounce  
**Parallax** (hero only): 30% of scroll speed, max ±5° tilt, disabled if prefers-reduced-motion  

**Forbidden**: Spinning, pulsing, gradient text, glassmorphism, auto-play video with sound.

---

## Three Business Pillars

### Pillar 1: B2C Retail Landing Page

**Hero Section**:
- 60/40 split (60% video, 40% text + CTA)
- Video: 16:9 aspect, muted, auto-loop, fallback image
- Headline: h1 (80px), Playfair Display, sensual copy (e.g., "The Art of Luxury Lashes")
- CTA: Primary gold button ("Discover Now" or "Shop Now")
- Parallax on hero (subtle, scroll-triggered)

**Product Grid**:
- 3-column desktop (12 grid), 2-column tablet, 1-column mobile
- Card: image + product name + star rating + price + "Add to Cart" button
- Card hover: +4px lift, shadow

**Social Proof**:
- Testimonials: Author photo + quote + 5-star rating + brand name
- Section title: h2 (40px), "Why Our Customers Love Us"

**CTA Footer**: Email signup, gold button, "Join the GlamD List"

### Pillar 2: B2B Wholesale Portal

**Company Account Onboarding**:
- Logo upload + company name + tax ID + address + contact person
- Net terms toggle ("Pay on invoice vs. immediate payment")
- Tax exemption option

**Product Catalog**:
- Table or grid: SKU | Product Name | Category | Standard Price | Tier Discount | MOQ | Availability
- Filters: Category, price range, availability
- Per-company custom price list display (if user assigned a B2B tier)

**Bulk Order Form**:
- SKU + quantity input (number field)
- Unit price + line total (calculated)
- Order summary: subtotal + tax + shipping + total
- "Bulk reorder" quick links (if repeat orders exist)

**Order History**:
- Table: Order # | Date | SKU Count | Total | Status (pending/shipped/delivered)
- Status badge (neutral-300 background, primary-300 text)
- Download invoice button (per order)

**Account Settings**:
- Company info edit
- Users/permissions (multi-buyer, role-based)
- Billing & shipping addresses

### Pillar 3: Affiliate / Influencer Dashboard

**Header Stats** (Card grid, 4 columns):
- Commission Earned (YTD): $X,XXX | Icon: 💰
- Referral Clicks: X,XXX | Icon: 👁️
- Conversion Rate: X% | Icon: ✅
- Pending Payout: $XXX | Icon: 🔄

**Referral Code Section**:
- Display code in monospace (IBM Plex Mono): `GD-INFLUENCER-2024`
- Copy button with hover feedback
- QR code option (if space allows)
- "Share referral link" social buttons (Instagram, TikTok, WhatsApp)

**Commission Trend Chart** (Line chart):
- X-axis: Dates (last 30 days)
- Y-axis: Commission $ earned
- Line color: primary-300 (gold)
- Tooltip on hover: Date + amount

**Recent Commissions Table**:
- Date | Source Order | Commission | Status (Paid/Pending)
- Status badge (green for paid, amber for pending)
- Sort by date descending

**Payout Status Card**:
- "Next payout scheduled: [Date]"
- Pending amount: $XXX
- Last paid date: [Date]
- "View payout history" link
- Manual bank transfer instructions (text block, small font)

**Performance Analytics** (Optional chart):
- Bar chart: Top 5 products by referrals
- Product name | Referral count
- Hover tooltip: Conversion rate for product

---

## Component Library (To Build)

**Core Components** (all in light + dark mode, accessible):

1. **Button** (primary, secondary, text, disabled)
   - Primary: gold background, dark text, hover darker gold
   - Secondary: gold border, transparent background, gold text
   - States: hover, active, focus, disabled

2. **Card**
   - Background white/dark surface, 1px border, padding 16px, shadow 0 2px 4px
   - Hover: lift +4px, shadow elevation

3. **Input** (text, email, number, textarea)
   - Background neutral-50/dark, border neutral-300, focus gold outline
   - Label above, helper text below

4. **Badge** (status tags)
   - Primary (gold bg), success (green), warning (amber), error (red)
   - Sizes: sm, md

5. **Table** (with header, striping, sortable columns)
   - Header: gold background, white text
   - Rows: alternating neutral-50/white
   - Hover row: neutral-100 background

6. **Modal / Dialog**
   - Backdrop: dark overlay (opacity 0.5)
   - Dialog: white card, shadow, close button (X)
   - Animation: scale-up + fade (250ms)

7. **Dropdown / Select**
   - Button trigger: gold border, transparent, chevron icon
   - Menu: white card, shadow, fade-in animation
   - Hover item: gold background

8. **Tabs**
   - Tab nav: gold underline on active, hover underline
   - Content panels: fade-in (150ms)

9. **Form Section** (label + input + helper text + error state)
   - Error state: red border + red icon
   - Success state: green checkmark

10. **Pagination**
    - Previous / Next buttons, numbered page buttons
    - Active page: gold background
    - Disabled state: opacity 0.5

11. **Toast / Notification**
    - Success (green), error (red), info (blue)
    - Slide-in from top-right (200ms)
    - Auto-dismiss after 4 seconds

12. **Navigation Bar**
    - Logo (Playfair Display, gold first letter), nav links, dark-mode toggle
    - Link active state: bold + gold underline
    - Mobile hamburger menu (collapse nav)

13. **Footer**
    - Background neutral-100/dark, links, social icons, copyright

14. **Spinner / Loading**
    - Spinner: rotating gold circle, 1s linear
    - Skeleton: shimmer animation (1.5s)

---

## Accessibility Requirements

- **Color Contrast**: All text ≥ 4.5:1 (WCAG AA)
- **Focus States**: Visible 2px gold outline on all interactive elements
- **Keyboard Navigation**: Tab-accessible, logical order (left-to-right, top-to-bottom)
- **Reduced Motion**: Disable all animations if `prefers-reduced-motion: reduce` is set
- **Images**: Alt text on all images (product name + brief description)
- **Aria Labels**: Form fields, icon buttons, status regions
- **Dark Mode**: Toggle available, all colors verified for dark mode contrast

---

## Responsive Design

- **Mobile (320px–639px)**: Single-column, full-width cards, large tap targets (44px min), stack all forms
- **Tablet (640px–1023px)**: 2–3 column grids, flexbox for layout, medium padding
- **Desktop (1024px+)**: Full 12-column grid, max-width 1200px, generous spacing

**Test breakpoints**: 320px, 375px, 640px, 768px, 1024px, 1280px

---

## Design Tokens (JSON provided separately)

- **Colors**: palette.json (OKLCH + hex)
- **Typography**: typography.json (fonts, scales, weights)
- **Motion**: motion-language.md (timings, easing, parallax)

**Tailwind Config Integration**:
- Use semantic color tokens (primary-300, neutral-600, etc.)
- Font families: --font-display, --font-body, --font-mono
- Spacing: 8px base unit (sm, md, lg, xl, 2xl, 3xl, 4xl)

---

## Motion & Layout Enhancement (Taste-Skill soft-skill)

**CRITICAL**: Apply Taste-Skill soft-skill variant rules to all components + pages.

### Taste-Skill Tuning Dials (Set to These Values)

| Dial | Setting | Meaning |
|---|---|---|
| **MOTION** | Luxury (sensual) | 200–250ms ease-out, spring motion, NO frenetic movement |
| **VARIANCE** | Premium (controlled) | Grid variance allowed, deliberate shifts, NO randomness |
| **DENSITY** | Spacious (breathing) | Generous whitespace, 8px base unit, NO clutter |

### GSAP Motion Skeletons (Canonical Code)

Taste-Skill outputs GSAP motion templates. CC integrates via Framer Motion or native GSAP:

```javascript
// Primary button hover
gsap.to(".button.primary:hover", {
  duration: 0.2,
  ease: "power2.out",
  y: -2,
  boxShadow: "0 4px 12px rgba(212, 175, 55, 0.15)",
  overwrite: "auto"
});

// Card hover
gsap.to(".card:hover", {
  duration: 0.2,
  ease: "power2.out",
  y: -4,
  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)"
});

// Modal entrance
gsap.from(".modal-dialog", {
  duration: 0.25,
  ease: "back.out",
  scale: 0.95,
  opacity: 0
});
```

### Anti-Slop Guardrails (Taste-Skill Enforced)

**Hard rules**:
- ❌ No em-dash typos or smart quotes
- ❌ No gradient text (contrast fail + accessibility fail)
- ❌ No all-caps body text (title/sentence case only)
- ❌ No spinning buttons, pulsing icons
- ❌ No random spacing (8px base ONLY)
- ❌ No blurry glassmorphism (cheap, inaccessible)

**Reference**: motion-language.md contains detailed motion specs + GSAP examples + Framer Motion fallback

---

## Design Constraints & Guardrails

❌ **Never**:
- Use neon/bright gold (#FFD700)
- All-caps body text
- Gradient text or gold-on-white text
- Glassmorphism or heavy blur
- Auto-play video with sound
- Spinning/pulsing buttons
- More than 3 fonts per page
- Image zoom on hover (product cards stay static)
- Side-stripe borders or decorative-only elements

✅ **Always**:
- Negative space (breathing room > cramped)
- Visible focus states (outline rings)
- Accessibility tested (contrast, keyboard, alt text)
- Dark mode toggle + verification
- Reduced-motion respect
- Responsive tested (320/640/1024px)

---

## Page Priority (Build Order)

1. **Landing Page** (hero + products + testimonials + footer)
2. **Product Catalog** (grid + filters + detail modal)
3. **Shopping Cart** (cart state + checkout flow preview)
4. **B2B Company Account** (account form + company dashboard)
5. **Affiliate Dashboard** (stats + commission table + referral code)

---

## Handoff Notes

- Use Tailwind 4.3.0 with custom colors (design-tokens.json)
- All components: React functional components with TypeScript types
- Icons: lucide-react (from shadcn/ui ecosystem)
- Form handling: React Hook Form + Zod validation
- Charts: recharts (if dashboard charts needed)
- State: Zustand (minimal, non-Redux)
- Dark mode: Next.js built-in `next-themes` (localStorage persist)

---

## Success Criteria

✅ Landing page mockups (hero, grid, social proof, footer)  
✅ B2B portal mockups (account, catalog, order history, settings)  
✅ Affiliate dashboard mockups (stats cards, charts, commission table, referral code)  
✅ All components in component library (button, card, input, modal, table, badge, pagination, toast)  
✅ Light + dark mode verified (all colors, contrast, readability)  
✅ Accessibility audit pass (WCAG AA, focus states, alt text, reduced-motion)  
✅ Responsive verified (320px mobile, 1024px desktop, in-between breakpoints)  
✅ Motion specs confirmed (200ms ease-out transitions, no forbidden animations)  

---

## Ready to Start?

1. Review this system prompt
2. Generate component library + page mockups
3. Deliver Figma designs (if available) or HTML/CSS artifacts
4. Hand off to CC for TypeScript integration + Tailwind config
5. Final polish with `/impeccable` skill

**Questions about positioning?** Refer to STRATEGIC-POSITIONING.md (explains why each design choice reflects market positioning).

**Questions about details?** Refer to design-brief.md, palette.json, typography.json, motion-language.md for detailed specs.

---

**Generated**: July 13, 2026  
**Status**: ✅ Ready for Claude Design execution
