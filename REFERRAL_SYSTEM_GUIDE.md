# Track F: Referral & Commission System - Complete Implementation Guide

## Overview

Complete referral and commission tracking system with:
- Unique referral codes (AB1234 format) per user
- Tiered commission structure: Bronze 5%, Silver 10%, Gold 15%
- Automatic tier progression (0-10 → 11-50 → 51+)
- Commission tracking and payout management
- Admin commission management panel
- Real-time stats caching

## Commission Tiers

| Tier   | Rate | Min Referrals | Max Referrals |
|--------|------|---------------|---------------|
| Bronze | 5%   | 0             | 10            |
| Silver | 10%  | 11            | 50            |
| Gold   | 15%  | 51            | ∞             |

Tier is determined by total conversion count. Rate applies to all future orders.

## Database Schema

### referrals
- id, referrer_id, referred_user_id, referral_code
- status: pending, active, converted, expired, cancelled
- conversion_order_id, conversion_amount, converted_at

### commissions
- id, referrer_id, order_id, referral_id
- order_total, commission_rate, commission_amount
- tier: bronze, silver, gold
- status: pending, approved, paid, cancelled

### payouts
- id, referrer_id, amount, status
- period_start, period_end
- payment_method: stripe_connect, bank_transfer

### referral_stats (cached)
- referrer_id (unique)
- total_referrals, active_referrals, total_conversions
- total_revenue, total_commission_earned, pending_commission
- current_tier, current_month_revenue, current_month_commission

## Core Libraries

### src/lib/referrals.ts
- `calculateCommission(orderTotal, tier)` - Calculate amount
- `determineTier(totalReferrals)` - Get tier from referral count
- `parseReferralCode(code)` - Validate code
- `buildReferralUrl(baseUrl, code)` - Generate shareable URL

### src/lib/referral-codes.ts
- `generateReferralCode()` - Create unique code
- `isValidReferralCode(code)` - Validate format
- `sanitizeReferralCode(code)` - Clean input
- `generateBatchReferralCodes(count)` - Batch create
- `formatReferralCodeForDisplay(code)` - Format as AB-1234

## API Endpoints

### User Endpoints

**GET /api/referrals**
```json
{
  "referralCode": "AB1234",
  "stats": {
    "total_referrals": 15,
    "total_conversions": 8,
    "total_revenue": 2400.00,
    "total_commission_earned": 192.00,
    "pending_commission": 85.50,
    "current_tier": "silver"
  },
  "recentReferrals": [...]
}
```

**POST /api/referrals**
- `action: "claim"` - Claim referral code when referred
- `action: "regenerate"` - Generate new code

**POST /api/referrals/track**
```json
{
  "orderId": "uuid",
  "userId": "uuid",
  "orderTotal": 150.00,
  "referralCode": "AB1234"
}
```
Tracks conversion and creates commission record.

**GET /api/commissions?page=1&limit=20&status=pending&tier=silver**
Returns paginated commission history with summary stats.

**GET /api/commissions/payouts**
Returns payout history and pending amount.

**POST /api/commissions/payouts**
```json
{
  "paymentMethod": "stripe_connect"
}
```
Creates payout request (min $25).

### Admin Endpoints

**GET /api/admin/commissions?page=1&status=pending&tier=gold**
View all commissions (admin only).

**GET /api/admin/verify-access**
Verify admin access.

## Integration Checkpoints

### 1. User Creation
```typescript
import { generateReferralCode } from '@/lib/referral-codes';

async function createUser(userData) {
  const referralCode = generateReferralCode();
  return supabase.from('users').insert({
    ...userData,
    referral_code: referralCode,
  });
}
```

### 2. Order Processing
```typescript
async function handleOrderCreated(order) {
  const referralCode = order.metadata?.referral_code;
  if (referralCode) {
    await fetch('/api/referrals/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        userId: order.user_id,
        orderTotal: order.total,
        referralCode: referralCode,
      }),
    });
  }
}
```

### 3. Checkout Page
```typescript
'use client';
import { useSearchParams } from 'next/navigation';
import { parseReferralCode } from '@/lib/referrals';

export function CheckoutForm() {
  const searchParams = useSearchParams();
  const referralCode = parseReferralCode(searchParams.get('ref'));
  
  // Store in order metadata
  const metadata = { referral_code: referralCode };
  // ... rest of form
}
```

## File Structure

```
hex-diva/
├── src/lib/
│   ├── referrals.ts
│   └── referral-codes.ts
├── src/app/api/
│   ├── referrals/
│   │   ├── route.ts
│   │   └── track/route.ts
│   ├── commissions/
│   │   ├── route.ts
│   │   └── payouts/route.ts
│   └── admin/
│       ├── commissions/route.ts
│       └── verify-access/route.ts
├── migrations/
│   ├── 003_create_referral_system.sql
│   └── 004_add_admin_role_to_users.sql
└── REFERRAL_SYSTEM_GUIDE.md (this file)
```

## Database Migrations

**003_create_referral_system.sql**
- Creates referrals, commissions, payouts, referral_stats tables
- Adds indexes on common query fields
- Enables RLS with policies
- Creates update_referral_stats() function
- Sets up automatic triggers

**004_add_admin_role_to_users.sql**
- Adds `role` column to users (user, moderator, admin)
- Creates index for role queries

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Future: Stripe Connect
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

## Performance Features

- Real-time stats caching via database triggers
- Pagination support on all list endpoints
- Indexes on frequently queried fields (referrer_id, status, tier)
- RLS policies for data security
- Batch operations for admin (bulk approve)

## Testing

```typescript
import { calculateCommission, determineTier } from '@/lib/referrals';
import { generateReferralCode, isValidReferralCode } from '@/lib/referral-codes';

// Commission tests
expect(calculateCommission(100, 'bronze')).toBe(5);
expect(calculateCommission(100, 'silver')).toBe(10);
expect(calculateCommission(100, 'gold')).toBe(15);

// Tier tests
expect(determineTier(5)).toBe('bronze');
expect(determineTier(15)).toBe('silver');
expect(determineTier(60)).toBe('gold');

// Code tests
const code = generateReferralCode();
expect(isValidReferralCode(code)).toBe(true);
```

## Status: COMPLETE

All core referral and commission system functionality implemented and ready for:
- Track E UI dashboard integration
- Order webhook integration
- Testing and deployment

Future enhancements:
- Stripe Connect payouts
- Email notifications
- Analytics dashboard
- Fraud detection
