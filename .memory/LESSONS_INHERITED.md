# Lessons Learned: Inherited from hex-yt-intel (70+ days of operations)

This document maps critical lessons from hex-yt-intel (May-July 2026) to hex-diva implementation. Rather than repeat trial-and-error, we apply proven best practices directly.

**Source**: `/workspace/hex-yt-intel/.memory/lessons.md` and ops documentation  
**Date Copied**: 2026-07-10  
**Status**: Active and applied

---

## Directly Applicable Lessons

### Lesson 4: Verify in Actual Platform, Not CLI
**Hex-Diva Application:**
- After Vercel deployment, check https://vercel.com/hex-tech-lab/hex-diva/deployments (not just CLI output)
- After Supabase project creation, verify project status in dashboard (not just API response)
- After GitHub Actions setup, watch actual workflow run (not just commit)

**Current Status**: ✅ Applied  
- Vercel project created and linked (verified in dashboard)
- Supabase project created in eu-west-3 (verified via list_projects)
- Both showing ACTIVE_HEALTHY status

---

### Lesson 7: Quota Fortress Pattern
**Hex-Diva Application:**
- Referral commission calculations use Redis (Upstash) for atomic increments
- Rate limiting enforced in Vercel (not edge workers)
- Payout operations check minimum threshold before Stripe Connect call

**Implementation Status**: 🔄 In Progress (Next Phase)
- Redis client available via @upstash/redis
- Rate limiting middleware queued (high-priority audit)
- Payout endpoint auth/validation queued (high-priority audit)

---

### Lesson 9 & 10: Service-Client Routes Need Explicit Ownership Checks
**Hex-Diva Application:**
- All routes using `supabase.auth.getUser()` vs `getSupabaseServiceClient()` are audited
- Commission creation (Track C fix): Verified order ownership before creating commission
- Referral endpoints: User can only read/update own referral stats

**Implementation Status**: ✅ Partially Complete (Track C Done)
- Track C (backend auth) hardened and merged
- Full codebase sweep needed for remaining service-client routes

---

### Lesson 11: Structural Fix Beats Suppression
**Hex-Diva Application:**
- Next.js config: Replaced deprecated `swcMinify` + custom webpack with native Turbopack
- Not just for Vercel compatibility, but objectively better

**Implementation Status**: ✅ Applied
- next.config.ts migrated (removed swcMinify, removed webpack config)
- Uses proven configuration from hex-yt-intel/web/next.config.ts

---

### Lesson 12: Check Branch Divergence Before Committing
**Hex-Diva Application:**
- Before starting track work, verified designated branch history
- Merged Track C properly without mixing concerns

**Prevention Going Forward:**
```bash
# Always check this before starting new work
git log origin/main..origin/claude/hex-diva-repo-setup-4h4m2v --oneline
```

---

## Configuration & Infrastructure Decisions

### From hex-yt-intel Known Good State Checklist
✅ **Applied to hex-diva:**

| Setting | Hex-Diva | Status |
|---------|----------|--------|
| Node version constraint | `>=24.0.0` (relaxed for Vercel) | ✅ Done |
| pnpm version constraint | `>=10.0.0` (relaxed for npm) | ✅ Done |
| React version | `^18.3.1` (stable, not RC) | ✅ Fixed |
| next.config format | TypeScript (not JavaScript) | ✅ Migrated |
| Turbopack root config | `path.resolve(__dirname)` | ✅ Added |
| .npmrc settings | `auto-install-peers=true` + `frozen-lockfile=true` | ✅ Copied |
| Sentry integration | `withSentryConfig` wrapper | ✅ Added |
| Image optimization | Shopify CDN + Supabase patterns | ✅ Configured |

---

## Unresolved Categories (Awaiting Verification)

### 🔴 Must Audit (From hex-yt-intel Issues)

1. **Webhook Idempotency** (Track C found orders webhook vulnerability)
   - Status: Signature verification in place, idempotency check queued
   - Risk: Double-commission creation on Shopify webhook retry

2. **Service-Client Route Sweep** (Lesson 9 scope)
   - Status: Track C audited, broader codebase sweep pending
   - Risk: IDOR vulnerabilities via unsanitized user-supplied IDs

3. **Rate Limiting Enforcement** (Lesson 7 application)
   - Status: Helper exists, route coverage unknown
   - Risk: Brute-force login, API abuse

---

## How to Use This Document

### 🟢 When Starting Feature Work
1. Read the "Directly Applicable Lessons" section
2. Check the "Implementation Status" for that lesson
3. If status = 🔄 (In Progress), reference the queued audit
4. If status = ⚠️ (Not Started), create a task before coding

### 🟡 When Debugging Production Issues
1. Check "Unresolved Categories"
2. Cross-reference with `/docs/ops/KNOWN_GOOD_STATE_CHECKLIST.md`
3. Consult hex-yt-intel PRs/commits that fixed the same issue

### 🔵 When Onboarding New Team Members
1. Have them read `/docs/ops/KNOWN_GOOD_STATE_CHECKLIST.md`
2. Show them this mapping
3. Point to hex-yt-intel as the "70-day proving ground"

---

## Related Files in This Project

- `.memory/lessons.md` — Raw lessons from hex-yt-intel (do not edit; reference only)
- `docs/ops/KNOWN_GOOD_STATE_CHECKLIST.md` — Verification checklist
- `docs/ops/VERCEL_SETUP.md` — Environment variable setup
- `docs/ops/SECURE_DEPLOY.md` — Security checklist
- `next.config.ts` — Proven Next.js 16 configuration
- `.npmrc` — Peer dependency and lockfile settings

---

## Appendix: Lessons Not Applicable to Hex-Diva

| Lesson | Hex-YT-Intel Context | Reason Not Applicable |
|--------|---------------------|----------------------|
| Lesson 1: Cloudflare Naming | Multiple workers in production | Hex-Diva uses Vercel (no Cloudflare Workers) |
| Lesson 2: Platform References | kellybakri vs hex-tech-lab | Hex-Diva uses hex-tech-lab consistently from day 1 |
| Lesson 3: Domain Knowledge | Paris region decision | Already applied: Supabase eu-west-3 chosen |
| Lesson 6: Sync Git ↔ Platform | wrangler.toml divergence | Hex-Diva uses vercel.json (CLI-managed) |
| Lesson 8: Cryptographic Isolation | Worker-Vercel signing pattern | Hex-Diva doesn't use Cloudflare Workers; Vercel handles signing |

---

**Last Updated**: 2026-07-10  
**Scope**: Configuration + Architecture + Security patterns  
**Next Review**: After first production deployment  
