# Quick Reference: Idempotency Integration Tests

## What These Tests Verify

### Wave 2.1: Webhook Deduplication
Ensures duplicate webhooks are detected and cached in Redis, preventing duplicate order processing:
- Same webhook ID returns cached result without re-processing
- 7-day TTL prevents old webhooks from being accepted
- Timing-safe signature verification prevents replay attacks
- Supports Shopify, UpPromote, and Orders webhooks

### Wave 2.2: Referral Commission Idempotency
Ensures commissions are created once per (referrer_id, order_id) combination:
- Concurrent requests create only one commission record
- Uniqueness constraint enforced via database
- Multiple referrers can earn commissions on same order
- Status tracking through payment lifecycle

### Wave 2.3: Session Persistence
Ensures user sessions are secure and properly managed:
- Cookies set with httpOnly, Secure, and SameSite=Lax flags
- Cookie maxAge matches session expiry times
- Login, refresh, and logout flows work correctly
- Session state persists across operations

---

## File Location
```
src/__tests__/idempotency.test.ts
```

---

## Quick Stats
- **42 tests** across 17 describe blocks
- **3 mock implementations** (Redis, Supabase, SessionStore)
- **100% pass rate** expected
- **TypeScript strict mode** compliant
- **~35 KB** file size

---

## Running Tests

### Full Suite
```bash
pnpm vitest run src/__tests__/idempotency.test.ts
```

### Watch Mode (Live Reload)
```bash
pnpm vitest watch src/__tests__/idempotency.test.ts
```

### Specific Wave
```bash
# Wave 2.1 only
pnpm vitest run -t "Wave 2.1" src/__tests__/idempotency.test.ts

# Wave 2.2 only
pnpm vitest run -t "Wave 2.2" src/__tests__/idempotency.test.ts

# Wave 2.3 only
pnpm vitest run -t "Wave 2.3" src/__tests__/idempotency.test.ts
```

### Single Test
```bash
pnpm vitest run -t "should detect duplicate webhook" src/__tests__/idempotency.test.ts
```

### Validate Structure (No Vitest Required)
```bash
node src/__tests__/run-tests.js
```

---

## Test Organization

### Wave 2.1: Webhook Idempotency (14 tests)

**Duplicate Detection (1 test)**
- `should detect duplicate webhook with same ID and return cached result`

**Provider Support (2 tests)**
- `should distinguish webhooks from different providers with same ID`
- `should test different webhook providers (shopify, uppromote, orders)`

**Cache TTL (2 tests)**
- `should cache webhook for 7 days (604800 seconds)`
- `should expire webhook after TTL`

**Error Handling (1 test)**
- `should handle missing Redis gracefully`

**Signature Verification (4 tests)**
- `should verify valid webhook signature using timing-safe comparison`
- `should reject invalid webhook signature`
- `should reject signature with modified body (replay detection)`
- `should use timing-safe equal to prevent timing attacks`

**Failure Scenarios (4 tests)**
- `should reject webhook with missing signature`
- `should reject webhook with malformed JSON body`
- `should store failed webhook processing result`
- `should handle webhook without ID`

---

### Wave 2.2: Referral Commission Idempotency (8 tests)

**Commission Creation (2 tests)**
- `should return existing commission when called again for same order`
- `should not create duplicate commission for same referrer and order`

**Multiple Referrers (1 test)**
- `should create separate commissions for different referrers on same order`

**Concurrency (2 tests)**
- `should handle concurrent requests for same order (simulated race condition)`
- `should verify only one commission per referrer-order combination`

**Uniqueness (1 test)**
- `should enforce unique constraint on (referrer_id, order_id)`

**Multi-Order (1 test)**
- `should allow same referrer with different orders`

**Status Tracking (1 test)**
- `should track commission status through lifecycle`

---

### Wave 2.3: Session Persistence (19 tests)

**Cookie Setup (4 tests)**
- `should set httpOnly cookie for access token on login`
- `should set httpOnly cookie for refresh token on login`
- `should set SameSite=Lax attribute for CSRF protection`
- `should set Secure flag in production environment`

