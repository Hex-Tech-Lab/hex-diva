# Payment Provider Architecture v2 (Contract-Based, Modular, Multi-Provider)

**Status**: Planned architecture — design phase, no code has shipped yet  
**Context**: Egyptian founder, no corporate registration, individual payment accounts  
**Goal**: Provider-agnostic, settings-driven, with fallback chain

---

## Overview

Replace hardcoded Stripe with **pluggable payment providers** running in tandem with automatic fallback.

### Providers (Modular Stack)

| Provider | Best For | Egypt Support | Setup Complexity | Status |
|---|---|---|---|---|
| **Paddle** | Digital products, global reach, individual-friendly | ✅ Yes | Low | Primary |
| **Paymob** | Egyptian merchants, local optimization | ✅ Yes (Egyptian) | Medium | Secondary |
| **Flutterwave** | Pan-African, good fallback | ✅ Yes | Medium | Tertiary |
| **2Checkout** | Global backup, high uptime | ✅ Yes | Medium | Quaternary |

---

## Contract-Based Architecture

### 1. Provider Contract Interface (Input/Output)

**File**: `src/lib/contracts/payment-provider.ts`

```typescript
/**
 * PaymentProvider Contract
 * Defines the interface each payment provider MUST implement
 * Input → Provider Implementation → Output (1:1 guaranteed)
 */

// INPUT: Checkout Request
interface CheckoutSessionRequest {
  // Shopify Product/LineItem alignment
  lineItems: {
    productHandle: string;        // Shopify: Product.handle
    productTitle: string;         // Shopify: Product.title
    quantity: number;             // Shopify: LineItem.quantity
    price: number;               // Shopify: ProductVariant.price (in EGP)
    currencyCode: 'EGP' | 'USD';  // Shopify: Money.currencyCode
  }[];
  
  subtotal: number;              // Sum of (price × quantity)
  shipping: number;              // Shipping cost in currency
  tax: number;                   // Tax amount in currency
  total: number;                 // subtotal + shipping + tax
  currencyCode: 'EGP' | 'USD';
  
  customer: {
    email: string;
    name: string;
    userId: string;              // Our internal user ID
  };
  
  metadata: {
    orderId?: string;            // Our order ID (for reconciliation)
    referrerId?: string;         // Referral tracking
    tier?: 'b2c' | 'b2b_bronze' | 'b2b_silver' | 'b2b_gold';
  };
  
  returnUrl: string;             // Where to redirect on success
  cancelUrl: string;             // Where to redirect on cancel
  
  // Set by PaymentProviderSelector before the provider is called — see
  // "Idempotency & State Management" below. Providers MUST pass this
  // through to their own idempotency mechanism (for Stripe, as the second
  // argument to `stripe.checkout.sessions.create`).
  idempotencyKey: string;
}

// OUTPUT: Checkout Session (Canonical Format)
interface PaymentCheckoutSession {
  // Provider-agnostic session ID (our internal ID for this session)
  sessionId: string;             // Unique session key
  providerId: 'paddle' | 'paymob' | 'flutterwave' | '2checkout';
  
  // Checkout URL to redirect user to. Must be validated as https: before
  // being returned to any client (see "Checkout URL Validation" below).
  checkoutUrl: string;           // Full URL to provider's checkout
  
  // Session metadata for reconciliation
  metadata: {
    createdAt: string;           // ISO8601, e.g. "2026-07-19T14:23:00.000Z"
    expiresAt: string;           // ISO8601, e.g. "2026-07-20T14:23:00.000Z"
    status: 'pending' | 'completed' | 'expired';
  };
  
  // External provider's session ID, required for webhook/status tracking
  providerSessionId: string;
  
  // Total verified by provider (must match request.total)
  confirmedTotal: number;
  confirmedCurrency: string;
  
  // Client reference for idempotency
  idempotencyKey: string;        // UUID, used to prevent duplicates
}

// WEBHOOK: Payment Event (Provider → Us)
interface PaymentWebhookEvent {
  eventId: string;               // Unique provider event ID (for dedup)
  eventType: 'checkout.completed' | 'checkout.failed' | 'payment.refunded' | 'charge.disputed';
  providerId: 'paddle' | 'paymob' | 'flutterwave' | '2checkout';
  
  // Link to original session
  checkoutSessionId: string;     // Our session ID
  
  // Payment details
  payment: {
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'pending' | 'cancelled';
    transactionId: string;       // Provider's transaction ID
    timestamp: string;           // ISO8601, e.g. "2026-07-19T14:23:00.000Z"
  };
  
  // Customer reference
  customerId: string;            // Provider's customer ID (for receipts)
  
  // Idempotency
  idempotencyKey: string;        // Must match checkout request
}

// PROVIDER INTERFACE
interface IPaymentProvider {
  // Name and metadata
  name: 'paddle' | 'paymob' | 'flutterwave' | '2checkout';
  isAvailable: () => boolean;    // Check if provider is configured
  
  // Core operations
  createCheckoutSession(request: CheckoutSessionRequest): Promise<PaymentCheckoutSession>;
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
  handleWebhookEvent(event: PaymentWebhookEvent): Promise<void>;
  
  // Status/reconciliation
  getSessionStatus(sessionId: string): Promise<'pending' | 'completed' | 'expired'>;
  listTransactions(userId: string, limit?: number): Promise<PaymentWebhookEvent[]>;
  
  // Refunds/disputes
  refundTransaction(transactionId: string, reason: string): Promise<{ success: boolean }>;
  disputeTransaction(transactionId: string, reason: string): Promise<{ success: boolean }>;
}

// PROVIDER CONFIGURATION (Settings-driven)
interface PaymentProviderConfig {
  // Paddle config
  paddle?: {
    apiKey: string;              // Paddle API key
    clientToken: string;         // Paddle Client token
    enabled: boolean;
    priority: number;            // 1 = primary, 2 = secondary, etc.
    fallbackOn: string[];        // ['timeout', 'rate_limit', 'server_error']
  };
  
  // Paymob config
  paymob?: {
    apiKey: string;
    publicKey: string;
    enabled: boolean;
    priority: number;
    fallbackOn: string[];
  };
  
  // Flutterwave config
  flutterwave?: {
    publicKey: string;
    secretKey: string;
    enabled: boolean;
    priority: number;
    fallbackOn: string[];
  };
  
  // 2Checkout config
  '2checkout'?: {
    apiKey: string;
    secretKey: string;
    enabled: boolean;
    priority: number;
    fallbackOn: string[];
  };
}
```

