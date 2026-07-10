# Hex-Diva Workflow Inventory (MVP)

**Purpose**: Ensure all critical user flows are designed end-to-end before track execution begins.

**Status**: 🟢 DESIGNED (not yet implemented)

---

## Core User Workflows

### 1. **Product Browsing & Search** (CRITICAL PATH)
**User journey**: Land → Browse products → Filter by category/price/rating → View product detail → Add to cart

**Paths**:
- Full catalog browse (product grid, 3-4 columns responsive)
- Filter by collection (Sculpted Lashes, Artisan Nails, etc.)
- Search by keyword (full-text on name, brand, category)
- Sort (relevance, newest, price low-to-high, best-sellers, top-rated)
- Product detail (images, variants, reviews, price, add-to-cart)

**Data consistency**:
- Inventory synced from Shopify (Redis cache, 5-min TTL)
- Images hosted on Shopify CDN
- Pricing current (no stale prices in cache)

**Edge cases**:
- Out-of-stock product (show status badge)
- Variant selection required (size/color/etc.)
- Product removed from Shopify (404 graceful)
- Very large catalog (1000+ SKUs) → pagination

---

### 2. **Shopping Cart & Checkout** (CRITICAL PATH)
**User journey**: Add items → View cart → Proceed to checkout → Shipping info → Payment → Order confirmation

**Paths**:
- Guest checkout (no account required)
- Returning user (pre-fill address, saved cards)
- Quantity updates
- Remove items
- Promo code application
- Shipping method selection
- Payment processing (Stripe)
- Order confirmation email

**Data consistency**:
- Cart subtotal accurate
- Tax calculated correctly
- Shipping cost updated based on method
- Order created in Shopify + order_metadata in Supabase

**Edge cases**:
- Item out of stock at checkout (block or auto-remove)
- Promo code invalid/expired (show error)
- Payment decline (show retry UI)
- Order webhook timeout (reaper retries)

---

### 3. **User Authentication** (CRITICAL PATH)
**User journey**: Sign in → Email/password OR OAuth → Dashboard

**Paths**:
- Email + password signup
- Email + password login
- Google OAuth
- Password reset
- Session persistence (JWT + refresh token)
- Sign out

**Security**:
- Passwords hashed (Supabase Auth)
- Email verification (optional for MVP)
- CSRF tokens on forms
- No session leakage (only auth cookie)

**Edge cases**:
- OAuth provider down (fallback to email)
- Session expiry mid-checkout (save cart, redirect to login)
- User deleted account (active session invalidated)

---

### 4. **Referral Code & Tracking** (MVP FEATURE)
**User journey**: User gets unique referral code → Shares link → Friend signs up via referral → Commission earned

**Paths**:
- Referral code generation (unique per user)
- Display in dashboard with share buttons
- Copy to clipboard / QR code
- Referral URL tracking (`?ref=HEX_ALICE123`)
- Commission calculation on referred user's purchase
- Commission ledger display

**Data consistency**:
- Referral code unique (no duplicates)
- Referral tracking atomic (one record per user referred)
- Commission calculated correctly (5% base, tier-aware)
- Commission ledger immutable (audit trail)

**Edge cases**:
- User generates new code (old code still works)
- Duplicate referral attempt (ignore, count once)
- Tier upgrade mid-month (commission rate applies to new orders)
- Referral user upgrades to B2B (bonus calculation changes)

---

### 5. **Commission Ledger & Payouts** (B2B FEATURE)
**User journey**: B2B user → View commissions → Earned $X → Request payout → Manual admin processing

**Paths**:
- Commission ledger (date, order, amount, status: pending/paid)
- Filter by date range
- Export to CSV
- Payout request (email notification to admin)
- Manual payout via bank transfer

**Data consistency**:
- Commission amount immutable (no retroactive changes)
- Status transitions correct (pending → paid)
- No double-payment (each order pays once)
- Audit trail preserved (all rows created_at timestamped)

**Edge cases**:
- Commission pending (not yet paid) → show "pending" status
- Payout request without sufficient commission (show minimum)
- Admin processes payout → mark all pending as paid
- User requests payout twice (deduplicate)

---

### 6. **B2B Tier Management** (FUTURE, NOT MVP)
**User journey**: B2C user → Upgrade to B2B → Manual admin approval → Tier assigned → Pricing changes

**Paths**:
- B2B signup form (business name, tax ID, etc.)
- Admin review dashboard
- Tier assignment (Bronze/Silver/Gold/Custom)
- Pricing multiplier applied to future orders
- Bulk order minimum (if applicable)

**Data consistency**:
- Tier stored in b2b_profiles
- Pricing multiplier applied client-side OR via discount code
- Minimum order value enforced at checkout
- Tier downgrade (if payment fails) handled

**Edge cases**:
- Custom tier negotiated (not in standard list)
- Tier upgrade after large order (commission rate changes for next order)
- Business verification required (manual admin step)

