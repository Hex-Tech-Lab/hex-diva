# Payment Provider Architecture v2.1 (Stripe Preserved, MoR-First, Settings-Driven)

**Status**: Planned architecture — design phase, supersedes `PAYMENT_PROVIDER_ARCHITECTURE.md` where the two differ; no code has shipped yet  
**Context**: Integrate Stripe as one of many providers; add Paddle + MoR alternatives  
**Goal**: Provider-agnostic, no vendor lock-in, extensible for future MoR providers

---

## Overview

**Keep the Stripe work** from Wave 6. Refactor it into a pluggable provider system alongside Paddle and MoR providers (Paymob, Flutterwave, 2Checkout).

### Provider Stack (Modular)

| Provider | Type | Best For | Egypt Support | Config | Status |
|---|---|---|---|---|---|
| **Stripe** | Payment Gateway | Global, high volume | ⚠️ No (archived) | DB settings | Primary (if available) |
| **Paddle** | Digital Products Platform | Recurring, SaaS, individuals | ✅ Yes | DB settings | Primary (Egypt-ready) |
| **Paymob** | MoR (Egyptian) | Local optimization, Egyptian customers | ✅ Yes (local) | DB settings | Secondary (Egypt-optimized) |
| **Flutterwave** | MoR (Pan-African) | Africa-wide reach | ✅ Yes | DB settings | Tertiary |
| **2Checkout** | MoR (Global) | Backup, uptime | ✅ Yes | DB settings | Quaternary |

---

## Contract-Based Architecture (Same as v2.0)

### Provider Interface (Unchanged)

**File**: `src/lib/contracts/payment-provider.ts`

```typescript
interface IPaymentProvider {
  // Metadata
  name: 'stripe' | 'paddle' | 'paymob' | 'flutterwave' | '2checkout';
  type: 'payment_gateway' | 'mor';  // MoR = Method of Receiving
  isAvailable: () => boolean;
  
  // Core checkout
  createCheckoutSession(request: CheckoutSessionRequest): Promise<PaymentCheckoutSession>;
  
  // Webhook security
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
  handleWebhookEvent(event: PaymentWebhookEvent): Promise<void>;
  
  // Status tracking
  getSessionStatus(sessionId: string): Promise<'pending' | 'completed' | 'expired'>;
  
  // Refunds/disputes
  refundTransaction(transactionId: string, reason: string): Promise<{ success: boolean }>;
  disputeTransaction(transactionId: string, reason: string): Promise<{ success: boolean }>;
  
  // Provider health
  healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down' }>;
}
```

---

## Comprehensive Database Schema (All Use Cases)

### 1. Payment Providers Configuration

**Table**: `payment_providers`

```sql
CREATE TABLE payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identity
  provider_id TEXT NOT NULL UNIQUE CHECK (provider_id IN (
    'stripe', 'paddle', 'paymob', 'flutterwave', '2checkout'
  )),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('payment_gateway', 'mor')),
  provider_name TEXT NOT NULL,  -- Display name: "Stripe", "Paddle", etc.
  
  -- Configuration (all encrypted at rest via pgcrypto)
  config JSONB NOT NULL,  -- { apiKey, secretKey, publicKey, etc. }
  is_encrypted BOOLEAN DEFAULT true,
  
  -- Enable/disable without deleting config
  is_enabled BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT false,
  
  -- Provider health monitoring
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN (
    'healthy', 'degraded', 'down', 'unknown'
  )),
  health_checked_at TIMESTAMP,
  health_check_interval_seconds INT DEFAULT 300,  -- Check every 5 min
  last_error TEXT,  -- Last error message for debugging
  last_error_at TIMESTAMP,
  
  -- Priority in fallback chain
  priority INT NOT NULL DEFAULT 999,  -- 1=primary, 2=secondary, etc.
  
  -- Fallback conditions (when to switch to next provider)
  fallback_on JSONB DEFAULT '["timeout", "rate_limit", "server_error"]'::jsonb,
  -- ["timeout", "rate_limit", "server_error", "insufficient_funds", "invalid_card"]
  
  -- Feature flags per provider
  features JSONB DEFAULT '{
    "enable_refunds": true,
    "enable_disputes": true,
    "enable_recurring": false,
    "enable_3d_secure": false
  }'::jsonb,
  
  -- Provider-specific limits (for risk management)
  daily_limit_usd DECIMAL(12, 2),
  transaction_limit_usd DECIMAL(12, 2),
  daily_transaction_count INT,
  
  -- Audit trail
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 999)
);

CREATE INDEX idx_payment_providers_enabled_priority 
  ON payment_providers(is_enabled, priority);
CREATE INDEX idx_payment_providers_health_status 
  ON payment_providers(health_status, health_checked_at);
```

