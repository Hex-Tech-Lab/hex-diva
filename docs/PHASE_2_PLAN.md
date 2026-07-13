# Phase 2 Implementation Plan — Hex-Diva

**Completed**: Phase 1 (UpPromote + Admin Config Panel) merged to main on 2026-07-11  
**Phase 2 Start**: 2026-07-11 (Pending: Wave 2 sprint planning)

---

## Overview

Phase 2 consolidates technical debt from Phase 1, adds critical safety features for production, and implements admin persistence + provider integrations.

### Key Goals
1. **Type Safety**: Eliminate Supabase type mismatches (50+ `as any` casts → proper type sync)
2. **Persistence**: Admin settings → git commit + Vercel deploy (currently draft-only in-memory)
3. **Security**: Webhook idempotency, signature verification, fraud prevention
4. **Provider Integration**: 3PL partner vetting calls, payment processor onboarding
5. **Testing**: Commission workflows, referral tracking, payout reconciliation

---

## Wave 1: Type Safety & Core Infrastructure (Week 1)

### 1.1 Supabase Type Generation Sync [URGENT]
**Priority**: P0 | **Effort**: 4-6 hours | **Owner**: Backend  
**Why**: Current pragmatic `as any` casts (50+ instances, 15 files) hide type errors and cause maintenance drag.

**Files Affected**:
- `src/lib/db.ts`, `src/lib/referrals.ts`
- `src/app/api/commissions/*`, `src/app/api/referrals/*`
- `src/app/api/webhooks/uppromote/route.ts`
- `src/lib/admin/auth.ts`

**Tasks**:
1. Generate Supabase types from live schema: `supabase gen types typescript --schema public > types/supabase.ts`
2. Compare generated types against current mismatches
3. Create test harness: every migration + type generation must stay in sync
4. Batch-replace `as any` casts with proper types
5. Add pre-commit hook to validate schema/type sync

**Definition of Done**:
- Zero `as any` casts in production code
- Type generation automated in CI/CD
- All TypeScript strict mode checks pass
- Test harness covers 100% of Supabase queries

---

### 1.2 Supabase Client Lazy Initialization Refactor
**Priority**: P0 | **Effort**: 3-4 hours | **Owner**: Backend  
**Why**: Current proxy pattern in `db.ts` can hide initialization failures; module-level Supabase clients prevent build-time initialization.

**Tasks**:
1. Refactor proxy pattern → explicit singleton factory
2. Move all module-level Supabase clients to lazy initialization inside handlers
3. Add explicit error handling for initialization failures
4. Document request-scoped vs application-scoped client usage
5. Update all API routes to use lazy client pattern

**Files**:
- `src/lib/db.ts` (singleton factory)
- `src/app/api/admin/**/*.ts` (lazy imports)
- `src/app/api/commissions/**/*.ts` (lazy imports)
- `src/app/api/webhooks/**/*.ts` (lazy imports)

---

### 1.3 Admin Settings Persistence
**Priority**: P1 | **Effort**: 8 hours | **Owner**: Full-stack  
**Why**: Currently draft-only (in-memory). Admins believe changes persist when they don't.

**Current State**: Changes proposed → in-memory → dismissed on redeploy  
**Target State**: Change → git commit → Vercel deploy → live config

**Flow**:
1. Admin submits change in UI (POST `/api/admin/settings`)
2. `src/lib/admin/settingsManager.ts` validates & formats change
3. **NEW**: Write change to `src/config/settings.ts` (mutate file)
4. **NEW**: Commit: `git add src/config/settings.ts && git commit -m "Admin: update {field}"`
5. **NEW**: Trigger Vercel deploy via webhook
6. Vercel redeploys with new config
7. Audit log records: pending → deployed → live

**Key Files to Create**:
- `src/lib/admin/gitManager.ts` - Git operations (add, commit, push)
- `src/lib/admin/vercelManager.ts` - Trigger Vercel redeploy via API
- Enhanced `src/lib/admin/settingsManager.ts` - Orchestrate persistence workflow
- API route enhancement: `src/app/api/admin/settings/route.ts` - POST handler

