# Hex-Diva Platform Workflows

Complete end-to-end operational workflows with clear separation of concerns, proper abstraction levels, and DDD principles.

---

## 1. ORDER FULFILLMENT WORKFLOW (B2C Standard Delivery)

### Actors
- **Customer**: Initiates order via web/mobile
- **Shopify**: System of record (order creation, inventory sync)
- **Payment Processor** (Paymob): Validates & collects COD/card payments
- **3PL Vendor** (Bosta/Mylerz): Picks, packs, ships
- **Warehouse**: Holds inventory until pickup

### Flow

```
1. CUSTOMER INITIATES ORDER
   ├─ Cart review & checkout
   ├─ Delivery address validation
   ├─ Payment method selection (COD / Card / Wallet)
   └─ Order submission

2. SHOPIFY VALIDATES & CREATES ORDER
   ├─ Inventory reservation (stock check)
   ├─ Order ID generation
   ├─ Address validation
   └─ Sends webhook to backend

3. BACKEND PAYMENT PROCESSING
   ├─ COD: Create Paymob COD mandate
   ├─ CARD: Pre-charge card via Paymob
   ├─ WALLET: Deduct wallet balance
   ├─ Reconcile customer tier (B2B/B2C segment)
   └─ Apply discount if applicable

4. 3PL INTEGRATION (Via Shopify webhook + custom sync)
   ├─ Trigger 3PL pickup request
   ├─ Generate Air Way Bill (AWB)
   ├─ Assign delivery window (1-2 days standard)
   └─ Queue for warehouse picker

5. WAREHOUSE OPERATIONS
   ├─ Pick items from bin locations
   ├─ QC check (product quality, packaging)
   ├─ Pack into branded box
   ├─ Apply label & AWB
   └─ Hand to courier

6. 3PL DELIVERY
   ├─ Courier pickup from warehouse
   ├─ Transit to hub
   ├─ Local last-mile assignment
   ├─ Delivery attempt (COD collection if applicable)
   └─ Proof of delivery (POD)

7. POST-DELIVERY RECONCILIATION
   ├─ 3PL settlement (cash collected from COD)
   ├─ Paymob settlement (daily/weekly batch)
   ├─ Order marked as "Delivered"
   ├─ Customer can now return (14-day window per B2C segment)
   └─ Review/rating request (email)
```

### Timeline
- T+0: Order created
- T+0: Payment validated
- T+0-2 hours: Warehouse picks & ships
- T+1-2 days: 3PL delivers
- T+1 day: COD cash settled (Bosta: next-day, Paymob: weekly)

### Data Flow
```
Shopify Order
    ↓
Backend Order Service (validation, discounting)
    ↓
Paymob Payment Handler (payment validation)
    ↓
3PL API (fulfillment trigger)
    ↓
Warehouse Management System (picking queue)
    ↓
Tracking Update Webhook (customer notification)
```

### Error Scenarios
| Error | Owner | Resolution |
|-------|-------|-----------|
| Inventory out of stock | Shopify | Cancel order, refund customer |
| Payment declined | Paymob | Retry or flag for manual review |
| 3PL unavailable | 3PL | Route to fallback vendor (Mylerz/Aramex) |
| Customer refuses COD | 3PL | Reverse pickup, full refund |
| Damaged in transit | 3PL | Create return, full refund |

---

## 2. PREMIUM SUB-4-HOUR DELIVERY WORKFLOW (Flavor 2 - Dark Store)

### Use Case
- High-value, same-day delivery in Cairo/major cities
- **Pricing**: Premium delivery fee (50-150 EGP) vs. standard (10-30 EGP)
- **Inventory Model**: On-premise stock in Flextock/ShipBlu dark store

### Actors
- **Customer**: High-value order (1,500+ EGP)
- **Shopify**: Order creation
- **Dark Store** (Flextock/ShipBlu): Pick & pack at hub
- **Last-Mile Courier**: 30-min to 4-hour delivery