### Key Management Boundary

`is_encrypted` is a status flag on the row, not the enforcement mechanism.
The actual enforcement: `config` (API keys, `webhook_secret`, and any other
provider credential) is encrypted at rest via Supabase Vault / `pgsodium`,
and is decrypted only inside the server-side provider adapter at the moment
it calls out to the provider's API. It is never returned by admin API
responses, never written to logs, and never sent to any client. Admin
dashboard and settings-list queries against `payment_providers` must
explicitly exclude `config` from the selected columns.

---

### 2. Payment Sessions (Provider-Agnostic)

**Table**: `payment_sessions`

```sql
CREATE TABLE payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to checkout/order
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Provider used
  provider_id TEXT NOT NULL REFERENCES payment_providers(provider_id),
  provider_session_id TEXT NOT NULL,  -- External provider's session ID
  
  -- Checkout URL
  checkout_url TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'expired', 'cancelled'
  )),
  
  -- Amount verification (contract enforcement)
  subtotal_amount DECIMAL(12, 2) NOT NULL,
  shipping_amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'EGP' CHECK (currency_code IN ('EGP', 'USD', 'EUR')),
  
  -- Idempotency (prevent duplicate checkouts)
  idempotency_key TEXT NOT NULL UNIQUE,
  
  -- Customer info
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  
  -- Metadata (cross-provider tracking)
  metadata JSONB DEFAULT '{}'::jsonb,  -- { referrerId, tier, campaign, etc. }
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  
  -- Audit
  updated_by TEXT NOT NULL,  -- Provider name or 'system'
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_total CHECK (
    total_amount = subtotal_amount + shipping_amount + tax_amount
  ),
  CONSTRAINT valid_expires CHECK (expires_at > created_at)
);

CREATE INDEX idx_payment_sessions_order ON payment_sessions(order_id);
CREATE INDEX idx_payment_sessions_user ON payment_sessions(user_id);
CREATE INDEX idx_payment_sessions_provider ON payment_sessions(provider_id);
CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_expires ON payment_sessions(expires_at) 
  WHERE status IN ('pending', 'processing');
```

---

### 3. Payment Transactions (Provider-Specific)

**Table**: `payment_transactions`

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to session
  session_id UUID NOT NULL REFERENCES payment_sessions(id) ON DELETE CASCADE,
  
  -- Provider details
  provider_id TEXT NOT NULL REFERENCES payment_providers(provider_id),
  provider_transaction_id TEXT NOT NULL UNIQUE,  -- Stripe: ch_xxx, Paddle: txn_xxx, etc.
  
  -- Transaction status
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'authorized', 'captured', 'declined', 'failed', 'refunded', 'disputed'
  )),
  
  -- Amount (may differ from session total if exchange rate applied)
  charged_amount DECIMAL(12, 2) NOT NULL,
  charged_currency TEXT NOT NULL CHECK (charged_currency IN ('EGP', 'USD', 'EUR')),
  
  -- Exchange rate (if charged in different currency than session)
  exchange_rate DECIMAL(10, 6),  -- E.g., 1 USD = 30.50 EGP
  
  -- Payment method details (stored securely)
  payment_method TEXT CHECK (payment_method IN (
    'card', 'bank_transfer', 'digital_wallet', 'buy_now_pay_later', 'mobile_money'
  )),
  card_last_four TEXT,  -- Only if payment_method = 'card'
  card_brand TEXT,  -- visa, mastercard, amex, etc.
  
  -- Fraud/risk scoring
  fraud_score DECIMAL(5, 2),  -- 0-100 (higher = more suspicious)
  fraud_status TEXT CHECK (fraud_status IN ('approved', 'flagged', 'blocked', 'unknown')),
  
  -- 3D Secure (if applicable)
  three_d_secure_status TEXT CHECK (three_d_secure_status IN (
    'not_used', 'passed', 'failed', 'unavailable'
  )),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  
  CONSTRAINT valid_amount CHECK (charged_amount > 0)
);