The `'2checkout'` key matches the `IPaymentProvider.name` union member exactly
(`'paddle' | 'paymob' | 'flutterwave' | '2checkout'`), so `shouldFallback` can
look up fallback conditions via `this.config[provider.name]` without a
translation step.

---

### 2. Provider Selector (Tandem + Fallback)

**File**: `src/lib/payment/provider-selector.ts`

The chain is built asynchronously (it reads provider health/config), so
`buildProviderChain()` must never run un-awaited inside the constructor —
otherwise `createCheckoutSession()` could execute before the chain is
populated. Instead, expose a static async factory that returns a fully
initialized instance:

```typescript
class PaymentProviderSelector {
  private providers: Map<string, IPaymentProvider> = new Map();
  private config: PaymentProviderConfig;
  private providerChain: IPaymentProvider[] = [];  // Ordered by priority
  private chainBuiltAt: number = 0;
  private static readonly CHAIN_TTL_MS = 30_000;   // See "Provider-chain cache" below
  private healthStatusCache: Map<string, 'healthy' | 'degraded' | 'down' | 'unknown'> = new Map();
  
  private constructor(config: PaymentProviderConfig) {
    this.config = config;
  }
  
  /**
   * Static async factory — the only supported way to construct a selector.
   * Guarantees the provider chain is populated before use.
   */
  static async create(config: PaymentProviderConfig): Promise<PaymentProviderSelector> {
    const selector = new PaymentProviderSelector(config);
    await selector.initializeProviders();
    await selector.buildProviderChain();
    return selector;
  }
  
  /**
   * Execute checkout across provider chain with fallback
   * INPUT: CheckoutSessionRequest
   * OUTPUT: PaymentCheckoutSession
   * GUARANTEE: 1:1 mapping, deterministic
   */
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<PaymentCheckoutSession> {
    // Refresh the chain if the TTL has expired, so admin changes to
    // is_enabled/priority take effect without a redeploy.
    await this.refreshChainIfStale();
    
    const idempotencyKey = request.metadata.orderId || crypto.randomUUID();
    
    for (const provider of this.providerChain) {
      try {
        const session = await provider.createCheckoutSession({ ...request, idempotencyKey });
        
        // Verify output contract
        this.validateCheckoutSession(session, request);
        
        // Log provider used (for debugging/analytics)
        console.log(`[Payment] ${provider.name} created session ${session.sessionId}`);
        
        return session;
      } catch (error) {
        const normalized = this.normalizeError(error);
        
        if (this.isIndeterminate(normalized)) {
          // Payment status is unknown (e.g. timeout) — it may have gone
          // through on the provider's side. Persist the attempt and
          // reconcile BEFORE falling back, to avoid double-charging.
          await this.persistIndeterminateAttempt(idempotencyKey, provider, normalized);
          const charge = await this.reconcile(idempotencyKey, provider);
          if (charge) {
            // A real charge/session exists — do not retry with another
            // provider. Surface it to the caller instead of double-charging.
            return this.mapReconciledChargeToCanonical(charge);
          }
          // No charge found — safe to fall back.
        }
        
        const shouldFallback = this.shouldFallback(normalized, provider);
        if (!shouldFallback) throw normalized;
        
        console.warn(
          `[Payment] ${provider.name} failed, trying next provider: ${normalized.message}`
        );
        continue;
      }
    }
    
    throw new Error('All payment providers failed. No fallback available.');
  }
  
  /**
   * Verify CheckoutSessionRequest → PaymentCheckoutSession contract
   */
  private validateCheckoutSession(
    session: PaymentCheckoutSession,
    request: CheckoutSessionRequest
  ): void {
    // Total MUST match (within 1 unit for rounding)
    if (Math.abs(session.confirmedTotal - request.total) > 1) {
      throw new Error(
        `Total mismatch: requested ${request.total}, got ${session.confirmedTotal}`
      );
    }
    
    // Currency MUST match
    if (session.confirmedCurrency !== request.currencyCode) {
      throw new Error(
        `Currency mismatch: requested ${request.currencyCode}, got ${session.confirmedCurrency}`
      );
    }
    
    // Session MUST have a checkout URL, and it MUST be https (see "Checkout
    // URL Validation" below — this delegates to that shared check).
    this.assertSecureCheckoutUrl(session.checkoutUrl);
    
    // Session MUST have a provider session ID
    if (!session.providerSessionId) {
      throw new Error('Missing provider session ID');
    }
  }
  
  /**
   * Parse and validate that a checkout URL is well-formed and https-only.
   * Rejects malformed, insecure, or non-HTTPS URLs before they ever reach
   * the client, while preserving the existing invalid-URL error.
   */
  private assertSecureCheckoutUrl(checkoutUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(checkoutUrl);
    } catch {
      throw new Error('Invalid checkout URL from provider');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Invalid checkout URL from provider');
    }
  }
  
  /**
   * Normalize an unknown caught value into an Error before reading
   * `.message`. Provider SDKs and network layers can throw strings,
   * plain objects, or other non-Error values.
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);
    return new Error('Unknown payment provider error', { cause: error });
  }
  
  /**
   * True when the failure means "payment status is unknown" (for example a
   * timeout) rather than a definitive decline. Definitive failures (card
   * declined, invalid card) can fall back immediately.
   */
  private isIndeterminate(error: Error): boolean {
    return error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
  }
  
  /**
   * Determine if error warrants fallback
   */
  private shouldFallback(error: Error, provider: IPaymentProvider): boolean {
    const fallbackConditions = this.config[provider.name]?.fallbackOn || [];
    
    if (error.message.includes('timeout')) return fallbackConditions.includes('timeout');
    if (error.message.includes('rate limit')) return fallbackConditions.includes('rate_limit');
    if (error.message.includes('500')) return fallbackConditions.includes('server_error');
    
    return false;  // By default, don't fallback (fail fast)
  }
  
  /**
   * Build ordered provider chain based on enabled status, health, and
   * priority. Excludes providers whose health_status is 'down' in addition
   * to the existing enabled/priority/isAvailable checks.
   */
  private async buildProviderChain(): Promise<void> {
    const candidates = Array.from(this.providers.values())
      .filter(p => p.isAvailable())
      .filter(p => this.getHealthStatus(p) !== 'down');
    
    candidates.sort((a, b) => {
      const aPriority = this.config[a.name]?.priority ?? 999;
      const bPriority = this.config[b.name]?.priority ?? 999;
      return aPriority - bPriority;
    });
    
    this.providerChain = candidates;
    this.chainBuiltAt = Date.now();
  }
  
  /**
   * Reload the provider chain if the cached copy has exceeded its TTL, or
   * if an admin write invalidated it explicitly. See "Provider-Chain Cache
   * Invalidation" below.
   */
  private async refreshChainIfStale(): Promise<void> {
    if (Date.now() - this.chainBuiltAt > PaymentProviderSelector.CHAIN_TTL_MS) {
      await this.buildProviderChain();
    }
  }
  
  /**
   * Instantiate every configured provider (Paddle, Paymob, Flutterwave,
   * 2Checkout) from `this.config` and populate `this.providers`. Runs once,
   * awaited from `create()`, before the chain is built.
   */
  private async initializeProviders(): Promise<void> {
    for (const [name, providerConfig] of Object.entries(this.config)) {
      if (!providerConfig) continue;
      this.providers.set(name, instantiateProvider(name, providerConfig));
    }
  }
  
  /**
   * Look up the most recently recorded health_status for a provider
   * (populated by the background health-check job described later in this
   * document). Returns 'unknown' if no check has run yet.
   */
  private getHealthStatus(provider: IPaymentProvider): 'healthy' | 'degraded' | 'down' | 'unknown' {
    return this.healthStatusCache.get(provider.name) ?? 'unknown';
  }
  
  /**
   * Record an attempt whose payment outcome is unknown (timeout, etc.) so
   * it can be reconciled against the provider before we risk a duplicate
   * charge by falling back.
   */
  private async persistIndeterminateAttempt(
    idempotencyKey: string,
    provider: IPaymentProvider,
    error: Error
  ): Promise<void> {
    // INSERT into payment_sessions with status = 'indeterminate',
    // recording provider, idempotencyKey, and error.message for audit.
  }
  
  /**
   * Ask the provider directly whether a charge/session exists for this
   * idempotency key. Only proceed to fallback once this returns null.
   */
  private async reconcile(
    idempotencyKey: string,
    provider: IPaymentProvider
  ): Promise<PaymentCheckoutSession | null> {
    return provider.getSessionStatus
      ? await this.lookUpConfirmedCharge(idempotencyKey, provider)
      : null;
  }
}
```