### Flow

```
1. CUSTOMER ORDERS (Cairo + 3km radius)
   ├─ Select "Premium <4hr Delivery" (+100 EGP fee)
   ├─ Accept pickup time window (14:00-18:00 example)
   └─ Confirm address

2. SHOPIFY VALIDATES
   ├─ Check address is within dark store service zone
   ├─ Validate inventory at Flextock (real-time sync)
   ├─ Create order with "PRIORITY" tag
   └─ Webhook to Flextock API

3. DARK STORE OPERATIONS
   ├─ Auto-receive order in Flextock
   ├─ Assign to fastest picker
   ├─ Pick from bin location
   ├─ QC & pack (5-15 min SLA)
   ├─ SMS to customer: "Order ready for pickup"
   └─ Queue for last-mile

4. LAST-MILE DELIVERY
   ├─ Courier assigned from pool
   ├─ Departure from hub
   ├─ Real-time GPS tracking (WhatsApp + Web)
   ├─ Delivery window: 1-4 hours from order
   ├─ Proof of delivery + customer signature
   └─ Return to hub

5. SETTLEMENT
   ├─ Flextock: 1-2 day batch settlement
   ├─ Last-mile: Bundled with 3PL settlement
   ├─ Order marked complete
   └─ Return window: 7 days (shorter for premium)
```

### Timeline
- T+0-30 min: Order created, dark store receives
- T+30-45 min: Pick & pack complete
- T+1-4 hours: Last-mile delivery
- T+1 day: Settlement from Flextock

### Requirements for Go-Live
- [ ] Flextock vetting call: SLA guarantee, API stability
- [ ] ShipBlu vetting call: Automation capability, review volume analysis
- [ ] Bosta Fulfillment research: integration complexity vs. benefit
- [ ] Dynamic pricing logic: order value → premium surcharge
- [ ] Service zone definition: Cairo micro-regions, expansion roadmap

---

## 3. PAYMENT SETTLEMENT WORKFLOW (Cash Flow)

### Revenue Streams
1. **COD Collection** (65-85% of orders): 3PL collects cash at door
2. **Card Payments** (10-20%): Pre-charged via Paymob
3. **Wallet/Installments** (5-15%): Pre-deducted or post-charged

### Settlement Path (Paymob Primary)

```
ORDERS PLACED (T+0)
    ├─ COD Orders → 3PL collects cash from customer
    ├─ Card Orders → Paymob pre-authorizes, captures on fulfillment
    └─ Wallet Orders → Deduct balance at checkout

T+1 (Next Day)
    ├─ 3PL reports settlement (cash collected count)
    ├─ Paymob aggregates COD + card transactions
    └─ Backend reconciliation: orders vs. payment transactions

T+2-7 (Settlement Cycle)
    ├─ Paymob batches transactions (e.g., T+2 for weekly)
    ├─ Money transferred to primary bank account
    ├─ Platform marks settlement complete in database
    └─ Reports generated (daily dashboard)

POST-SETTLEMENT
    ├─ Accounting reconciliation
    ├─ Reserve calculation (returns, chargebacks)
    ├─ Affiliate commissions calculated (weekly)
    └─ 3PL vendor paid for logistics
```

### Fallback: Fawry (if Paymob fails)

```
ORDERS PLACED (T+0)
    ├─ Fawry cash agent network collects at door
    └─ Card orders via Fawry gateway

T+2 (2 Days)
    ├─ Fawry aggregates settlement
    ├─ Money transferred to bank
    └─ Reconciliation file provided
```

### Affiliate Payout Workflow (Manual Weekly Batch via InstaPay)