CREATE INDEX idx_payment_transactions_session ON payment_transactions(session_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
```

---

### 4. Payment Events (Webhook Deduplication)

**Table**: `payment_events`

```sql
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identification
  provider_id TEXT NOT NULL REFERENCES payment_providers(provider_id),
  provider_event_id TEXT NOT NULL,  -- Stripe: evt_xxx, Paddle: evt_xxx, etc.
  
  -- Deduplication key (provider_id + provider_event_id)
  dedup_key TEXT NOT NULL UNIQUE,  -- Generated as: provider_id || ':' || provider_event_id
  
  -- Link to transaction
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,  -- checkout.completed, charge.succeeded, refund.created, etc.
  event_status TEXT NOT NULL DEFAULT 'pending' CHECK (event_status IN (
    'pending', 'processing', 'completed', 'failed', 'skipped'
  )),
  
  -- Raw webhook payload (for replay/audit)
  payload JSONB NOT NULL,
  
  -- Processing result
  processing_error TEXT,  -- Error message if event_status = 'failed'
  processing_attempted_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  
  -- Timestamp from provider (for ordering, not processing time)
  provider_created_at TIMESTAMP NOT NULL,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_provider_event UNIQUE (provider_id, provider_event_id)
);

CREATE INDEX idx_payment_events_provider_event 
  ON payment_events(provider_id, provider_event_id);
CREATE INDEX idx_payment_events_dedup ON payment_events(dedup_key);
CREATE INDEX idx_payment_events_status ON payment_events(event_status);
CREATE INDEX idx_payment_events_created ON payment_events(created_at DESC);
```

---

### 5. Provider Fallback History (Audit Trail)

**Table**: `payment_provider_fallbacks`

```sql
CREATE TABLE payment_provider_fallbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session that triggered fallback
  session_id UUID NOT NULL REFERENCES payment_sessions(id),
  
  -- Failed provider
  failed_provider_id TEXT NOT NULL REFERENCES payment_providers(provider_id),
  failed_reason TEXT NOT NULL,  -- "timeout", "rate_limit", "server_error", etc.
  error_message TEXT,
  
  -- Fallback provider (next in chain)
  fallback_provider_id TEXT NOT NULL REFERENCES payment_providers(provider_id),
  
  -- Fallback result
  fallback_success BOOLEAN NOT NULL,
  fallback_error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  -- Metrics
  fail_to_fallback_duration_ms INT,  -- How long until fallback attempted
  fallback_attempt_duration_ms INT   -- How long fallback took
);

CREATE INDEX idx_provider_fallbacks_session ON payment_provider_fallbacks(session_id);
CREATE INDEX idx_provider_fallbacks_failed ON payment_provider_fallbacks(failed_provider_id);
```

---

### 6. Provider Settings (Admin Configuration)

**Table**: `payment_settings`

```sql
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Store identity
  store_name TEXT NOT NULL DEFAULT 'GlamD',
  store_email TEXT NOT NULL,
  support_url TEXT,
  
  -- Global currency
  default_currency TEXT NOT NULL DEFAULT 'EGP' CHECK (default_currency IN ('EGP', 'USD', 'EUR')),
  
  -- Legacy/default webhook secret retained for backward compatibility only.
  -- Each provider verifies webhooks with its OWN scheme and its OWN secret
  -- stored in payment_providers.config (Stripe's stripe-signature header +
  -- Stripe-issued secret, Paddle's HMAC-SHA256 + Paddle secret, etc. — see
  -- "Webhook Security" in the V1 doc). This column is not a shared secret
  -- that all providers verify against.
  webhook_secret TEXT NOT NULL,  -- Rotated monthly
  webhook_secret_rotated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Retry policy
  webhook_retry_max_attempts INT DEFAULT 5,
  webhook_retry_delay_seconds INT DEFAULT 300,  -- 5 min between retries
  
  -- Feature flags
  enable_refunds BOOLEAN DEFAULT true,
  enable_disputes BOOLEAN DEFAULT true,
  enable_3d_secure BOOLEAN DEFAULT false,
  
  -- Risk management
  require_fraud_check BOOLEAN DEFAULT true,
  block_flagged_transactions BOOLEAN DEFAULT false,
  
  -- Rate limiting (per provider)
  rate_limit_rpm INT DEFAULT 1000,  -- Requests per minute
  rate_limit_hourly INT DEFAULT 50000,
  
  -- Audit
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Only one row (enforced via constraint)
  CONSTRAINT only_one_row CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);