---

### 3. Settings Schema (Configuration Page)

**File**: `src/lib/contracts/payment-settings.ts`

```typescript
interface PaymentSettings {
  // Global settings
  storeTitle: string;            // "GlamD" (appears in receipts)
  supportEmail: string;          // contact@glamd.com
  defaultCurrency: 'EGP' | 'USD'; // Primary currency
  
  // Webhook signing key (for all providers)
  webhookSecret: string;         // Shared secret, rotated monthly
  
  // Provider configurations (settings page form)
  providers: {
    paddle: {
      enabled: boolean;
      apiKey: string;            // Encrypted at rest
      clientToken: string;        // Encrypted at rest
      priority: 1;               // 1 = primary
      fallbackOn: ['timeout', 'rate_limit', 'server_error'];
      testMode: boolean;         // Use sandbox?
    };
    paymob: {
      enabled: boolean;
      apiKey: string;            // Encrypted
      publicKey: string;         // Public (safe)
      priority: 2;               // 2 = secondary
      fallbackOn: ['timeout', 'server_error'];
      testMode: boolean;
    };
    flutterwave: {
      enabled: boolean;
      publicKey: string;
      secretKey: string;         // Encrypted
      priority: 3;               // 3 = tertiary
      fallbackOn: ['timeout', 'server_error'];
      testMode: boolean;
    };
    '2checkout': {
      enabled: boolean;
      apiKey: string;            // Encrypted
      secretKey: string;         // Encrypted
      priority: 4;               // 4 = quaternary
      fallbackOn: ['server_error'];
      testMode: boolean;
    };
  };
  
  // Feature flags
  features: {
    enableRefunds: boolean;      // Allow refunds via dashboard
    enableDisputes: boolean;     // Handle chargebacks
    enableRecurring: boolean;    // Subscription billing (future)
  };
}
```