```
ORDERS PLACED (Week 1-7)
    ├─ UpPromote tracks affiliate referrals
    ├─ Commission accrues daily
    └─ Status: "Pending Approval"

FRIDAY 10:00 (Weekly Payout Day)
    ├─ Export UpPromote affiliate earnings report (CSV)
    ├─ Filter affiliates with balance >= 50 EGP
    ├─ Verify bank details (IBAN validation)
    ├─ Create InstaPay batch file (format TBD - vet with bank)
    └─ Upload to bank portal

T+0 to T+2 (Settlement via InstaPay)
    ├─ InstaPay processes batch (real-time if <09:00 UTC)
    ├─ Money reaches affiliate bank accounts
    ├─ Platform marks payouts as "Paid" in app
    └─ SMS confirmation to affiliates

FALLBACK (If InstaPay rejects or unavailable)
    ├─ Switch to manual bank transfer (higher fees, slower)
    └─ Still mark as "Paid" for transparency
```

### Data Flow
```
Order
  ├─ Payment validation (Paymob)
  ├─ 3PL cash collection report
  ├─ Platform settlement batch (T+1-7)
  └─ Bank transfer
      ├─ Primary account (general operations)
      └─ Segregated affiliate account (InstaPay payout rail)
```

### Error Scenarios
| Error | Owner | Resolution |
|-------|-------|-----------|
| Payment declined | Paymob | Retry, escalate to support |
| 3PL reports lower amount | 3PL | Investigate loss, claim or write off |
| Affiliate bank details invalid | Admin | Manual verification, update IBAN |
| InstaPay batch rejects | Bank | Fall back to transfer, manual processing |

---

## 4. RETURNS & REFUNDS WORKFLOW

### Initiators
1. **Customer Initiated**: Quality issue, changed mind (14-day window)
2. **Merchant Initiated**: Order error, overstocking
3. **Forced**: COD refusal, damaged in transit

### Return Flow (B2C Standard - 14-day window)

```
1. CUSTOMER INITIATES RETURN
   ├─ Logs into app
   ├─ Selects order & reason (quality, wrong item, changed mind)
   ├─ Receives return authorization (RA number)
   └─ Prints prepaid return label OR schedules reverse pickup

2. MERCHANT REVIEW (SLA: 24-48 hours)
   ├─ Inspect return request for validity
   ├─ Check if within returns window
   ├─ Verify condition (non-resellable → write-off)
   └─ Approve or reject with reason

3. CUSTOMER SHIPS BACK
   ├─ Pack item in original/similar box
   ├─ Affix return label
   ├─ Hand to 3PL or schedule reverse pickup
   └─ Get tracking number

4. REVERSE LOGISTICS (3PL Responsibility)
   ├─ Courier picks up from customer address (SLA: next day)
   ├─ Transit to warehouse
   ├─ Delivery to Hex-Diva warehouse (SLA: 3-5 days total)
   ├─ Generate return inbound receipt
   └─ Notify platform

5. WAREHOUSE QC & RESTOCK
   ├─ Inspect returned item (cosmetics: resellable?)
   ├─ Log condition (new, sealed, used, damaged)
   ├─ If resellable: Return to bin
   ├─ If non-resellable: Write-off (expense)
   └─ Update Shopify inventory

6. REFUND PROCESSING
   ├─ Refund amount = Sale price - (Restocking fee if applicable)
   ├─ Deduct return shipping cost if customer initiated non-quality return
   ├─ COD: Credit customer account (or manual transfer if high value)
   ├─ CARD: Refund to original card (Paymob handles)
   └─ Wallet: Add balance back

7. CLOSING
   ├─ Send refund confirmation email
   ├─ Update order status to "Refunded"
   ├─ Track return rate metrics
   └─ Customer receives refund (2-5 business days for card)
```

### Timeline
- T+0: Customer initiates return
- T+1-2 days: Merchant approves
- T+1-3 days: Customer ships back
- T+3-8 days: Warehouse receives & QCs
- T+8-10 days: Refund processed
- T+10-15 days: Customer receives refund (card refunds longest)

### Returns Logistics Scoring (Vetting Criteria)
Per settings.ts, evaluate 3PL vendors on:

| Criteria | Impact | Measurement |
|----------|--------|-------------|
| **Reverse-Pickup SLA** | Customer experience, cost | "X days from customer request to warehouse" |
| **Restock/QC Turnaround** | Inventory velocity, markdown risk | "X days from arrival to sellable again" |
| **COD Refusal Attribution** | Financial impact | "Who pays if customer refuses?" |
| **Return Rate Integration** | Analytics & root cause | "Can we track return reasons per SKU, supplier?" |

### Error Scenarios
| Error | Owner | Resolution |
|-------|-------|-----------|
| Customer returns after 14-day window | Merchant | Reject, explain policy |
| Item arrives damaged (shipper liability) | 3PL | 3PL reimburse, or negotiate |
| Refund lost in payment processing | Paymob/Bank | Investigate & re-issue |
| Item non-resellable (cosmetics opened) | Merchant | Write-off, no refund (per policy) |

---

## 5. B2B ORDER & CREDIT WORKFLOW (Wholesale)

### Actors
- **Buyer**: B2B account holder (Tier 1: Retail, Tier 2: Sub-Distributor, Tier 3: VIP)
- **Shopify B2B Portal**: Company account, order placement
- **Account Manager**: Manual approval for high-value/tier changes
- **Fulfillment**: Pallet-based, not individual shipment

### Flow

```
1. ACCOUNT SETUP (Tier 1: Wholesale 20% discount)
   ├─ Buyer registers as business
   ├─ Verify business details (name, tax ID if available)
   ├─ Assign to Shopify B2B catalog (20% discount tier)
   ├─ Payment terms: Prepay (no credit extension)
   └─ Minimum order: 5 units

2. ORDERING
   ├─ Buyer logs into Shopify B2B portal
   ├─ Add items to cart (prices auto-discount 20%)
   ├─ Set delivery address (bulk orders → single address)
   ├─ Review total
   └─ Submit for approval (if > 10K EGP threshold)

3. MERCHANT APPROVAL (if needed)
   ├─ Check credit profile (manual check or automated)
   ├─ Verify payment method (prepay only)
   ├─ Account manager reviews for Tier 2/3 candidates
   └─ Approve or request payment upfront

4. FULFILLMENT (Pallet-based)
   ├─ Order routed to warehouse
   ├─ Assign to bulk picker (multiple SKUs)
   ├─ Pack onto pallet (not individual boxes)
   ├─ Print pallet label with customer PO
   ├─ Assign to 3PL for bulk delivery (Bosta pallet service)
   └─ Provide tracking to buyer

5. DELIVERY & SETTLEMENT
   ├─ 3PL handles pallet logistics (1-2 day delivery)
   ├─ Delivery confirmation
   ├─ Invoice generated (B2B-specific: PO#, company details)
   ├─ Payment settled (prepay: already received)
   └─ Order closed

6. TIER UPGRADE (Tier 1 → Tier 2 or Tier 3)
   ├─ Trigger on volume: If buyer cumulative spend > threshold
   ├─ Account manager initiates upgrade review
   ├─ Verify expansion readiness (credit, payment history)
   ├─ Move to Tier 2/3 catalog (30-custom % discount)
   └─ Notify buyer of new pricing
```

### B2B Tier-to-Shopify Mapping
```
Hex-Diva B2B Tier 1 (Wholesale 20%)
  ├─ Shopify B2B Catalog 1
  ├─ MOQ: 5 units
  └─ Target: Medium retailers

Hex-Diva B2B Tier 2 (Sub-Distributor 30%)
  ├─ Shopify B2B Catalog 2
  ├─ MOQ: 20 units
  └─ Target: Regional distributors

Hex-Diva B2B Tier 3 (VIP Custom)
  ├─ Shopify B2B Catalog 3 (or negotiated outside catalog)
  ├─ MOQ: 50 units
  └─ Target: Strategic partners
```