**Cookie Expiry (3 tests)**
- `should set access token maxAge to session expires_in duration`
- `should set refresh token maxAge to 7 days`
- `should match cookie maxAge to token expiration time`

**Token Refresh (3 tests)**
- `should update access token cookie on refresh`
- `should update refresh token cookie when provided`
- `should update both access and refresh tokens on refresh call`

**Logout (3 tests)**
- `should delete access token cookie on logout`
- `should delete refresh token cookie on logout`
- `should clear both cookies on logout`

**Security (4 tests)**
- `should set httpOnly to prevent JavaScript access`
- `should set Secure flag for HTTPS-only transmission`
- `should use Lax SameSite for CSRF protection with form submissions`
- `should verify all security flags are set correctly`

**Persistence (2 tests)**
- `should persist session across multiple cookie operations`
- `should handle cookie operations in order`

---

## What Each Mock Does

### MockRedis
```typescript
// Simulates Upstash Redis with TTL support
const redis = new MockRedis();

await redis.setex('key', 3600, 'value');    // Set with 1-hour TTL
const value = await redis.get('key');      // Get value
const ttl = await redis.ttl('key');        // Check remaining TTL
await redis.del('key');                    // Delete key
```

**Methods**:
- `get(key)`: Returns value or null (auto-expires)
- `setex(key, seconds, value)`: Store with TTL
- `del(key)`: Remove key
- `incr(key)`: Increment counter
- `expire(key, seconds)`: Update TTL
- `ttl(key)`: Get remaining TTL in seconds
- `keys(pattern)`: Pattern-based lookup
- `clear()`: Wipe all data

### MockSupabaseDb
```typescript
// Simulates Supabase with uniqueness constraints
const db = new MockSupabaseDb();

// Check for existing commission
const existing = await db.getCommission('referrer-1', 'order-1');

// Create new commission
const commission = await db.createCommission({
  referrer_id: 'referrer-1',
  order_id: 'order-1',
  amount: 10,
  rate: 0.1,
  tier: 'silver',
  status: 'pending',
  order_total: 100,
});

// Get user info
const user = await db.getUserById('referrer-1');
const stats = await db.getUserStats('referrer-1');
```

**Methods**:
- `getCommission(referrerId, orderId)`: Composite key lookup
- `createCommission(data)`: Insert new record
- `getUserById(userId)`: User lookup
- `getUserStats(userId)`: Stats lookup
- `getStore()`: Raw data access
- `clear()`: Wipe all data

### MockSessionStore
```typescript
// Simulates HTTP cookie jar
const sessionStore = new MockSessionStore();

// Set cookie
sessionStore.setCookie('sb-access-token', 'token123', {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 3600,
});

// Get cookie
const cookie = sessionStore.getCookie('sb-access-token');
console.log(cookie.value);        // 'token123'
console.log(cookie.options);      // { httpOnly: true, ... }

// Delete cookie
sessionStore.deleteCookie('sb-access-token');

// Get all
const allCookies = sessionStore.getAllCookies();
```

**Methods**:
- `setCookie(name, value, options)`: Set cookie with attributes
- `getCookie(name)`: Get cookie and options
- `deleteCookie(name)`: Remove cookie
- `getAllCookies()`: List all cookies
- `clear()`: Wipe all cookies

---

## Expected Test Output