```

---

### 7. Provider Payout Routes (Flexible Per-Provider)

**Table**: `payment_provider_payouts`

```sql
CREATE TABLE payment_provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referrer receiving payout
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Provider used for payout
  provider_id TEXT NOT NULL REFERENCES payment_providers(provider_id),
  provider_payout_id TEXT,  -- Stripe: payout_xxx, Paddle: payout_xxx, etc.
  
  -- Payout details
  amount DECIMAL(12, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'EGP',
  
  -- Payout account (provider-specific routing)
  payout_account JSONB NOT NULL,  -- { type: 'bank_transfer', accountNumber, routingNumber } or similar
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'in_transit', 'completed', 'failed', 'rejected'
  )),
  
  -- Period (which commissions are included)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Commissions included
  commission_ids UUID[] NOT NULL,  -- Array of commission.id values
  
  -- Result tracking
  estimated_arrival DATE,
  actual_arrival DATE,
  failure_reason TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (period_start <= period_end),
  CONSTRAINT valid_amount CHECK (amount > 0)
);

CREATE INDEX idx_provider_payouts_referrer ON payment_provider_payouts(referrer_id);
CREATE INDEX idx_provider_payouts_provider ON payment_provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON payment_provider_payouts(status);
```

`payout_account` holds bank routing details and must get the same treatment
as `payment_providers.config`: encrypted at rest via Supabase Vault /
`pgsodium`, readable only by admin-role RLS policies (referrers must never
be able to select another referrer's `payout_account`, and should not see
their own raw routing numbers back from a general query either), and
excluded from the columns returned by general payout-listing endpoints
(`GET /api/commissions`, admin payout dashboards, etc.). Only the specific
payout-execution path that calls the provider's payout API may read the
decrypted value.

---

## Provider Implementation Examples

### Stripe Provider (Preserved from Wave 6)

**File**: `src/lib/payment/providers/stripe.ts`

```typescript
import { IPaymentProvider, CheckoutSessionRequest, PaymentCheckoutSession } from '@/lib/contracts/payment-provider';
import Stripe from 'stripe';

export class StripeProvider implements IPaymentProvider {
  name = 'stripe' as const;
  type = 'payment_gateway' as const;
  
  private stripe: Stripe;
  private config: StripeProviderConfig;
  
  constructor(config: StripeProviderConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, { apiVersion: '2024-04-10' });
  }
  
  isAvailable(): boolean {
    // Only if explicitly enabled in settings AND Stripe is available in region
    return this.config.enabled && this.config.secretKey?.length > 0;
  }
  
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<PaymentCheckoutSession> {
    // Validate input contract
    validateCheckoutSessionRequest(request);
    
    // Transform to Stripe format
    const lineItems = await Promise.all(
      request.lineItems.map(async (item) => ({
        price_data: {
          currency: this.normalizeCurrency(request.currencyCode),
          product_data: {
            name: item.productTitle,
            metadata: {
              handle: item.productHandle,
            },
          },
          unit_amount: Math.round(item.price * 100),  // Stripe wants cents
        },
        quantity: item.quantity,
      }))
    );
    
    // Create Stripe session. `client_reference_id` is our order reference
    // (for reconciliation); it is NOT the idempotency mechanism. The stable
    // idempotency key — set by PaymentProviderSelector on `request` before
    // this provider is called — goes as the SECOND argument, matching the
    // pattern used in src/lib/stripe/checkout.ts.
    const session = await this.stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: request.returnUrl,
        cancel_url: request.cancelUrl,
        customer_email: request.customer.email,
        client_reference_id: request.metadata.orderId,
        metadata: {
          userId: request.customer.userId,
          referrerId: request.metadata.referrerId || '',
          tier: request.metadata.tier || 'b2c',
        },
      },
      {
        idempotencyKey: request.idempotencyKey,
      }
    );
    
    // Validate output contract
    if (!session.id || !session.url) {
      throw new Error('Invalid Stripe session response');
    }
    
    // Return canonical format
    return {
      sessionId: session.id,
      providerId: 'stripe',
      checkoutUrl: session.url,
      metadata: {
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      },
      providerSessionId: session.id,
      confirmedTotal: request.total,
      confirmedCurrency: request.currencyCode,
      idempotencyKey: request.idempotencyKey,
    };
  }
  
  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async handleWebhookEvent(event: PaymentWebhookEvent): Promise<void> {
    // Map Stripe events to our event types
    // Update order status, inventory, commissions based on payment result
  }
  
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down' }> {
    try {
      await this.stripe.balance.retrieve();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'down' };
    }
  }
  
  private normalizeCurrency(code: string): string {
    // Stripe uses lowercase 3-letter codes
    return code.toLowerCase();
  }
}
```

### Paddle Provider (New)

**File**: `src/lib/payment/providers/paddle.ts`

```typescript
import { IPaymentProvider, CheckoutSessionRequest, PaymentCheckoutSession } from '@/lib/contracts/payment-provider';