---

### 7. **Admin Dashboard** (MVP BASIC VERSION)
**User journey**: Admin → Access `/admin` → View stats → Manage products → Manage orders

**Paths**:
- Product management (CRUD)
- Shopify sync control (manual "Sync Now" button)
- Order management (mark as shipped, add tracking)
- Order status updates (notify customer via email)
- User tier assignment
- Basic analytics (orders today, revenue this month)

**Security**:
- Admin-only route (Supabase role check)
- Email whitelist or OAuth (google.workspace)
- Session 1-hour timeout

**Edge cases**:
- Shopify sync fails (retry button, error message)
- Order already shipped (can't change status)
- User manual tier change (audit log entry)

---

### 8. **Hero Landing Page** (CRITICAL PATH)
**User journey**: Land → See hero video → Featured collections → Brand story → CTA ("Shop Now")

**Paths**:
- Hero section (video autoplay, muted)
- Featured collections grid (4 collections, 3-4 columns)
- Brand story section (50/50 text + image)
- CTA banner ("Shop Now" primary, "Join Reseller" secondary)
- Responsive mobile (1 column, stacked layout)

**Data consistency**:
- Hero video loads from CDN (no local file)
- Collections fetched from Shopify
- Links to correct product pages

**Edge cases**:
- Hero video load fails (fallback image)
- Collections empty (show placeholder)
- Mobile: video pauses on scroll (battery optimization)

---

### 9. **B2B Portal Dashboard** (MVP VERSION)
**User journey**: B2B user → Dashboard → View referral code → See commission ledger → Request payout

**Paths**:
- Referral code display + share buttons
- QR code generation (optional)
- Commission ledger table (sortable, filterable)
- Pending vs paid commissions
- Payout request button
- Basic analytics (total lifetime commission, this month)

**Data consistency**:
- Ledger always accurate (source of truth)
- Commission amounts immutable
- Status transitions logged

**Edge cases**:
- First-time B2B user (empty ledger)
- Large history (pagination)
- Payout request without enough commission (validation)

---

### 10. **Email Notifications** (MVP VERSIONS)
**User journey**: Order placed → Confirmation email → Shipped → Tracking email → Referral earnings → Payout processed

**Paths**:
- Order confirmation (SendGrid transactional)
- Order shipped notification (Shopify + custom template)
- Referral earnings alert (email or in-app badge)
- Payout processed (admin manual → email)

**Data consistency**:
- Email sent once per event
- Links point to correct order/referral

**Edge cases**:
- Email bounces (retry logic)
- User unsubscribed (respect preference)
- Locale (Egypt/Arabic considerations)

---

### 11. **Product Import & Sync** (TRACK D DELIVERABLE)
**Workflow**: Track A CSV → Transform to Shopify JSON → Download images → Bulk import → Verify

**Paths**:
- CSV with 100 SKUs (variants, pricing, images)
- Transform to Shopify Admin API JSON format
- Download product images to Shopify CDN
- Bulk import (Shopify GraphQL mutation)
- Validate (count SKUs, check inventory)

**Edge cases**:
- Image URL broken (skip or use placeholder)
- SKU duplicate (merge variants)
- CSV format invalid (detailed error message)
- Shopify bulk import timeout (retry)

---

### 12. **Responsive Design** (ALL WORKFLOWS)
**Breakpoints**:
- Mobile: 320px-640px (1 column, drawer nav)
- Tablet: 641px-1024px (2 columns, slide-out nav)
- Desktop: 1025px+ (3-4 columns, fixed sidebar)

**Touch-Friendly**:
- Buttons 44px minimum touch target
- Spacing 12px+ between interactive elements
- Font size 16px+ (prevents iOS auto-zoom)

**Performance**:
- Lighthouse 90+ (all metrics)
- Page load < 2 seconds
- Image optimization (Next.js Image, Cloudflare CDN)

---

### 13. **Accessibility (WCAG AA)** (ALL WORKFLOWS)
**Requirements**:
- Color contrast 4.5:1 (normal text), 3:1 (large text)
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators (2px solid rose-gold)
- Alt text on all images
- Semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`)
- ARIA labels on icon-only buttons
- Screen reader testing (NVDA, VoiceOver)

**Respect**:
- `prefers-reduced-motion` (disable animations if user prefers)
- Dark mode (if user prefers)
- Text resize (support up to 200% zoom)

---

## Verification Checklist Template

For each workflow:
- [ ] Happy path (everything works)
- [ ] Happy path on mobile (responsive)
- [ ] Edge case 1 (list specific)
- [ ] Edge case 2
- [ ] Edge case 3
- [ ] Data consistency (no orphaned rows)
- [ ] Security (ownership checks, auth gates)
- [ ] Error messages (user informed)
- [ ] Performance baseline (measured)

---

**Status**: 🟢 READY FOR TRACK A-F EXECUTION