### Error Scenarios
| Error | Owner | Resolution |
|-------|-------|-----------|
| Buyer requests net-30 terms | Merchant | Decline at Tier 1, negotiate for Tier 2 |
| Insufficient inventory for bulk order | Warehouse | Backorder, partial shipment, or cancel |
| B2B catalog limits (3 on standard plan) | Ops | Upgrade to Shopify Plus (unlimited catalogs) |

---

## 6. AFFILIATE COMMISSION & RECRUITMENT WORKFLOW

### Actors
- **Influencer**: Refers customers via unique code
- **UpPromote**: Affiliate platform (tracking, commission calculation)
- **Platform**: Commission approval, payout coordination
- **Bank**: InstaPay or direct transfer

### Flow

```
1. AFFILIATE RECRUITMENT & ONBOARDING
   ├─ Discover via UpPromote marketplace OR manual invite
   ├─ Influencer signs up on UpPromote
   ├─ Provide unique referral code (e.g., INFLUENCER_123)
   ├─ Start tier: "Starter" (7% commission)
   └─ Payment method verified (bank account/IBAN)

2. INFLUENCER PROMOTION
   ├─ Share unique code on TikTok/Instagram/WhatsApp
   ├─ Create content (unboxing, reviews)
   ├─ Drive clicks to Hex-Diva shop with code
   └─ Customers use code at checkout

3. CUSTOMER PURCHASE
   ├─ Click referral link or enter code
   ├─ Checkout completes (order value: 500 EGP example)
   ├─ UpPromote logs order as affiliate-sourced
   ├─ Commission = 500 * 7% = 35 EGP (Starter tier)
   └─ Status: "Pending Approval"

4. COMMISSION APPROVAL (Manual or Automated)
   ├─ Platform reviews for fraud (fake orders, bot clicks)
   ├─ Approve if valid
   ├─ Mark commission as "Approved"
   └─ Status updates in UpPromote dashboard

5. AFFILIATE TIER AUTO-UPGRADE
   ├─ Monitor monthly revenue generated
   ├─ If 5K+ EGP → Tier: "Growth" (10%, weekly payout)
   ├─ If 20K+ EGP → Tier: "Elite" (12%, weekly payout)
   ├─ If 50K+ EGP → Tier: "VIP" (custom, negotiate)
   └─ Automatic tier update in UpPromote

6. SPECIAL COMMISSION RULES (Per-Influencer)
   ├─ VIP influencer: 15% flat (instead of tier-based)
   ├─ Launch partner: 10% + 500 EGP monthly stipend
   ├─ Tiered bonus: 10% base + 3% if > 10K monthly
   └─ Fallback to standard tier if custom expires

7. WEEKLY PAYOUT BATCH (Friday 10:00 UTC)
   ├─ Export UpPromote affiliate earnings report (CSV)
   ├─ Filter: balance >= 50 EGP minimum
   ├─ Validate bank details (IBAN format)
   ├─ Create batch file for InstaPay
   ├─ Submit to bank portal
   └─ Affiliates receive payout by Monday

8. PAYOUT RECONCILIATION
   ├─ Mark batch as "Submitted" in platform
   ├─ Await bank confirmation
   ├─ Verify settlement (check balances)
   ├─ Mark affiliates as "Paid" in UpPromote
   └─ Send payout confirmation SMS/email

9. REPORTING & TRANSPARENCY
   ├─ Affiliate dashboard: Clicks, conversions, earnings
   ├─ Weekly email: Payout status, tier progression
   ├─ Leaderboard: Top affiliates (optional gamification)
   └─ Payment history: Link to all payouts
```

### Commission Tier Structure
```
Starter:  0 - 5K EGP monthly revenue → 7% commission
Growth:   5K - 20K EGP monthly revenue → 10% commission
Elite:    20K - 50K EGP monthly revenue → 12% commission
VIP:      50K+ EGP monthly revenue → Custom negotiated
```