**Database Schema Update**:
```sql
-- audit_log: add columns for deployment tracking
ALTER TABLE audit_log ADD COLUMN deployment_id uuid;
ALTER TABLE audit_log ADD COLUMN deployment_status TEXT DEFAULT 'pending';
ALTER TABLE audit_log ADD COLUMN deployed_at TIMESTAMP;
```

**UI Updates** (Admin Panel):
- Show "Pending" badge until deployed
- Disable edits during deployment
- Auto-refresh on successful deploy
- Show error messages if deploy fails

---

## Wave 2: Security & Idempotency (Week 2)

### 2.1 Webhook Idempotency & Signature Verification
**Priority**: P0 | **Effort**: 6 hours | **Owner**: Backend  
**Why**: Duplicate webhook deliveries can cause duplicate commissions or double-counted conversions.

**Files**:
- `src/app/api/webhooks/uppromote/route.ts` - UpPromote webhook
- `src/app/api/webhooks/shopify/route.ts` - Shopify webhook
- `src/app/api/webhooks/orders/route.ts` - Orders webhook

**Requirements**:
1. **Signature Verification**: All webhooks must verify HMAC-SHA256 before processing
   - UpPromote: `verifyWebhookSignature()` already exists, enhance validation
   - Shopify: Use `crypto.timingSafeEqual()` for X-Shopify-Hmac-SHA256
   - Orders: Implement same pattern

2. **Idempotency**: Prevent duplicate processing
   - Store `webhook_id` (from provider) in database
   - Check if ID exists before creating commission/order records
   - Return `200 OK` for duplicates (idempotent success)
   - Add `idempotency_key` column to `commissions`, `orders`, `referrals` tables

3. **Request Body Validation**:
   - Never trust request.url for webhooks (can be spoofed)
   - Always use raw request body for signature verification
   - Store request body hash in audit trail for replay detection

**Test Cases**:
- Valid signature, first delivery → commission created
- Valid signature, duplicate delivery → 200 OK, no new commission
- Invalid signature → 401 Unauthorized, no error in response (silent failure)
- Missing signature → 401 Unauthorized, silent failure

---

### 2.2 Referral Conversion Idempotency
**Priority**: P1 | **Effort**: 3 hours | **Owner**: Backend  
**Why**: `/api/referrals/track` can receive duplicate calls from retries; each creates new commission.

**File**: `src/app/api/referrals/track/route.ts`

**Tasks**:
1. Extract order ID as unique key
2. Check if commission already exists for (referrer_id, order_id)
3. Return existing commission if duplicate
4. Add `order_id` to `commissions` table (unique constraint)

---

### 2.3 Auth Session Persistence
**Priority**: P1 | **Effort**: 4 hours | **Owner**: Backend  
**Why**: Several routes assume `getServerSession()` works, but session wiring may not persist cookies.

**Files**:
- `src/app/api/auth/login/route.ts` - Ensure session cookie set
- `src/app/api/auth/logout/route.ts` - Clear session cookie
- `src/app/api/admin/commissions/route.ts` - Verify session check works
- `src/app/(admin)/layout.tsx` - Server-side auth gating

**Requirements**:
1. Verify NextAuth session cookie is set in response
2. Test login → redirect → auth-required page flow
3. Ensure cookie is HttpOnly, Secure, SameSite=Lax
4. Add server-side auth checks to all protected routes (not just client redirect)

---

## Wave 3: Provider Integration & Testing (Week 3)

### 3.1 3PL Provider Vetting
**Priority**: P1 | **Effort**: 8 hours (vetting calls + evaluation) | **Owner**: Product + Ops

**Providers to Vet**:
- ShipBlu (flagged as risky: 2 Shopify reviews, 3.2★)
- Bosta (Flavor 1 standard pickup+lastmile)
- Mylerz (Flavor 1 standard pickup+lastmile)
- Flextock (Flavor 2 dark-store sub-4hr)

**Vetting Agenda** (per provider):
1. **Returns SLA**: Reverse-pickup timeline? QC turnaround? Cosmetics-specific handling?
2. **Cosmetics Compliance**: Know hazmat restrictions? Can handle eyelash/nail products?
3. **Pricing**: Per-shipment cost, return reversal fee, COD settlement terms?
4. **API Integration**: Webhook support? Real-time tracking? Batch upload?
5. **References**: 2+ customer refs from beauty/cosmetics brands
6. **Contract Terms**: Minimum volumes, cancellation clauses, SLA penalties?