---

## Implementation Phases

### Phase 1: Contract & Abstraction (Wave 6 Redesign)

- [ ] Define `PaymentProvider` interface
- [ ] Create `PaymentProviderSelector` with fallback chain
- [ ] Implement settings schema + encryption for secrets
- [ ] Replace hardcoded Stripe with provider abstraction

### Phase 2: Paddle Implementation (Primary Provider)

- [ ] Implement `PaddleProvider extends IPaymentProvider`
- [ ] Wire checkout session creation
- [ ] Implement webhook handler
- [ ] Test with real transactions

### Phase 3: Paymob Implementation (Secondary, Egypt-optimized)

- [ ] Implement `PaymobProvider extends IPaymentProvider`
- [ ] Optimize for Egyptian customers
- [ ] Fallback chain testing

### Phase 4: Flutterwave & 2Checkout (Tertiary/Quaternary)

- [ ] Implement remaining providers
- [ ] Cross-provider testing
- [ ] Load balancing / health checks

### Phase 5: Settings UI

- [ ] Admin dashboard for provider config
- [ ] Secret encryption/rotation
- [ ] Health status per provider
- [ ] Fallback chain visualization

---

## Idempotency & State Management

### Checkout Idempotency Key

```typescript
// Every checkout request includes an idempotencyKey
// If request retries, use same key → same session
// Provider must return same session for same key

checkoutRequest.metadata.orderId || crypto.randomUUID()
// = idempotency key used across ALL providers
```

