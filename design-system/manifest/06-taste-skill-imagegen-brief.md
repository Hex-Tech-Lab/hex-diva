# Taste-Skill Image Generation — GlamD Reference Boards

**Purpose**: Generate reference images before Claude Design execution. Shows mood, layout, typography, motion.

**Status**: taste-skill installed globally ✅ (from prior session)

---

## Step 1: Generate Web Comps (Hero + Grid + Testimonials + Footer)

**Command**:
```bash
taste-skill imagegen-frontend-web \
  --brief "Luxury beauty e-commerce (eyelash extensions, premium nails). Egypt/MENA market. Affluent women, 25-45, old-money aesthetic. Sensual, not provocative. Antique gold (#D4AF37) on white/black. Playfair Display serif headers, Inter sans body. Hero: 60/40 split with cinematic video of hands/wrists. Product grid: 3-column, flat-lay photography. Testimonials: star ratings, quotes. Strong typography hierarchy, negative space, ease-out motion. Brand feel: Sephora meets Aesop luxury." \
  --output /mnt/user-data/outputs/hex-diva-design-system/glamd-web-comps-reference.png \
  --style soft-skill \
  --density spacious \
  --motion luxury \
  --variance premium
```

**What you get**:
- Hero section (60/40 video + text, CTA button)
- Product grid (3-column, product cards with images, prices, badges)
- Testimonials section (star ratings, quotes, author photos)
- Footer (links, brand name, social)
- All in antique gold + white aesthetic, Playfair + Inter typography

**Expected file**: `glamd-web-comps-reference.png` (~2–3 MB, 2560×1440 or higher)

---

## Step 2: Generate Mobile Flows (iOS/Android Screens)

**Command**:
```bash
taste-skill imagegen-frontend-mobile \
  --brief "Mobile screens for B2B wholesale portal (company account login, product catalog, bulk order form) and affiliate dashboard (referral code, commission chart, stats cards). Same antique gold + white, Playfair/Inter typography. Responsive, readable on 375px width. Touch-friendly tap targets (44px min). Dark mode toggle shown." \
  --output /mnt/user-data/outputs/hex-diva-design-system/glamd-mobile-flows-reference.png \
  --style soft-skill \
  --format ios-android \
  --variant "B2B portal + affiliate dashboard"
```

**What you get**:
- iPhone mockup (375px): Company login screen, product list, order form
- Android mockup (412px): Same flows
- Affiliate dashboard mobile: Stats cards, commission trend, referral code
- All dark mode + light mode variants

**Expected file**: `glamd-mobile-flows-reference.png` (~2–3 MB, multiple frames)

---

## Step 3: Generate Brand Kit (Logo, Palettes, Typography, Applications)

**Command**:
```bash
taste-skill brandkit \
  --brief "Brand identity: GlamD luxury beauty. Antique gold primary (#D4AF37), white/black backgrounds, neutral warm grays. Display: Playfair Display (serif), Body: Inter (sans). Logo: simple wordmark (Playfair gold on white/dark). Applications: business card, website header, social media post, packaging mockup." \
  --palette "antique-gold-white-black" \
  --output /mnt/user-data/outputs/hex-diva-design-system/glamd-brandkit-reference.png \
  --fonts "Playfair Display, Inter" \
  --style luxury
```

**What you get**:
- Logo directions (wordmark, mark-only, horizontal, vertical)
- Color palette visualization (primary gold, neutrals, complementary colors)
- Typography showcase (headlines, body, captions in Playfair/Inter)
- Brand applications (website header, social post, business card, packaging)

**Expected file**: `glamd-brandkit-reference.png` (~2–3 MB, brand board layout)

---

## How to Execute (Step-by-Step)

### For You (Right Now):

1. **Open terminal** in project root (`~/projects/hex-glam-diva` or wherever)

