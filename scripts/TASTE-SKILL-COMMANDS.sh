#!/bin/bash

# GlamD Taste-Skill Image Generation Script
# Run this in your local terminal (where taste-skill is installed globally)
# Location: ~/.claude/skills/taste-skill/

echo "🎨 Generating GlamD Reference Images with Taste-Skill"
echo "=================================================="
echo ""

# Command 1: Web Comps (Hero + Grid + Testimonials + Footer)
echo "1️⃣ Generating web comps (hero, product grid, testimonials)..."
echo ""
taste-skill imagegen-frontend-web \
  --brief "Luxury beauty e-commerce (eyelash extensions, premium nails). Egypt/MENA market. Affluent women, 25-45, old-money aesthetic. Sensual, not provocative. Antique gold (#D4AF37) on white/black. Playfair Display serif headers, Inter sans body. Hero: 60/40 split with cinematic video of hands/wrists. Product grid: 3-column, flat-lay photography. Testimonials: star ratings, quotes. Strong typography hierarchy, negative space, ease-out motion. Brand feel: Sephora meets Aesop luxury." \
  --output ./glamd-web-comps-reference.png \
  --style soft-skill \
  --density spacious \
  --motion luxury \
  --variance premium

echo ""
echo "2️⃣ Generating mobile flows (B2B portal + affiliate dashboard)..."
echo ""

# Command 2: Mobile Flows (iOS/Android, B2B + Affiliate)
taste-skill imagegen-frontend-mobile \
  --brief "Mobile screens for B2B wholesale portal (company account login, product catalog, bulk order form) and affiliate dashboard (referral code, commission chart, stats cards). Same antique gold + white, Playfair/Inter typography. Responsive, readable on 375px width. Touch-friendly tap targets (44px min). Dark mode toggle shown." \
  --output ./glamd-mobile-flows-reference.png \
  --style soft-skill \
  --format ios-android \
  --variant "B2B portal + affiliate dashboard"

echo ""
echo "3️⃣ Generating brand kit (logo, colors, typography)..."
echo ""

# Command 3: Brand Kit (Logo, Palettes, Typography Applications)
taste-skill brandkit \
  --brief "Brand identity: GlamD luxury beauty. Antique gold primary (#D4AF37), white/black backgrounds, neutral warm grays. Display: Playfair Display (serif), Body: Inter (sans). Logo: simple wordmark (Playfair gold on white/dark). Applications: business card, website header, social media post, packaging mockup." \
  --palette "antique-gold-white-black" \
  --output ./glamd-brandkit-reference.png \
  --fonts "Playfair Display, Inter" \
  --style luxury

echo ""
echo "✅ Image generation complete!"
echo ""
echo "Generated files:"
ls -lh glamd-*.png 2>/dev/null || echo "(No files generated - check taste-skill installation)"
echo ""
echo "Next: Attach these 3 images + 5 docs to Claude Design"
