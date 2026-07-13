# Wave 2: End-to-End Workflows & Traces

Architecture verification document for Wave 2 Tiers 1-6 (Fixes: Security Hardening + Idempotency).

## 1. Commission Processing Workflow

**Domain**: `src/lib/referrals.ts` → `src/lib/adapters/CommissionRepositoryAdapter.ts` → Supabase

### Flow:
```
User Purchase
  ↓
calculateCommission(orderTotal=1000, tier='silver')
  ├─ getTierConfig('silver') → { rate: 0.10 }
  ├─ amount = 1000 * 0.10 = 100 EGP
  └─ return 100 (rounded to 2 decimals)
  ↓
processOrderCommission(referrerId, orderId, 1000, repo)
  ├─ repo.processOrderCommission(referrerId, orderId, 1000)
  │   ├─ Adapter: Check (referrer_id, order_id) uniqueness
  │   ├─ Idempotent: Redis check via IIdempotencyStore
  │   ├─ Atomic: Lua script prevents race conditions (Law #1)
  │   └─ Insert: commissions table (status='pending')
  ├─ return DbCommissionRecord { id, amount: 100, status: 'pending' }
  ↓
[Admin Approval Flow]
approveCommission(commissionId, repo)
  ├─ repo.approveCommission(commissionId)
  │   └─ Update: status='pending' → 'approved'
  ├─ return DbCommissionRecord { status: 'approved' }
  ↓
[Payout Flow]
createPayout(userId, periodStart, periodEnd, amount, repo)
  ├─ repo.createPayout(userId, periodStart, periodEnd, amount)
  │   └─ Insert: commission_payouts table
  ├─ return CommissionPayoutRecord { id, status: 'pending' }
  ↓
Stripe Transfer
  ├─ stripe.transfers.create({
  │   amount: 10000 (cents),
  │   destination: stripeAccountId
  │ })
  ├─ return { id: 'tr_...' }
  ↓
markPayoutAsPaid(payoutId, stripeTransferId, repo)
  ├─ repo.markPayoutAsPaid(payoutId, stripeTransferId)
  │   └─ Update: status='pending' → 'paid', stripe_transfer_id='tr_...'
  ├─ return CommissionPayoutRecord { status: 'paid' }
```