### Webhook Idempotency

```typescript
// Every webhook event has eventId from provider
// Process webhook only once per eventId
// Use database dedup check:

SELECT COUNT(*) FROM payment_events 
WHERE provider_event_id = $1 AND provider_id = $2;

// If exists, skip (already processed)
```

---

## Database Schema (Settings-driven)

```sql
CREATE TABLE payment_providers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (name IN ('paddle', 'paymob', 'flutterwave', '2checkout')),
  enabled BOOLEAN DEFAULT false,
  priority INT NOT NULL DEFAULT 999,
  config JSONB NOT NULL,  -- Encrypted at rest (pgcrypto)
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
  last_health_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_sessions (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  provider_id TEXT NOT NULL,
  provider_session_id TEXT NOT NULL UNIQUE,
  checkout_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired')),
  total_amount DECIMAL(12, 2) NOT NULL,
  currency_code TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,  -- Dedupes webhook deliveries
  event_type TEXT NOT NULL,
  session_id UUID REFERENCES payment_sessions(id),
  payment_status TEXT NOT NULL,
  transaction_id TEXT NOT NULL,  -- NOT unique: a transaction has multiple
                                  -- lifecycle events (created, succeeded,
                                  -- failed, refunded), so uniqueness lives
                                  -- on provider_event_id instead.
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

`buildProviderChain()` (see the selector above) filters this table on both
`enabled = true` and `health_status != 'down'` — a provider that is enabled
but currently down is still excluded from the chain.

### Key Management Boundary

`payment_providers.config` holds `webhook_secret` and other provider
credentials. `is_encrypted = true` is a status flag, not the enforcement
mechanism itself: the actual enforcement is that `config` (and any nested
`webhook_secret`) is encrypted at rest via Supabase Vault / `pgsodium`, and
is decrypted only inside the server-side provider adapter that needs it at
call time. It is never returned by admin API responses, never logged, and
never sent to the client. Admin dashboard reads of `payment_providers` must
project every column except `config`.

---

## API Route Changes

### Before (Hardcoded Stripe)

```typescript
POST /api/checkout
  → Stripe only
  → Fails if Stripe down
