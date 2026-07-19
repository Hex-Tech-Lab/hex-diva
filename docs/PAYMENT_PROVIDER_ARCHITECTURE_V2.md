# Payment Provider Architecture v2.1 (Stripe Preserved, MoR-First, Settings-Driven)

**Status**: Design Phase  
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
  
  -- Webhook secret (shared across all providers)
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
    
    // Create Stripe session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      customer_email: request.customer.email,
      client_reference_id: request.metadata.orderId || crypto.randomUUID(),
      metadata: {
        userId: request.customer.userId,
        referrerId: request.metadata.referrerId || '',
        tier: request.metadata.tier || 'b2c',
      },
    });
    
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
      idempotencyKey: request.metadata.orderId || crypto.randomUUID(),
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

```typescript
export class PaymentProviderSelector {
  private providers: Map<string, IPaymentProvider> = new Map();
  private providerChain: IPaymentProvider[] = [];
  
  constructor(
    private db: SupabaseClient,
    private config: PaymentProviderConfig
  ) {
    this.initializeProviders();
    this.buildProviderChain();
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
    const idempotencyKey = request.metadata.orderId || crypto.randomUUID();
    
    // Check if already processed (idempotency)
    const existingSession = await this.db
      .from('payment_sessions')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();
    
    if (existingSession.data) {
      return this.mapToCanonical(existingSession.data);  // Return cached result
    }
    
    // Try providers in order
    for (const provider of this.providerChain) {
      try {
        const session = await provider.createCheckoutSession(request);
        
        // Validate output contract
        this.validateCheckoutSession(session, request);
        
        // Store session in DB
        await this.db.from('payment_sessions').insert({
          order_id: request.metadata.orderId,
          user_id: request.customer.userId,
          provider_id: provider.name,
          provider_session_id: session.providerSessionId,
          checkout_url: session.checkoutUrl,
          status: 'pending',
          subtotal_amount: request.subtotal,
          shipping_amount: request.shipping,
          tax_amount: request.tax,
          total_amount: request.total,
          currency_code: request.currencyCode,
          idempotency_key: idempotencyKey,
          customer_email: request.customer.email,
          customer_name: request.customer.name,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        
        return session;
      } catch (error) {
        const shouldFallback = this.shouldFallback(error, provider);
        if (!shouldFallback) throw error;
        
        // Log fallback
        await this.logFallback(request.metadata.orderId, provider.name, error);
        
        continue;  // Try next provider
      }
    }
    
    throw new Error('All payment providers failed. No fallback available.');
  }
  
  /**
   * Build provider chain from DB config
   * 1. Query payment_providers table
   * 2. Filter enabled=true
   * 3. Sort by priority
   * 4. Instantiate each provider
   */
  private async buildProviderChain(): Promise<void> {
    const providers = await this.db
      .from('payment_providers')
      .select('*')
      .eq('is_enabled', true)
      .order('priority', { ascending: true });
    
    this.providerChain = providers.data
      .map(config => this.instantiateProvider(config))
      .filter(p => p.isAvailable());
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
}
```

---

## Settings UI (Admin Dashboard)

**Page**: `src/app/(admin)/settings/payment-providers`

```
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
- Provider chain rebuilds automatically
- No code deploy needed

### ✅ Use Case 2: Change Provider Priority
- Update `payment_providers.priority` in admin
- Reorder fallback chain
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
  const selector = new PaymentProviderSelector(supabase, paymentConfig);
  
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