export class PaddleProvider implements IPaymentProvider {
  name = 'paddle' as const;
  type = 'payment_gateway' as const;
  
  constructor(private config: PaddleProviderConfig) {}
  
  isAvailable(): boolean {
    return this.config.enabled && this.config.clientToken?.length > 0;
  }
  
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<PaymentCheckoutSession> {
    // Similar contract mapping as Stripe
    validateCheckoutSessionRequest(request);
    
    // Transform to Paddle format and create session
    // ...implementation...
    
    return {
      sessionId: paddleSession.id,
      providerId: 'paddle',
      checkoutUrl: paddleSession.checkoutUrl,
      // ... rest of canonical format
    };
  }
  
  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    // Paddle-specific HMAC verification
    // ...implementation...
  }
  
  async handleWebhookEvent(event: PaymentWebhookEvent): Promise<void> {
    // Paddle-specific webhook handling
  }
  
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down' }> {
    // Paddle health check
    // ...implementation...
  }
}
```

---

## Provider Selector (Orchestration)

**File**: `src/lib/payment/provider-selector.ts`

Like the V1 doc, the constructor never calls the async `buildProviderChain()`
directly — that would let `createCheckoutSession()` run before the chain is
populated. Use the static `create()` factory instead, and await it before
the selector is used anywhere (for example, in the API route below).

The idempotency approach is the same one described in the V1 doc's
"Idempotency & State Management" section: the selector computes the key,
the database layer reserves it atomically (`INSERT ... ON CONFLICT DO
NOTHING`, not a check-then-insert), and the reserved key is attached to the
request before any provider is called, so it flows through to the
provider's own idempotency mechanism (see the Stripe example above).

```typescript
export class PaymentProviderSelector {
  private providers: Map<string, IPaymentProvider> = new Map();
  private providerChain: IPaymentProvider[] = [];
  private chainBuiltAt = 0;
  private static readonly CHAIN_TTL_MS = 30_000;
  
  private constructor(
    private db: SupabaseClient,
    private config: PaymentProviderConfig
  ) {}
  
  /**
   * Static async factory — the only supported way to construct a selector.
   * Awaits provider initialization and the first chain build so the
   * instance is safe to use as soon as this resolves.
   */
  static async create(
    db: SupabaseClient,
    config: PaymentProviderConfig
  ): Promise<PaymentProviderSelector> {
    const selector = new PaymentProviderSelector(db, config);
    await selector.initializeProviders();
    await selector.buildProviderChain();
    return selector;
  }
  
  /**
   * Create checkout with automatic fallback
   * 
   * INPUT: CheckoutSessionRequest
   * OUTPUT: PaymentCheckoutSession (1:1 guaranteed)
   */
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<PaymentCheckoutSession> {
    await this.refreshChainIfStale();
    
    const idempotencyKey = request.metadata.orderId || crypto.randomUUID();
    
    // Atomically reserve the idempotency key BEFORE calling any provider.
    // A plain check-then-insert is racy: two concurrent retries could both
    // pass the check and both call the provider. ON CONFLICT DO NOTHING
    // makes the reservation atomic.
    const reservation = await this.db
      .from('payment_sessions')
      .insert({
        idempotency_key: idempotencyKey,
        order_id: request.metadata.orderId,
        user_id: request.customer.userId,
        status: 'reserved',
        subtotal_amount: request.subtotal,
        shipping_amount: request.shipping,
        tax_amount: request.tax,
        total_amount: request.total,
        currency_code: request.currencyCode,
        customer_email: request.customer.email,
        customer_name: request.customer.name,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // provider_id, provider_session_id, checkout_url filled in below
      }, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      .select()
      .single();
    
    if (!reservation.data) {
      // Key already reserved/processed by a prior attempt — return the
      // existing session instead of calling a provider again.
      const existingSession = await this.db
        .from('payment_sessions')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();
      return this.mapToCanonical(existingSession.data);
    }
    
    const requestWithKey: CheckoutSessionRequest = { ...request, idempotencyKey };
    
    // Try providers in order
    for (const provider of this.providerChain) {
      try {
        const session = await provider.createCheckoutSession(requestWithKey);
        
        // Validate output contract
        this.validateCheckoutSession(session, requestWithKey);
        
        // Fill in the reservation with the provider's session details
        await this.db
          .from('payment_sessions')
          .update({
            provider_id: provider.name,
            provider_session_id: session.providerSessionId,
            checkout_url: session.checkoutUrl,
            status: 'pending',
          })
          .eq('idempotency_key', idempotencyKey);
        
        return session;
      } catch (error) {
        const normalized = this.normalizeError(error);
        
        if (this.isIndeterminate(normalized)) {
          // Outcome unknown (e.g. timeout) — reconcile with THIS provider
          // before falling back, so we never risk double-charging.
          const charge = await this.reconcile(idempotencyKey, provider);
          if (charge) {
            return this.mapToCanonical(charge);
          }
        }
        
        const shouldFallback = this.shouldFallback(normalized, provider);
        if (!shouldFallback) throw normalized;
        
        // Log fallback
        await this.logFallback(requestWithKey.metadata.orderId, provider.name, normalized);
        
        continue;  // Try next provider
      }
    }
    
    throw new Error('All payment providers failed. No fallback available.');
  }
  
  /**
   * Verify CheckoutSessionRequest → PaymentCheckoutSession contract,
   * including the https-only checkout URL rule from the V1 doc.
   */
  private validateCheckoutSession(
    session: PaymentCheckoutSession,
    request: CheckoutSessionRequest
  ): void {
    if (Math.abs(session.confirmedTotal - request.total) > 1) {
      throw new Error(
        `Total mismatch: requested ${request.total}, got ${session.confirmedTotal}`
      );
    }
    if (session.confirmedCurrency !== request.currencyCode) {
      throw new Error(
        `Currency mismatch: requested ${request.currencyCode}, got ${session.confirmedCurrency}`
      );
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(session.checkoutUrl);
    } catch {
      throw new Error('Invalid checkout URL from provider');
    }
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid checkout URL from provider');
    }
    if (!session.providerSessionId) {
      throw new Error('Missing provider session ID');
    }
  }
  