### Payment Rail (Manual Weekly Batch)
```
Friday 10:00 UTC
  ├─ Export UpPromote CSV (Influencer, Earnings, IBAN)
  ├─ Create InstaPay batch file format
  ├─ Login to bank portal
  ├─ Upload batch
  ├─ Bank processes (real-time if <09:00, or T+1)
  └─ Affiliates see deposit in account

Fallback (if InstaPay unavailable)
  ├─ Manual bank transfer (slower, higher fees)
  └─ Still mark as "Paid" for transparency
```

### Error Scenarios
| Error | Owner | Resolution |
|-------|-------|-----------|
| Fraudulent orders (multiple orders, low value) | UpPromote/Admin | Flag commission, reject approval, ban if repeat |
| Influencer IBAN invalid | Admin | Request correction, hold payout until verified |
| InstaPay batch fails | Bank | Fallback to manual transfer, retry next week |
| Influencer disputes commission amount | UpPromote | Check UpPromote logs, educate on tier/rules |

---

## 7. INVENTORY SYNC WORKFLOW (Multi-Marketplace)

### Phase 1 (Aug-Sep 2026)
- **Own Shop** (Shopify): Source of truth
- **Amazon.eg**: Sell same 100 SKUs

### Phase 2 (Q4 2026)
- **Noon.com**: Expand regional reach
- **Jumia.com.eg**: High marketplace volume

### Flow

```
INVENTORY MANAGEMENT
  ├─ Warehouse: Physical stock count
  ├─ Shopify: Master inventory level
  └─ Syncs automatically (via inventory API)

CENTRAL SYNC ENGINE (Hourly)
  ├─ Read Shopify inventory levels (API)
  ├─ Compare with marketplace current levels
  ├─ Calculate delta (sold on marketplace, not yet synced)
  ├─ Push updated quantities to Amazon/Noon/Jumia
  └─ Log sync events (for audit trail)

RESTOCK LOGIC
  ├─ When Shopify inventory < reorder point (e.g., 10 units)
  ├─ Trigger purchase order to supplier (via backend queue)
  ├─ Mark as "On Order" in Shopify
  ├─ Update status on all marketplaces
  └─ Once received: Update Shopify, auto-sync to marketplaces

OUT-OF-STOCK HANDLING
  ├─ Shopify: Mark as out of stock, hide from storefront
  ├─ Amazon: Pause listing (or set to 0 inventory)
  ├─ Noon/Jumia: Pull listing or set to 0
  ├─ Monitor: Set alert if SKU out-of-stock > 3 days
  └─ Action: Reorder or discontinue
```

### Data Flow
```
Warehouse Management System
  ├─ Physical inventory update
  └─ → Shopify Inventory API
        ├─ → Amazon.eg API (hourly sync)
        ├─ → Noon.com API (hourly sync)
        └─ → Jumia.com.eg API (hourly sync)

Sales Event (Customer buys on any platform)
  ├─ Shopify: Tracks order, decremets inventory
  ├─ Amazon/Noon/Jumia: Reports sale via webhook
  ├─ Platform reconciles (central ledger)
  └─ If total allocated > available: Backorder flag
```

### Error Scenarios
| Error | Owner | Resolution |
|-------|-------|-----------|
| Sync fails (API down) | Platform/Marketplace | Retry hourly, escalate if >3 retries |
| Inventory mismatch (2 units showing, 0 actual) | Warehouse/Platform | Manual audit, correct Shopify, re-sync |
| Oversold (100 units across platforms, 80 actual) | Fulfillment | Backorder, split shipment, or cancel low-priority |
| Marketplace lists old price | Marketplace | Manual refresh, audit sync logic |

---

## 8. FEATURE FLAG & CONFIGURATION UPDATE WORKFLOW

### Actors
- **Operations Team**: Non-technical staff
- **Admin Panel**: Configuration UI (future)
- **Platform**: Applies settings changes in real-time

### Flow (Manual, Pre-Admin-UI)