**Outcome**: Decision matrix scoring each provider (Go/No-Go for Phase 2 launch)

---

### 3.2 Payment Processor Onboarding
**Priority**: P1 | **Effort**: 6 hours | **Owner**: Ops + Finance

**Paymob** (Primary):
- Verify API credentials in Vercel env
- Test order → charge flow
- Test COD → settlement flow
- Reconcile T+1 settlement logic in commission payout

**Fawry** (Fallback):
- Obtain API sandbox credentials
- Implement conditional fallback in `src/lib/cache.ts` (if Paymob fails, retry Fawry)
- Test failover trigger

**InstaPay** (Affiliate Payouts):
- Clarify if bulk B2B payouts are supported (research earlier said unclear)
- If unsupported: use Stripe Connect instead for affiliate payouts
- If supported: obtain API credentials, test payout flow

---

### 3.3 Affiliate Commission Testing
**Priority**: P1 | **Effort**: 6 hours | **Owner**: QA + Backend

**Test Suite** (`__tests__/commissions.test.ts`):
1. **Commission Calculation**:
   - Order $100, referrer Starter tier (7%) → $7 commission ✓
   - Auto-upgrade: referrer hits $200 monthly → tier bumps to Growth (10%) ✓
   - VIP tier (custom rate) → applies correctly ✓

2. **Payout Processing**:
   - Pending commissions → approved → paid flow
   - Batch payout: 5 commissions, different rates, all paid in one batch ✓
   - Stripe Connect vs InstaPay routing (conditional on tier) ✓

3. **Webhook Replay** (via UpPromote):
   - Duplicate order event → no double commission ✓
   - Failed webhook → retry succeeds, no double commission ✓

---

## Wave 4: Polish & Docs (Week 4)

### 4.1 Admin Panel Phase 2 Enhancements
- Real-time deployment status in UI
- Rollback capability (revert last 3 deployments)
- Bulk config import/export (JSON)
- Config diff viewer before deploy

### 4.2 Integration Tests
- End-to-end: order → commission → payout → settlement reconciliation
- Referral tracking: click → signup → conversion → commission
- 3PL: create return → track status → reconcile refund

### 4.3 Documentation
- **Operator Manual**: How to deploy config changes safely
- **Troubleshooting Guide**: Common webhook failures, payment issues, 3PL SLA misses
- **Security Checklist**: Webhook signature verification, idempotency, rate limits
- **Affiliate Program Guide**: Tier thresholds, payout timing, commission reconciliation

---

## Success Criteria

| Item | Phase 1 | Phase 2 Target |
|---|---|---|
| TypeScript strict mode | ✓ (with `as any` casts) | ✓ (zero `as any`) |
| Admin settings persistence | Draft-only | Git + Vercel deploy |
| Webhook idempotency | Not addressed | 100% of webhooks |
| Security: Signature verification | UpPromote only | All webhooks |
| Integration tests | None | 90%+ coverage |
| 3PL partnerships | Research only | 2+ signed contracts |
| Production-readiness | ~60% | ~95% |

---

## Dependencies & Blockers

**Blocking Phase 2**:
- None (Phase 1 complete)

**Risks**:
- 3PL provider vetting delays (longest pole: shipping partner availability for calls)
- Supabase type generation tool compatibility with current schema
- Admin settings git/deploy orchestration complexity (needs careful error handling)

---

## Timeline

| Wave | Week | Start | End | Status |
|---|---|---|---|---|
| 1 (Type Safety) | Week 1 | 2026-07-11 | 2026-07-17 | Planned |
| 2 (Security) | Week 2 | 2026-07-18 | 2026-07-24 | Planned |
| 3 (Providers) | Week 3 | 2026-07-25 | 2026-07-31 | Planned |
| 4 (Polish) | Week 4 | 2026-08-01 | 2026-08-07 | Planned |

---

## Sign-Off

Created: 2026-07-11  
By: Claude Code (Autonomous Agent)  
For: Hex-Diva Phase 2 Sprint Planning