```

### After (Contract-based Multi-Provider)

```typescript
POST /api/checkout
  → PaymentProviderSelector.createCheckoutSession()
    → Try Paddle
      → Fallback to Paymob
        → Fallback to Flutterwave
          → Fallback to 2Checkout
            → Fail with all providers exhausted
  → Returns generic PaymentCheckoutSession
  → Webhook handler agnostic to provider
```

---

## Testing Strategy

### Unit Tests

- Contract validation (input/output)
- Provider selector fallback logic
- Idempotency key handling

### Integration Tests

- Paddle sandbox checkout
- Paymob test API
- Webhook verification per provider
- Fallback chain execution

### End-to-End Tests

- Full checkout → payment → order flow
- Webhook delivery and processing
- Refund/dispute flows
- Multi-provider concurrency

---

## Security Considerations

### Secrets Management

- All API keys and `webhook_secret` values encrypted at rest via Supabase
  Vault / `pgsodium`, decrypted only inside the server-side provider
  adapter (see "Key Management Boundary" above)
- Webhook secrets rotated monthly, per provider
- No secrets in logs or error messages
- Settings page requires admin + 2FA
- Admin API responses and logs never include `config` or any decrypted
  secret field

### Webhook Security

Each provider has its **own** signing scheme and secret — there is no single
shared HMAC secret that works across providers. Verification must be
dispatched per provider:

- **Stripe** (if enabled, see the V2 doc): verifies the `stripe-signature`
  header against a Stripe-issued webhook secret using the Stripe SDK's own
  `constructEvent` helper — not a hand-rolled HMAC comparison.
- **Paddle**: HMAC-SHA256 over the raw request body using a Paddle-specific
  webhook secret, compared with `crypto.timingSafeEqual` (see the Paddle
  example below).
- **Paymob / Flutterwave / 2Checkout**: each has its own header name, hash
  algorithm, and provider-issued secret — implement `verifyWebhookSignature`
  per the `IPaymentProvider` contract using that provider's documented
  scheme rather than a shared one.
- Event ID deduplication (`payment_events.provider_event_id`, scoped by
  `provider_id`)
- Idempotency key validation
- Request timeout guards (5s max)

### Contract Enforcement

- Input validation (CheckoutSessionRequest schema)
- Output validation (PaymentCheckoutSession schema)
- Total verification (±1 unit tolerance)
- Currency alignment

---

## Example: Paddle Provider Implementation

**File**: `src/lib/payment/providers/paddle.ts`

```typescript
import { IPaymentProvider, CheckoutSessionRequest, PaymentCheckoutSession } from '@/lib/contracts/payment-provider';

export class PaddleProvider implements IPaymentProvider {
  name = 'paddle';
  