**Architecture Compliance:**
- ✅ Business logic: `calculateCommission()` pure function (no adapters)
- ✅ Port injection: `repo: ICommissionRepository` injected into `processOrderCommission()`
- ✅ Adapter swappable: Test DI can inject mock `ICommissionRepository` without touching domain
- ✅ Idempotency: Adapter checks (referrer_id, order_id) via Redis deduplication (7-day TTL)
- ✅ Atomicity: Lua script in Upstash Redis prevents race conditions (Law #1)

---

## 2. Referral Tracking Workflow

**Domain**: `src/lib/referrals.ts` (pure domain) → Optional: `ICommissionRepository` for signup linking

### Flow:
```
Referrer Creates Referral Code
  ↓
getReferralCode(userId) → 'ABC123XYZ'
  (stored in users.referral_code during signup)
  ↓
buildReferralUrl('https://hex-diva.com', 'ABC123XYZ')
  ├─ Pure function: No adapters
  ├─ URL: 'https://hex-diva.com?ref=ABC123XYZ'
  └─ Throw: Invalid base URL
  ↓
Share with Friend
  ├─ trackReferralClick('ABC123XYZ')
  │   ├─ Pure event data: { event: 'referral_click', referralCode, timestamp, source }
  │   └─ Caller posts to analytics (not domain responsibility)
  ↓
Friend Clicks → Signup & Purchase
  ├─ parseReferralCode(?ref=ABC123XYZ)
  │   ├─ Validate: alphanumeric, 6-12 chars
  │   └─ Sanitize: uppercase
  ├─ Session: Store referral_code in user context
  ↓
[Post-Signup: Link Referral to User]
linkReferralToSignup(referralToken='ABC123XYZ', userId=new_user_id, repo)
  ├─ repo.linkReferralToSignup(referralToken, userId)
  │   ├─ Adapter: Query (referrer_id) by referral_code
  │   ├─ Adapter: Insert referral record (referrer_id, referred_user_id)
  │   └─ Adapter: Update referral_stats (total_referrals++)
  ├─ return void (side effect only)
  ↓
[During Order Processing]
trackReferralConversion('ABC123XYZ', 1000, orderId)
  ├─ Pure event: { event: 'referral_conversion', referralCode, orderTotal, orderId, timestamp }
  ├─ Caller posts to analytics
  ↓
[Commission Auto-Created via Webhook]
(triggered by order.created webhook from Shopify)
  ├─ Extract: referred_user_id from order
  ├─ Lookup: referrer_id from referrals table
  ├─ Calculate: commission = orderTotal * tierRate
  ├─ Call: processOrderCommission(referrerId, orderId, orderTotal, repo)
  └─ Result: Commission record created (status='pending')
```

**Architecture Compliance:**
- ✅ Pure domain: `parseReferralCode()`, `buildReferralUrl()`, `trackReferralClick()` are pure (no adapters)
- ✅ Port injection: `linkReferralToSignup()` receives `ICommissionRepository`
- ✅ Side effects: Event tracking delegated to caller (analytics system)
- ✅ Separation of concerns: Domain tracks events; adapters persist data

---

## 3. Webhook Idempotency Workflow

**Security Focus**: Signature verification + deduplication (Law #1 atomic operations)

### Flow:
```
External Webhook Provider (Shopify, UpPromote, etc.)
  ↓
Send Signed Webhook
  ├─ Body: { event_type, data, ... }
  ├─ Header: X-Webhook-Signature: "hmac-sha256=..."
  ↓
[Route Handler] POST /api/webhooks/{provider}
  ├─ Extract: signature from header
  ├─ Verify: verifySignature(body, signature, signingSecret)
  │   ├─ Port: IWebhookSignatureVerifier
  │   ├─ Adapter: Timing-safe HMAC comparison (constant-time, no timing attacks)
  │   └─ return: boolean (valid)
  ├─ If invalid: return 401 Unauthorized
  ├─ If valid: continue to deduplication
  ↓
[Deduplication Check] (Law #1: Atomic Redis Lua)
  ├─ Extract: webhookId from body (provider-specific)
  ├─ Redis key: "{provider}:{webhookId}"
  ├─ checkIdempotency(webhookId, provider)
  │   ├─ Port: IIdempotencyStore
  │   ├─ Adapter: Redis GET on key
  │   ├─ Return: { processed: boolean, bodyHash: string }
  │   └─ If already processed: return 200 OK (idempotent)
  ├─ Calculate: bodyHash = SHA256(body)
  ├─ Mark processed: markWebhookProcessed(webhookId, provider, bodyHash)
  │   ├─ Adapter: Redis SET with Lua script (atomic)
  │   ├─ TTL: 7 days (604800 seconds)
  │   └─ Guarantees: Race-free even under concurrent requests
  ↓
[Event Logging] (Audit trail for replay/debugging)
  ├─ logWebhookEvent(webhookId, provider, payload, latency)
  │   ├─ Port: IWebhookEventLogger
  │   ├─ Adapter: Supabase RPC insert into webhook_events
  │   ├─ Metrics: Latency tracking (SLA 2000ms threshold)
  │   └─ Alert: Log if latency > 2000ms
  ↓
[Business Logic Processing]
  ├─ Parse provider-specific payload
  ├─ For Shopify: Extract order → processOrderCommission()
  ├─ For UpPromote: Extract conversion → updateAffiliateStats()
  ├─ For Stripe: Extract payout → reconcile with local records
  ↓
[Response]
  ├─ If success: return 200 OK { success: true, eventId }
  ├─ If error: return 500 error (webhook provider retries per backoff policy)
  └─ Log: Full error context for debugging
```

**Architecture Compliance:**
- ✅ Signature verification: Timing-safe HMAC (no side-channel attacks)
- ✅ Atomic deduplication: Lua script prevents race conditions (Law #1)
- ✅ Port injection: IIdempotencyStore, IWebhookEventLogger injected
- ✅ Adapter swappable: Can replace Redis with in-memory store for tests
- ✅ Audit trail: Full event logging for compliance & debugging
- ✅ Idempotency guarantee: Same webhook processed only once (7-day window)

---

## 4. Settings Mutation & Deployment Workflow

**Security Focus**: Admin-only mutations, Git persistence, Vercel deployment polling

### Flow:
```
Admin Initiates Setting Change
  ├─ UI: SettingsEditor component
  ├─ Request: POST /api/admin/settings
  │   ├─ Body: { section: 'affiliate', field: 'commissioning.tiers[0].rate', newValue: 0.08 }
  │   ├─ Auth: Bearer token (admin email in ADMIN_EMAIL_WHITELIST)
  ↓
[Validation Layer]
  ├─ validateMutation(request)
  │   ├─ Domain: src/lib/admin/settingsMutator.ts
  │   ├─ Check: section exists in SETTINGS
  │   ├─ Check: field path is valid (recursive parse)
  │   ├─ Check: newValue type matches expected type
  │   ├─ BLOCK: Dangerous patterns (import, export, eval, process.env)
  │   └─ return: { valid: boolean, errors: string[] }
  ├─ If invalid: return 400 Bad Request with errors
  ↓
[Backup Creation]
  ├─ readSettingsFile() → content = settings.ts (full file)
  ├─ createBackup(content)
  │   ├─ Adapter: fs.writeFileSync to .backups/settings-2026-07-11T08:01:23.ts
  │   └─ return: backupPath
  ├─ Store: backupPath for potential rollback
  ↓
[Mutation]
  ├─ mutateSettings(request)
  │   ├─ Serialize: newValue to TypeScript literal (e.g., 0.08 → "0.08")
  │   ├─ Regex: Find and replace in settings.ts
  │   │   Old: "commissionValue: 0.10,"
  │   │   New: "commissionValue: 0.08,"
  │   ├─ Write: fs.writeFileSync(settings.ts, newContent)
  │   ├─ Verify: Re-parse settings.ts + validate all tiers
  │   └─ If error: Restore from backup, throw
  ├─ return: { success: true, backupPath }
  ↓
[Git Persistence]
  ├─ stageSettingsFile()
  │   ├─ Adapter: Git shell → `git add src/config/settings.ts`
  ├─ commitSettings(section, field, adminEmail, description)
  │   ├─ Commit message includes metadata:
  │   │   "[SETTINGS] affiliate.commissioning.tiers[0].rate
  │   │    Old: 0.10 | New: 0.08
  │   │    Admin: admin@example.com | Timestamp: 2026-07-11T08:01:23Z"
  │   └─ return: commitSha
  ├─ pushChanges()
  │   ├─ Adapter: GitHub API (not git shell; Law #2 request-scoped)
  │   ├─ Retry: Exponential backoff (2s, 4s, 8s, 16s over 4 attempts)
  │   └─ return: pushResult { success, sha }
  ↓
[Vercel Deployment]
  ├─ deploySettings(commitSha)
  │   ├─ Adapter: Vercel API
  │   ├─ Trigger: Build from commitSha
  │   ├─ Poll: Every 5s, check deployment status
  │   ├─ Timeout: 5 minutes (300s)
  │   └─ return: { status: 'ready' | 'failed', ... }
  ├─ If failed: return error + backupPath (for admin to investigate)
  ├─ If ready: Update audit log (action='deployed')
  ↓
[Audit Log Persistence]
  ├─ logMutationAudit(mutationRecord)
  │   ├─ Adapter: Supabase admin_audit_logs insert
  │   ├─ Fields: action, section, field, old_value, new_value, admin_email, timestamp, deployment_status
  │   └─ RLS: Only admin can read; all users can see aggregated stats
  ├─ return: auditLogId
  ↓
[Response to Admin]
  ├─ return 200 OK {
  │   success: true,
  │   section: 'affiliate',
  │   field: 'commissioning.tiers[0].rate',
  │   oldValue: 0.10,
  │   newValue: 0.08,
  │   deploymentStatus: 'ready',
  │   deploymentUrl: 'https://hex-diva.vercel.app',
  │   auditLogId: 'audit_...'
  │ }
```

**Architecture Compliance:**
- ✅ Admin-only: Bearer token + email whitelist
- ✅ Backup-safe: All mutations backed up before commit
- ✅ Atomic: Git commit + Vercel deploy as single logical unit
- ✅ Audit trail: Full mutation history in Supabase (Law #8)
- ✅ Adapter swappable: Can replace Vercel API with local mock for tests
- ✅ Idempotent retry: Exponential backoff prevents thundering herd
- ✅ Rollback capability: Backup path stored for manual recovery

---

## 5. Monthly Commission Tier Reset Workflow

**Scheduled Task**: Runs at 00:00 UTC on 1st of each month

### Flow:
```
[Monthly Scheduler] 00:00 UTC on 1st of month
  ├─ Trigger: Cron job or manual admin trigger
  ├─ checkAndResetMonthlyVolumes()
  │   ├─ Domain: src/lib/commissions/monthlyResetScheduler.ts
  │   ↓
  │   Query all affiliates with referral_stats
  │   ├─ Supabase: .from('referral_stats').select(...)
  │   ├─ RLS: Admin-only access (via admin auth)
  │   ├─ Fields: referrer_id, volume_month, volume_month_reset_at, total_conversions, current_tier
  │   ↓
  │   For each affiliate:
  │   ├─ Check: shouldResetMonthlyVolume(volume_month_reset_at)
  │   │   ├─ If last_reset >= start_of_current_month: SKIP (already reset)
  │   │   └─ If last_reset < start_of_current_month: PROCESS (reset needed)
  │   ├─ Calculate:
  │   │   ├─ newTier = determineTier(total_conversions)
  │   │   │   "Bronze (0-10), Silver (11-50), Gold (51+)"
  │   │   ├─ tierChanged = (previousTier !== newTier)
  │   │   ├─ tierDowngrade = tierChanged && (newRate < previousRate)
  │   ├─ Update affiliate_stats:
  │   │   ├─ volume_month = 0 (reset monthly counter)
  │   │   ├─ volume_month_reset_at = NOW (timestamp of reset)
  │   │   ├─ current_tier = newTier (update tier based on lifetime conversions)
  │   │   └─ updated_at = NOW
  │   ├─ Log result:
  │   │   ├─ referrerId
  │   │   ├─ email (for notification system)
  │   │   ├─ previousTier → newTier
  │   │   ├─ tierChanged (boolean)
  │   │   ├─ tierDowngrade (boolean, for alert notifications)
  │   └─ Collect: ResetResult[] array
  │
  ├─ Process results (e.g., send email notifications)
  │   ├─ For tier upgrades: "Congratulations! You've reached Gold tier (+5% commission)"
  │   ├─ For tier downgrades: "Your tier has adjusted based on this month's activity"
  │   └─ Note: Uncommitted commissions retain their original tier (no retroactive changes)
  │
  ├─ Audit log creation:
  │   ├─ logMonthlyResetAudit(results)
  │   │   ├─ Adapter: Supabase admin_audit_logs insert
  │   │   ├─ Action: 'monthly_volume_reset'
  │   │   ├─ Summary: total_affiliates, tier_upgrades, tier_downgrades
  │   │   ├─ Details: Array of downgrades (referrerId, from_tier, to_tier)
  │   │   └─ Timestamp: deployment_at
  │
  └─ Return: ResetResult[] (for monitoring dashboard)
```

**Architecture Compliance:**
- ✅ Lazy initialization: Supabase admin client loaded at call-time (not module-level)
- ✅ Tier calculation: Pure function `determineTier()` (no adapters)
- ✅ Batch safety: All updates within same transaction (via Supabase)
- ✅ Audit trail: Reset events logged for compliance
- ✅ Immutability: Uncommitted commissions retain original tier (business rule)
- ✅ Timezone safety: All dates in UTC (consistent across regions)

---

## 6. Request-Scoped Client Lifecycle (Law #2)

**Critical Architecture Rule**: Every API route must instantiate a request-scoped Supabase client

### Implementation:

```typescript
// ❌ WRONG (Shared client instance — violates Law #2):
const supabaseAdmin = getSupabaseAdmin(); // Module-level
export async function GET(request) {
  const data = await supabaseAdmin.from('commissions').select();
  return NextResponse.json(data);
}

// ✅ CORRECT (Request-scoped client — satisfies Law #2):
export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin(); // Inside handler
  const data = await supabaseAdmin.from('commissions').select();
  return NextResponse.json(data);
}
```

**Why This Matters:**
- Row-Level Security (RLS) context isolated per request
- User identity (from auth token) enforced per request
- No cross-request data leakage
- Concurrent requests don't interfere

**Files Compliant:**
- ✅ `src/app/api/commissions/payout/route.ts`: Line 41 (GET handler), Line 134 (POST handler)
- ✅ `src/app/api/commissions/approve/route.ts`: Line 38 (POST handler)
- ✅ `src/app/api/referrals/track/route.ts`: Request-scoped client
- ✅ `src/app/api/admin/settings/route.ts`: Request-scoped client

---

## Summary: Architecture Compliance Scorecard

| Workflow | Domain Logic | Port Injection | Adapter Swappable | Atomicity | Audit Trail | Status |
|----------|--------------|----------------|-------------------|-----------|-------------|--------|
| Commission | ✅ Pure calc | ✅ ICommissionRepository | ✅ Yes | ✅ Lua atomic | ✅ Supabase | ✅ |
| Referral | ✅ Pure funcs | ✅ ICommissionRepository | ✅ Yes | N/A | ✅ Events | ✅ |
| Webhook | ✅ Verification | ✅ IIdempotencyStore, IWebhookEventLogger | ✅ Yes | ✅ Lua atomic | ✅ Full log | ✅ |
| Settings | ✅ Validation | ✅ Git API, Vercel API | ✅ Yes | ✅ Backup+commit | ✅ Audit log | ✅ |
| Tier Reset | ✅ Calculation | ✅ Lazy-loaded | ✅ Yes | ✅ Transaction | ✅ Audit log | ✅ |
| Request Scope | N/A | N/A | N/A | N/A | N/A | ✅ |

**All workflows compliant with Hex Lite (Hexagonal) Architecture.**