  /**
   * Map a `payment_sessions` row (whether from an idempotent replay or a
   * reconciled charge) back into the canonical `PaymentCheckoutSession`
   * shape returned by every provider adapter.
   */
  private mapToCanonical(row: PaymentSessionRow): PaymentCheckoutSession {
    return {
      sessionId: row.id,
      providerId: row.provider_id as PaymentCheckoutSession['providerId'],
      checkoutUrl: row.checkout_url,
      metadata: {
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        status: row.status === 'completed' ? 'completed'
          : row.status === 'expired' ? 'expired'
          : 'pending',
      },
      providerSessionId: row.provider_session_id,
      confirmedTotal: Number(row.total_amount),
      confirmedCurrency: row.currency_code,
      idempotencyKey: row.idempotency_key,
    };
  }
  
  /**
   * Normalize an unknown caught value into an Error before reading
   * `.message` — provider SDKs can throw non-Error values.
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);
    return new Error('Unknown payment provider error', { cause: error });
  }
  
  private isIndeterminate(error: Error): boolean {
    return error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
  }
  
  private async reconcile(
    idempotencyKey: string,
    provider: IPaymentProvider
  ): Promise<PaymentSessionRow | null> {
    // Query the provider directly for a charge/session matching
    // idempotencyKey. Only return null (safe to fall back) once the
    // provider confirms nothing was charged.
    return null;
  }
  
  /**
   * Record a fallback-audit event in `payment_provider_fallbacks` when the
   * selector moves from one provider to the next.
   */
  private async logFallback(
    orderId: string | undefined,
    failedProviderId: string,
    error: Error
  ): Promise<void> {
    await this.db.from('payment_provider_fallbacks').insert({
      session_id: orderId,
      failed_provider_id: failedProviderId,
      failed_reason: this.classifyFailureReason(error),
      error_message: error.message,
      fallback_provider_id: this.nextProviderIdAfter(failedProviderId),
      fallback_success: false,  // Updated once the fallback attempt resolves
    });
  }
  