  constructor(private config: PaddleConfig) {}
  
  isAvailable(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }
  
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<PaymentCheckoutSession> {
    // 1. Validate input contract
    validateCheckoutSessionRequest(request);
    
    // 2. Transform to Paddle API format
    const paddleRequest = {
      items: request.lineItems.map(item => ({
        quantity: item.quantity,
        priceId: await this.getPriceId(item.productHandle),
      })),
      customer: {
        email: request.customer.email,
        name: request.customer.name,
      },
      customData: {
        userId: request.customer.userId,
        orderId: request.metadata.orderId,
        referrerId: request.metadata.referrerId,
      },
      returnUrl: request.returnUrl,
      cancelUrl: request.cancelUrl,
    };
    
    // 3. Create Paddle checkout session
    const paddle = new PaddleSDK(this.config.apiKey);
    const session = await paddle.checkouts.create(paddleRequest);
    
    // 4. Validate output contract
    if (!session.id || !session.checkoutUrl) {
      throw new Error('Invalid Paddle session response');
    }
    
    // 5. Return canonical format (matches the corrected PaymentCheckoutSession
    //    shape: one providerId, an explicit providerSessionId, and ISO8601
    //    strings for metadata timestamps)
    return {
      sessionId: session.id,
      providerId: 'paddle',
      checkoutUrl: session.checkoutUrl,
      metadata: {
        createdAt: new Date().toISOString(),        // ISO8601 string
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      },
      providerSessionId: session.id,   // Paddle's own session identifier
      confirmedTotal: request.total,   // Paddle confirms totals server-side
      confirmedCurrency: request.currencyCode,
      idempotencyKey: request.metadata.orderId || crypto.randomUUID(),
    };
  }
  
  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(hash, signature);
  }
  
  async handleWebhookEvent(event: PaymentWebhookEvent): Promise<void> {
    // Handle Paddle-specific webhook logic
    // Update order status, inventory, referral tracking, etc.
  }
}
```

---

## Migration Path

**This is a planned migration. No code from this document has shipped.**
The steps below describe the intended sequence, not completed work — nothing
here should be read as "done" until it has actually merged and deployed.

### Wave 6 (Current) → Wave 6.1 (Redesign)

1. ⏳ Define contracts (this document)
2. ⏳ Implement `PaymentProviderSelector`
3. ⏳ Encrypt settings in database
4. ⏳ Implement `PaddleProvider`
5. ⏳ Replace checkout API with selector
6. ⏳ Deploy with Paddle as primary; Stripe preserved as one provider,
   disabled by default (see the V2 doc for the superseding "Stripe
   preserved" framing — Stripe is not deleted under either design)

### Wave 6.2 (Paymob)

- Add Paymob to provider chain
- Test Egypt-specific flows

### Wave 6.3 (Flutterwave + 2Checkout)

- Complete provider stack
- Settings UI for configuration

---

## Advantages

✅ **No vendor lock-in**: Can swap providers anytime  
✅ **Egypt-optimized**: Paymob for local processing  
✅ **High availability**: Automatic fallback chain  
✅ **Settings-driven**: Change config without code deploy  
✅ **Type-safe contracts**: Input/output guaranteed  
✅ **Easy to test**: Mock any provider  
✅ **Auditable**: All provider decisions logged  

---

## Next Steps

1. Redesign Wave 6 checkout flow with `PaymentProviderSelector`
2. Wrap the existing Stripe checkout code (`src/lib/stripe/`) as one
   `IPaymentProvider` implementation, preserved but disabled by default —
   see the V2 doc, which supersedes this V1 doc's earlier "Stripe removed"
   framing
3. Implement Paddle as primary provider
4. Deploy with fallback-ready architecture
5. Iterate: add Paymob, Flutterwave, 2Checkout

This is a **planned architectural rewrite** of the payment system, not yet
implemented — not an incremental fix once it ships.