```
✓ Wave 2.1: Webhook Idempotency (14 tests)
  ✓ Duplicate Webhook Detection
    ✓ should detect duplicate webhook with same ID and return cached result
    ✓ should distinguish webhooks from different providers with same ID
    ✓ should test different webhook providers
  ✓ Redis Cache Timing and TTL
    ✓ should cache webhook for 7 days
    ✓ should expire webhook after TTL
    ✓ should handle missing Redis gracefully
  ✓ Timing-Safe Signature Verification
    ✓ should verify valid webhook signature
    ✓ should reject invalid webhook signature
    ✓ should reject signature with modified body
    ✓ should use timing-safe equal
  ✓ Webhook Failure Scenarios
    ✓ should reject webhook with missing signature
    ✓ should reject webhook with malformed JSON body
    ✓ should store failed webhook processing result
    ✓ should handle webhook without ID

✓ Wave 2.2: Referral Conversion Idempotency (8 tests)
  ✓ Commission Idempotency (2 tests)
  ✓ Concurrent Commission Processing (2 tests)
  ✓ Commission Uniqueness Constraint (2 tests)
  ✓ Commission Status Tracking (1 test)

✓ Wave 2.3: Session Persistence & Cookie Management (19 tests)
  ✓ Login Cookie Setup (4 tests)
  ✓ Cookie maxAge and Session Expiry (3 tests)
  ✓ Refresh Token Updates (3 tests)
  ✓ Logout Cookie Deletion (3 tests)
  ✓ Cookie Security Properties (4 tests)
  ✓ Session State Persistence (2 tests)

Test Summary:
  ✓ 42 tests passed
  ✓ 0 tests failed
  ✓ Duration: ~100ms
```

---

## Debugging Tips

### Test Fails: Check Mock State
```typescript
// At end of test, inspect mock state
const redisStore = redis.getStore();
console.log('Redis cache:', redisStore);

const dbStore = db.getStore();
console.log('Database:', dbStore);

const cookies = sessionStore.getAllCookies();
console.log('Cookies:', cookies);
```

### Verify Test Isolation
Each test should be independent:
```typescript
beforeEach(() => {
  redis = new MockRedis();      // Fresh Redis per test
  db = new MockSupabaseDb();    // Fresh DB per test
  sessionStore = new MockSessionStore();
});

afterEach(() => {
  redis.clear();                // Clean up after
  db.clear();
  sessionStore.clear();
});
```

### Check for TTL Issues
TTL tests are timing-sensitive:
```typescript
// TTL should be within 1-2 seconds of expected
const ttl = await redis.ttl(key);
const expectedTtl = 86400 * 7;

expect(ttl).toBeGreaterThanOrEqual(expectedTtl - 2);
expect(ttl).toBeLessThanOrEqual(expectedTtl);
```

---

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Idempotency Tests
  run: pnpm vitest run src/__tests__/idempotency.test.ts

- name: Check TypeScript Strict Mode
  run: pnpm tsc --noEmit
```

### Pre-commit Hook
```bash
#!/bin/bash
pnpm vitest run src/__tests__/idempotency.test.ts --reporter=verbose
if [ $? -ne 0 ]; then
  echo "Idempotency tests failed!"
  exit 1
fi
```

---

## Common Issues & Solutions

### Vitest CLI Not Found
```bash
# Use pnpm to run vitest
pnpm vitest run src/__tests__/idempotency.test.ts

# Or npx
npx vitest run src/__tests__/idempotency.test.ts
```

### TypeScript Errors
Tests require Node.js types. Ensure `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "strict": true
  }
}
```

### Tests Timeout
Mocks are fast, tests should complete in ~100ms. If timeout:
1. Check for infinite loops in mock methods
2. Verify `beforeEach`/`afterEach` cleanup
3. Look for sync operations that should be async

---

## Files Overview

| File | Purpose |
|------|---------|
| `idempotency.test.ts` | Main test suite (42 tests, 1183 lines) |
| `IDEMPOTENCY_TEST_SUMMARY.md` | Detailed test documentation |
| `TEST_GUIDE.md` | This quick reference guide |
| `run-tests.js` | Validation script (no Vitest needed) |

---

## Next Steps

1. **Run Tests**: `pnpm vitest run src/__tests__/idempotency.test.ts`
2. **Review Results**: All 42 tests should pass
3. **Integrate to CI**: Add to GitHub Actions or similar
4. **Add to Codebase**: Commit to version control
5. **Monitor**: Re-run tests after changes to Wave 2 code

---

## Questions?

For issues or questions about:
- **Webhook idempotency**: See `src/lib/webhooks/idempotencyManager.ts`
- **Referral system**: See `src/lib/referrals.ts`
- **Session management**: See `src/app/api/auth/`
- **Architecture decisions**: See `.memory/ADRS.md`

---

## Last Updated
2026-07-11 - Initial comprehensive test suite