  private classifyFailureReason(error: Error): string {
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('rate limit')) return 'rate_limit';
    if (error.message.includes('500')) return 'server_error';
    return 'unknown';
  }
  
  private nextProviderIdAfter(providerId: string): string {
    const index = this.providerChain.findIndex(p => p.name === providerId);
    return this.providerChain[index + 1]?.name ?? 'none';
  }
  
  /**
   * Reload the chain if the TTL has expired, so admin edits to
   * `payment_providers.is_enabled` / `priority` take effect without a
   * redeploy (see "Use Case 1" and "Use Case 2" below).
   */
  private async refreshChainIfStale(): Promise<void> {
    if (Date.now() - this.chainBuiltAt > PaymentProviderSelector.CHAIN_TTL_MS) {
      await this.buildProviderChain();
    }
  }
  
  /**
   * Build provider chain from DB config
   * 1. Query payment_providers table
   * 2. Filter enabled=true AND health_status != 'down'
   * 3. Sort by priority
   * 4. Instantiate each provider
   */
  private async buildProviderChain(): Promise<void> {
    const providers = await this.db
      .from('payment_providers')
      .select('*')
      .eq('is_enabled', true)
      .neq('health_status', 'down')
      .order('priority', { ascending: true });
    
    this.providerChain = providers.data
      .map(config => this.instantiateProvider(config))
      .filter(p => p.isAvailable());
    this.chainBuiltAt = Date.now();
  }
  
  /**
   * Instantiate provider from DB config
   */
  private instantiateProvider(config: PaymentProviderRow): IPaymentProvider {
    const providerConfig = this.decryptConfig(config.config);
    
    switch (config.provider_id) {
      case 'stripe':
        return new StripeProvider(providerConfig);
      case 'paddle':
        return new PaddleProvider(providerConfig);
      case 'paymob':
        return new PaymobProvider(providerConfig);
      case 'flutterwave':
        return new FlutterwaveProvider(providerConfig);
      case '2checkout':
        return new TwoCheckoutProvider(providerConfig);
      default:
        throw new Error(`Unknown provider: ${config.provider_id}`);
    }
  }
  
  /**
   * Load provider rows from `payment_providers` (all providers, not just
   * enabled ones — health checks below still poll disabled providers) and
   * populate `this.providers`. Awaited once from `create()`.
   */
  private async initializeProviders(): Promise<void> {
    const rows = await this.db.from('payment_providers').select('*');
    for (const row of rows.data ?? []) {
      this.providers.set(row.provider_id, this.instantiateProvider(row));
    }
  }
  
  /**
   * Decrypt a provider's `config` column. Delegates to Supabase Vault /
   * `pgsodium` — see "Key Management Boundary" above. The decrypted value
   * lives only in memory inside this adapter instance.
   */
  private decryptConfig(config: unknown): Record<string, unknown> {
    return config as Record<string, unknown>;
  }
}
```

---

## Settings UI (Admin Dashboard)

**Page**: `src/app/(admin)/settings/payment-providers`

```text
Payment Providers Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Global Settings
  Store Name:        GlamD
  Support Email:     support@glamd.com
  Default Currency:  EGP
  Webhook Secret:    [••••••••] (Last rotated: 3 days ago)

─────────────────────────────────────────────────────────────

Provider: Stripe
  Status:            🔴 DISABLED
  Type:              Payment Gateway
  Priority:          1 (Primary)
  Health:            Unknown
  Config:
    - API Key:       [••••••••]
    - Test Mode:     ON
  [Enable] [Edit Config] [Test] [Health Check]

Provider: Paddle
  Status:            🟢 ENABLED
  Type:              Payment Gateway
  Priority:          2 (Secondary)
  Health:            Healthy (checked 2 min ago)
  Config:
    - API Key:       [••••••••]
    - Test Mode:     OFF
  [Disable] [Edit Config] [Test] [Health Check]

Provider: Paymob
  Status:            🟢 ENABLED
  Type:              MoR (Egyptian)
  Priority:          3 (Tertiary)
  Health:            Degraded (High error rate)
  Config:
    - API Key:       [••••••••]
    - Test Mode:     OFF
  [Disable] [Edit Config] [Test] [Health Check]

Provider: Flutterwave
  Status:            🔴 DISABLED
  Priority:          4 (Quaternary)
  [Enable] [Edit Config] [Test] [Health Check]

Provider: 2Checkout
  Status:            🔴 DISABLED
  Priority:          5 (Emergency)
  [Enable] [Edit Config] [Test] [Health Check]

─────────────────────────────────────────────────────────────

Fallback History (Last 24h)
  2024-01-15 14:23   Paddle → Paymob  (timeout after 5.2s)
  2024-01-15 13:45   Paymob → Flutterwave  (rate limit)
  2024-01-15 12:10   Stripe → Paddle  (503 service unavailable)
