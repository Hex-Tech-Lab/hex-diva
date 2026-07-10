# Referral System Implementation Guide - Track F

Complete referral and commission tracking system for hex-diva luxury cosmetics platform.

## Overview

The referral system enables users to earn commissions by referring new customers. It includes:

- Unique referral code generation per user (2 letters + 4 digits)
- Tiered commission structure: Bronze 5%, Silver 10%, Gold 15%
- Automatic tier progression based on successful referrals
- Commission tracking with full audit trail
- Payout management and request system
- Admin commission management panel
- Real-time stats caching for performance

## Commission Tier Structure

| Tier   | Rate | Referrals Required | Rate Boost |
|--------|------|-------------------|-----------|
| Bronze | 5%   | 0-10              | Base rate |
| Silver | 10%  | 11-50             | +5% boost |
| Gold   | 15%  | 51+               | +10% boost |

Tier is determined by `total_conversions` count. Once reached, rate applies to all future orders.

## Database Schema

### Core Tables

#### referrals
Tracks referral relationships and conversions

```sql
- id: uuid (primary key)
- referrer_id: uuid (user who referred)
- referred_user_id: uuid (user who was referred)
- referral_code: text (code used)
- status: text (pending, active, converted, expired, cancelled)
- clicked_at: timestamp
- converted_at: timestamp
- conversion_order_id: uuid (order that converted)
- conversion_amount: decimal (purchase value)
- created_at, updated_at: timestamp
```

#### commissions
Records earned commissions from conversions

```sql
- id: uuid (primary key)
- referrer_id: uuid (earner)
- referral_id: uuid (related referral)
- order_id: uuid (order that generated commission)
- order_total: decimal (order value)
- commission_rate: decimal (0.05 = 5%)
- commission_amount: decimal (calculated)
- tier: text (bronze, silver, gold)
- status: text (pending, approved, paid, cancelled)
- payout_id: uuid (payout batch)
- created_at, paid_at, updated_at: timestamp
```

#### payouts
Payout batches to referrers

```sql
- id: uuid (primary key)
- referrer_id: uuid
- amount: decimal
- status: text (pending, processing, completed, failed)
- period_start, period_end: date
- payment_method: text (stripe_connect, bank_transfer)
- stripe_payout_id: text
- created_at, completed_at, updated_at: timestamp
```

#### referral_stats (cached)
Cached metrics updated via trigger

```sql
- referrer_id: uuid (unique)
- total_referrals: integer
- active_referrals: integer
- total_conversions: integer
- total_revenue: decimal
- total_commission_earned: decimal
- pending_commission: decimal
- current_tier: text
- current_month_revenue, current_month_commission: decimal
- last_payout_date: timestamp
- last_calculated_at: timestamp
```

## Core Libraries

### src/lib/referrals.ts
Commission calculation and tier management

Key functions:
- `calculateCommission(orderTotal, tier)` - Calculate commission amount
- `determineTier(totalReferrals)` - Get tier from referral count
- `getCurrentTier(referralCount)` - Get current tier
- `getNextTierInfo(currentTier, currentReferrals)` - Next tier requirements
- `validateCommissionRecord()` - Validate commission data
- `buildReferralUrl(baseUrl, code)` - Generate shareable URL
- `parseReferralCode()` - Validate referral code

### src/lib/referral-codes.ts
Referral code generation and validation

Key functions:
- `generateReferralCode()` - Create unique code (AB1234 format)
- `isValidReferralCode(code)` - Validate format
- `sanitizeReferralCode(code)` - Clean user input
- `formatReferralCodeForDisplay(code)` - Format with hyphen (AB-1234)
- `hasGoodEntropy(code)` - Check randomness
- `generateBatchReferralCodes(count)` - Create multiple codes

## API Endpoints

### User Referral Endpoints

#### GET /api/referrals
Get user's referral stats and recent referrals

**Response:**
```json
{
  "referralCode": "AB1234",
  "stats": {
    "total_referrals": 15,
    "active_referrals": 3,
    "total_conversions": 8,
    "total_revenue": 2400.00,
    "total_commission_earned": 192.00,
    "pending_commission": 85.50,
    "current_tier": "silver",
    "current_month_revenue": 800.00,
    "current_month_commission": 80.00,
    "last_payout_date": "2026-06-30T00:00:00Z"
  },
  "recentReferrals": [...]
}
```

#### POST /api/referrals
Claim referral code or regenerate user's code

**Request (Claim):**
```json
{
  "action": "claim",
  "referralCode": "AB1234"
}
```

**Request (Regenerate):**
```json
{
  "action": "regenerate"
}
```

#### POST /api/referrals/track
Track referral conversion (when order is placed)

**Request:**
```json
{
  "orderId": "uuid",
  "userId": "uuid",
  "orderTotal": 150.00,
  "referralCode": "AB1234"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "commission": {
    "id": "uuid",
    "referrer_id": "uuid",
    "order_total": 150.00,
    "commission_amount": 15.00,
    "tier": "silver",
    "status": "pending"
  },
  "message": "Commission of $15.00 created for tier: silver"
}
```

### Commission Endpoints

#### GET /api/commissions
Get user's commission history

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `status`: Filter (pending, approved, paid, cancelled)
- `tier`: Filter (bronze, silver, gold)

**Response:**
```json
{
  "commissions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "summary": {
    "totalCommissions": 2500.00,
    "pendingCommissions": 500.00,
    "paidCommissions": 2000.00,
    "byTier": {
      "bronze": 200.00,
      "silver": 1500.00,
      "gold": 800.00
    }
  }
}
```

#### GET /api/commissions/payouts
Get payout history and pending amounts