```
1. REQUEST CHANGE
   ├─ Ops team identifies need (e.g., "Lower first-time discount from 10% to 8%")
   └─ Submit change request (Slack/email/form)

2. DEVELOPMENT (Code-based, until admin UI ready)
   ├─ Engineer updates src/config/settings.ts
   ├─ Change: B2C_SEGMENTS.firstTimeBuyer.discountValue = 8
   ├─ Commit with clear message
   ├─ Push to staging branch
   └─ Deploy to staging for testing

3. TESTING
   ├─ QA verifies discount applied to test orders
   ├─ Ops confirms business logic
   └─ Approve for production

4. PRODUCTION DEPLOYMENT
   ├─ Merge to main branch
   ├─ Vercel auto-deploys
   ├─ Monitor: Check that new discount is active within 2 hours
   └─ Notify stakeholders

5. RUNTIME OVERRIDE (Admin Panel - Future)
   ├─ Ops logs into admin panel
   ├─ Navigate to "Discount Settings"
   ├─ Update "First-Time Buyer Discount" from 10% → 8%
   ├─ Click "Apply"
   ├─ Change takes effect immediately (no code deploy needed)
   └─ Audit log records change (user, timestamp, old value, new value)
```

### Feature Flags (Marketplace Integration)

```
PHASE 1 LAUNCH
  ├─ amazoneIntegration: false → true (on go-live)
  └─ b2cEnabled: true (always on)

PHASE 2 LAUNCH (Q4 2026)
  ├─ noonIntegration: false → true
  └─ jumiaIntegration: false → true
```

### Configuration Validation
```
On app startup:
  ├─ Load settings.ts
  ├─ Run validateAllConfigs()
  ├─ If errors: Log warnings, fallback to safe defaults
  └─ Emit health check: ✅ All configs valid OR ⚠️ Warnings present

API endpoint: /api/health/config
  ├─ Returns: { valid: boolean, errors?: Record<string, string[]> }
  └─ Used by monitoring/alerting system
```

---

## SUMMARY TABLE: Workflows at a Glance

| Workflow | Owner | Frequency | SLA | Key Decisions |
|----------|-------|-----------|-----|---------------|
| Order Fulfillment | 3PL + Warehouse | Per order | 2 days delivery | Which 3PL vendor? |
| Premium Delivery | Dark store + Last-mile | Opt-in | <4 hours | Enable? Service zones? |
| Payment Settlement | Paymob (primary) | Daily/Weekly | T+1-7 days | Reconciliation frequency? |
| Affiliate Payout | Bank + InstaPay | Weekly | T+0-2 days | Manual or automated? |
| Returns Processing | Warehouse + 3PL | Per return | 14 days window | Resale logic? Write-off criteria? |
| B2B Ordering | Shopify B2B Portal | Per order | Prepay required | Tier upgrade triggers? |
| Inventory Sync | Central engine | Hourly | Near real-time | Which marketplaces? |
| Config Updates | Ops (future: Admin UI) | As-needed | Immediate | How often to tune? |

---

## NEXT STEPS

1. **Implement Configuration Admin Panel** (src/app/(admin)/settings)
   - Allow non-technical Ops to update discount tiers, commission rates, 3PL selection
   - Add audit log for compliance

2. **Vetting Calls** (3PL, Payment Processors, Affiliate Platform)
   - Validate assumptions in workflows
   - Confirm SLAs, integration capabilities, settlement cycles

3. **Marketplace Integration** (Phase 1)
   - Amazon.eg vendor setup
   - Inventory sync automation

4. **Affiliate Platform Onboarding** (UpPromote Free Tier)
   - Create affiliate dashboard
   - Set up referral code structure
   - Test payout workflow (manual batch first)

5. **Returns Logistics** (Post-Launch)
   - Negotiate reverse-pickup SLAs with 3PL vendors
   - Define resale criteria for cosmetics (opened = write-off)
   - Monitor return rates by SKU/supplier