2. **Run Web Comps generation**:
```bash
taste-skill imagegen-frontend-web \
  --brief "Luxury beauty e-commerce (eyelash extensions, premium nails). Egypt/MENA market. Affluent women, 25-45, old-money aesthetic. Sensual, not provocative. Antique gold (#D4AF37) on white/black. Playfair Display serif headers, Inter sans body. Hero: 60/40 split with cinematic video of hands/wrists. Product grid: 3-column, flat-lay photography. Testimonials: star ratings, quotes. Strong typography hierarchy, negative space, ease-out motion. Brand feel: Sephora meets Aesop luxury." \
  --output /mnt/user-data/outputs/hex-diva-design-system/glamd-web-comps-reference.png \
  --style soft-skill \
  --density spacious \
  --motion luxury \
  --variance premium
```

3. **Run Mobile Flows generation**:
```bash
taste-skill imagegen-frontend-mobile \
  --brief "Mobile screens for B2B wholesale portal (company account login, product catalog, bulk order form) and affiliate dashboard (referral code, commission chart, stats cards). Same antique gold + white, Playfair/Inter typography. Responsive, readable on 375px width. Touch-friendly tap targets (44px min). Dark mode toggle shown." \
  --output /mnt/user-data/outputs/hex-diva-design-system/glamd-mobile-flows-reference.png \
  --style soft-skill \
  --format ios-android \
  --variant "B2B portal + affiliate dashboard"
```

4. **Run Brand Kit generation**:
```bash
taste-skill brandkit \
  --brief "Brand identity: GlamD luxury beauty. Antique gold primary (#D4AF37), white/black backgrounds, neutral warm grays. Display: Playfair Display (serif), Body: Inter (sans). Logo: simple wordmark (Playfair gold on white/dark). Applications: business card, website header, social media post, packaging mockup." \
  --palette "antique-gold-white-black" \
  --output /mnt/user-data/outputs/hex-diva-design-system/glamd-brandkit-reference.png \
  --fonts "Playfair Display, Inter" \
  --style luxury
```

5. **Verify output**:
```bash
ls -lh /mnt/user-data/outputs/hex-diva-design-system/glamd-*.png
```

6. **Share with Claude Design** (along with the 5 markdown/JSON files + reference images)

---

## Expected Output

After running all 3 commands, you'll have:

```
/mnt/user-data/outputs/hex-diva-design-system/
├── 01-design-brief.md
├── 02-palette.json
├── 03-typography.json
├── 04-motion-language.md
├── 05-claude-design-system-prompt.md
├── 06-taste-skill-imagegen-brief.md
├── glamd-web-comps-reference.png         ← Generated by Taste-Skill
├── glamd-mobile-flows-reference.png      ← Generated by Taste-Skill
└── glamd-brandkit-reference.png          ← Generated by Taste-Skill
```

**Total**: 5 files (docs) + 3 reference images = **complete attachment package for Claude Design**

---

## What Claude Design Will See

When you attach all 8 files (5 docs + 3 images) to Claude Design, it will:

1. **Read docs** (design-brief, tokens, motion language, prompt)
2. **View reference images** (web comps, mobile flows, brand kit)
3. **Understand**: "Build components + pages that match these references + motion rules"
4. **Output**: Component library + 3 page mockups (landing, B2B, affiliate) that align with Taste-Skill soft-skill + GlamD tokens

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `taste-skill: command not found` | taste-skill installed globally? Try `which taste-skill` or `pnpm taste-skill --version` |
| Generated images too bright/dark | Adjust `--style soft-skill` to `--style soft-skill --brightness -0.1` or `+0.1` |
| Images don't match gold color | Ensure `--palette "antique-gold-white-black"` and `--brief` includes `#D4AF37` |
| Output file not created | Check output path exists: `mkdir -p /mnt/user-data/outputs/hex-diva-design-system/` |

---

## What If You Can't Run Taste-Skill Commands?

**Fallback**: Skip image generation, attach 5 docs only to Claude Design. CD is capable enough to infer the mood from the written brief. Images are **nice-to-have**, not required.

---

**Next**: Once images are generated, proceed to CLAUDE_DESIGN_ATTACHMENT_PACKAGE.md for copy-paste prompt + final handoff.