**Response:**
```json
{
  "payouts": [
    {
      "id": "uuid",
      "amount": 500.00,
      "status": "completed",
      "period_start": "2026-06-01",
      "period_end": "2026-06-30",
      "payment_method": "stripe_connect",
      "created_at": "2026-07-01T00:00:00Z",
      "completed_at": "2026-07-05T00:00:00Z"
    }
  ],
  "pendingAmount": 250.00,
  "minimumPayoutAmount": 25.00,
  "canRequestPayout": true
}
```

#### POST /api/commissions/payouts
Request payout of pending commissions

**Request:**
```json
{
  "paymentMethod": "stripe_connect"  // or "bank_transfer"
}
```

### Admin Endpoints

#### GET /api/admin/commissions
Get all commissions with filters (admin only)

**Query Parameters:**
- `page`, `limit`, `status`, `tier`

#### GET /api/admin/verify-access
Verify admin access

**Response:**
```json
{
  "success": true,
  "admin": true,
  "email": "admin@hex-diva.com"
}
```

## UI Components

### User Referral Dashboard
**Location:** `src/app/(dashboard)/referrals/page.tsx`

Features:
- Display referral code with copy button
- Show current tier and commission rate
- Key metrics cards (referrals, conversions, revenue, earnings)
- Tier progress visualization
- Recent referral activity table
- Regenerate code action

### Commission Dashboard
**Location:** `src/app/(dashboard)/commissions/page.tsx`

Features:
- Commission summary (total, pending, paid)
- Available payout amount
- Request payout button
- Payout history table
- Commission history with filtering
- Status and tier breakdown
- Pagination support

### Admin Commission Panel
**Location:** `src/app/(admin)/commissions/page.tsx`

Features:
- System-wide statistics
- Filter by status and tier
- Bulk approve pending commissions
- Status inline editing
- Referrer email display
- Commission amount and tier visualization

## Database Migrations

### 003_create_referral_system.sql
Creates complete referral system schema:
- referrals, commissions, payouts tables
- referral_events for analytics
- referral_stats for caching
- Indexes for performance
- RLS policies
- update_referral_stats() function
- Automatic triggers for stats updates

### 004_add_admin_role_to_users.sql
Adds role field to users table for admin access control

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Future: Stripe Connect for payouts
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

## Integration Points

### 1. User Registration
Assign referral code when user is created:

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
Call `/api/referrals/track` after order is placed:

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
Capture referral code from URL:

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { parseReferralCode } from '@/lib/referrals';

export function CheckoutForm() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  const metadata = {
    referral_code: parseReferralCode(referralCode),
  };
  
  // ... rest of form ...
}
```

## Performance Optimization

- **Referral Stats Cache**: Updated via database triggers
- **Pagination**: Commissions endpoint supports pagination
- **Indexes**: Created on all frequently queried fields
- **RLS Policies**: Restrict data access at database level
- **Batch Operations**: Bulk approve endpoint for admin

## Testing Checklist

- [x] Commission calculation (bronze, silver, gold)
- [x] Tier determination based on referrals
- [x] Referral code generation (unique, valid format)
- [x] Code validation and sanitization
- [x] API endpoint authentication
- [x] Commission tracking workflow
- [x] Payout request validation (minimum amount)
- [ ] Stripe Connect integration (future)
- [ ] Email notifications (future)
- [ ] Analytics tracking (future)

## File Structure

```
hex-diva/
├── src/
│   ├── lib/
│   │   ├── referrals.ts          # Commission logic
│   │   └── referral-codes.ts     # Code generation
│   ├── app/
│   │   ├── api/
│   │   │   ├── referrals/
│   │   │   │   ├── route.ts      # GET/POST referrals
│   │   │   │   └── track/
│   │   │   │       └── route.ts  # POST track conversion
│   │   │   ├── commissions/
│   │   │   │   ├── route.ts      # GET commissions
│   │   │   │   └── payouts/
│   │   │   │       └── route.ts  # GET/POST payouts
│   │   │   └── admin/
│   │   │       ├── commissions/
│   │   │       │   └── route.ts  # GET all commissions
│   │   │       └── verify-access/
│   │   │           └── route.ts  # Verify admin
│   │   ├── (dashboard)/
│   │   │   ├── referrals/
│   │   │   │   └── page.tsx      # Referral dashboard
│   │   │   └── commissions/
│   │   │       └── page.tsx      # Commission dashboard
│   │   └── (admin)/
│   │       └── commissions/
│   │           └── page.tsx      # Admin panel
│   └── migrations/
│       ├── 003_create_referral_system.sql
│       └── 004_add_admin_role_to_users.sql
├── REFERRAL_SYSTEM_GUIDE.md      # This file
└── README.md                      # Project README
```

## Future Enhancements

1. Stripe Connect integration for payouts
2. Email notifications (referral, conversion, payout)
3. Advanced analytics dashboard
4. Fraud detection system
5. Affiliate tiered benefits
6. Mobile app deep linking
7. Social sharing buttons
8. Referral code expiration
9. Custom tier levels (configurable)
10. Performance bonuses

## Support

For implementation questions or issues:
1. Check this guide first
2. Review test files for examples
3. Check CLAUDE.md for project context
4. Review database schema in migrations/

## Track F Status

COMPLETE - All core functionality implemented:
- Commission calculation engine
- Referral code generation system
- Database schema with triggers
- User API endpoints
- Commission management endpoints
- Payout request system
- User dashboards UI
- Admin management panel
- Complete documentation

Ready for:
- Track E UI integration
- Admin role column addition
- Order webhook integration
- Testing and deployment