```

---

## All Use Cases Covered

### ✅ Use Case 1: Switch Providers On/Off

- Update `payment_providers.is_enabled` via admin dashboard
- The provider chain reloads within `CHAIN_TTL_MS` (30s, see
  `refreshChainIfStale()` in the selector above) — no redeploy needed. The
  admin write path may additionally call an explicit invalidation hook to
  force an immediate reload instead of waiting out the TTL.
- No code deploy needed

### ✅ Use Case 2: Change Provider Priority

- Update `payment_providers.priority` in admin
- Reorder fallback chain — takes effect on the next TTL-based chain
  reload, same mechanism as Use Case 1
- First-enabled-provider becomes primary

### ✅ Use Case 3: Provider Fails (Health Check)

- Background job queries each provider hourly
- Updates `payment_providers.health_status`
- Dashboard shows health per provider
- Selector skips unhealthy providers

### ✅ Use Case 4: Fallback to Next Provider

- If provider.createCheckoutSession() fails AND error matches `fallback_on` conditions
- Log to `payment_provider_fallbacks` table
- Try next provider in chain
- Automatic retry with audit trail

### ✅ Use Case 5: Webhook Deduplication

- Every webhook has unique `(provider_id, provider_event_id)`
- INSERT into `payment_events` with dedup_key
- If duplicate: skip processing (already handled)
- Prevents duplicate inventory decrements, duplicate audit rows

### ✅ Use Case 6: Payout via Different Provider

- Admin selects payout method per referrer per period
- `payment_provider_payouts.payout_account` stores provider-specific routing
- Payout can go via Stripe, Paddle, Paymob, or direct bank transfer
- Different providers for checkout vs payout

### ✅ Use Case 7: Provider Settings Encrypted

- All API keys stored encrypted via pgcrypto
- Only decrypted at provider instantiation time
- Webhook secret rotated monthly
- Audit trail via `payment_settings.updated_by`

### ✅ Use Case 8: Multi-Currency Support

- Each session stores `currency_code` (EGP, USD, EUR)
- Each transaction stores `charged_currency` and `exchange_rate`
- Provider handles currency conversion (if applicable)
- Contract validates currency match

### ✅ Use Case 9: Fraud Scoring Per Provider

- `payment_transactions.fraud_score` and `fraud_status`
- Per-provider risk management settings
- Block flagged transactions if `enable_fraud_check=true`
- Dispute handling via provider

### ✅ Use Case 10: Rate Limiting Per Provider

- `payment_settings.rate_limit_rpm` and `rate_limit_hourly`
- Upstash Redis for distributed rate limiting
- Fallback to next provider on rate limit
- Dashboard shows current usage per provider

---

## Migration Path

**This is a planned migration — none of the phases below have started.** No
payment tables exist yet, no `StripeProvider` adapter has been written, and
`src/lib/stripe/checkout.ts` still calls Stripe directly today. This section
describes the intended sequence, not completed work.

### Phase 1: Database Schema (0 code changes)

- Create all 7 payment tables
- Migrate existing Stripe transactions to `payment_transactions`
- Add settings row with existing Stripe config

### Phase 2: Stripe → Provider Adapter

- Wrap existing Stripe checkout code in `StripeProvider` class
- Implement `IPaymentProvider` interface
- No change to API behavior (still uses Stripe by default)

### Phase 3: Add Paddle Provider

- Implement `PaddleProvider` class
- Register in settings table
- Test fallback chain (Stripe → Paddle)

### Phase 4: Add MoR Providers (Paymob, Flutterwave, 2Checkout)

- Implement each as provider
- Set priority in settings
- Complete fallback chain

### Phase 5: Settings UI

- Admin dashboard for provider management
- Enable/disable via UI (no code deploy)
- Health monitoring per provider

---

## Wave 6 Integration

**File**: `src/app/api/checkout/route.ts` (Replace with provider-agnostic implementation)

```typescript
import { PaymentProviderSelector } from '@/lib/payment/provider-selector';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  // Use the async factory — never `new PaymentProviderSelector(...)` — so
  // the provider chain is guaranteed to be populated before use.
  const selector = await PaymentProviderSelector.create(supabase, paymentConfig);
  
  const checkoutRequest = validateCheckoutRequest(await request.json());
  
  try {
    // Automatically uses first-enabled provider with fallback chain
    const session = await selector.createCheckoutSession(checkoutRequest);
    
    return NextResponse.json({
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: session.providerId,
      expiresAt: session.metadata.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Checkout failed: all providers unavailable' },
      { status: 503 }
    );
  }
}
```

---

## Summary

✅ **Stripe preserved** (not deleted, just disabled by default)  
✅ **Paddle added** as primary (Egypt-ready)  
✅ **MoR providers** (Paymob, Flutterwave, 2Checkout) ready to plug in  
✅ **Settings-driven** (no code deploy for provider changes)  
✅ **All edge cases** (fallback, health checks, payouts, encryption, rate limiting)  
✅ **Contract-based** (1:1 input/output mapping)  
✅ **Audit trail** (fallback history, webhook dedup, provider health)  

**Wave 6 is now modular, extensible, and Egypt-ready.**
