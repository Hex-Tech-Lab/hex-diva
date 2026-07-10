# Backend Infrastructure Setup - Track C (Hours 8-24)

## Overview

Complete backend infrastructure for hex-diva has been set up including:
- Supabase PostgreSQL schema with 6 versioned migrations
- Redis caching layer via Upstash
- Sentry error tracking integration
- API route handlers for core operations
- Rate limiting and request validation
- Row Level Security (RLS) policies for data security

## Database Schema (Supabase)

### Migration Files

All database migrations are versioned and located in `/migrations/`:

1. **001_create_users_table.sql** (2.0 KB)
   - users table (Supabase Auth integration)
   - user_profiles (extended user data)
   - addresses (shipping/billing addresses)
   - RLS policies for user data access

2. **002_create_products_and_orders.sql** (3.3 KB)
   - products table (synced from Shopify)
   - orders table (order records)
   - order_items table (line items)
   - carts table (session-based shopping carts)
   - RLS policies for public products, private orders

3. **003_create_referral_system.sql** (11 KB)
   - referrals table (referral tracking)
   - commissions table (commission calculations)
   - inventory_cache table (Redis sync structure)
   - b2b_tier_requests (B2B upgrade workflow)
   - b2b_discount_tiers (tiered discount levels)
   - product_reviews & wishlists tables
   - RLS policies for referral/commission access

4. **004_add_vector_search_support.sql** (2.8 KB)
   - pgvector extension setup
   - Embedding columns for semantic search
   - search_queries table for analytics
   - product_recommendations table
   - Vector indexes for fast similarity search

5. **005_add_admin_and_audit_tables.sql** (6.2 KB)
   - admin_users table (role-based access)
   - audit_logs table (audit trail)
   - api_keys table (admin API access)
   - notification_preferences
   - user_sessions tracking
   - rate_limits table
   - analytics_events table
   - RLS policies for admin operations

6. **006_finalize_setup_and_security.sql** (2.2 KB)
   - Additional security hardening
   - Constraint validation
   - Index optimization

### Total Tables Created: 24

**Core Tables:**
- users, user_profiles, addresses
- products, orders, order_items, carts
- referrals, commissions
- inventory_cache
- b2b_tier_requests, b2b_discount_tiers
- product_reviews, wishlists
- search_queries, product_recommendations
- admin_users, audit_logs, api_keys
- notification_preferences, user_sessions, rate_limits, analytics_events

**Features:**
- All tables have proper indexes for query performance
- Row Level Security (RLS) enabled on all tables
- Audit logging for compliance
- Foreign key constraints with cascade delete
- Type checking with CHECK constraints

## Library Files

### `/src/lib/`

1. **db.ts** (0.7 KB)
   - Supabase client initialization (anon & service role)
   - Type exports from Supabase Auth

2. **cache.ts** (2.8 KB)
   - Redis client setup (Upstash)
   - Cache operations (get, set, delete)
   - Rate limiting helpers
   - Cache availability checks

3. **sentry.ts** (1.3 KB)
   - Sentry error tracking initialization
   - Error/message capture helpers
   - User context tracking
   - Error wrapping utilities

4. **rate-limit.ts** (1.3 KB)
   - Rate limit configuration by endpoint
   - Endpoint rate limit validation
   - Request identifier extraction (user ID or IP)

5. **auth.ts** (1.2 KB)
   - Authentication helpers
   - Sign up/in/out functions
   - Password reset functionality

6. **api-response.ts** (1.2 KB)
   - Standard API response formatting
   - Error response helpers

7. **errors.ts** (1.5 KB)
   - Custom error classes
   - Error handling utilities

## API Routes

### Structure
```
/src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── me/route.ts
│   ├── refresh/route.ts
│   ├── reset-password/route.ts
│   └── signup/route.ts
├── products/
│   ├── route.ts (list products)
│   ├── [id]/route.ts (get product)
│   └── search/route.ts (semantic search)
├── cart/
│   └── route.ts (get/add to cart)
├── orders/
│   └── route.ts (list/create orders)
├── referrals/
│   ├── route.ts (referral stats)
│   └── track/route.ts (referral tracking)
├── commissions/
│   ├── route.ts (commission stats)
│   ├── approve/route.ts
│   ├── payout/route.ts
│   └── process-order/route.ts
├── admin/
│   └── (admin endpoints)
└── health/
    └── route.ts (health check)
```

## Environment Variables

### Required for Backend

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Redis (Upstash)
REDIS_URL=https://...
REDIS_TOKEN=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Environment
NEXT_PUBLIC_ENVIRONMENT=development|production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `.env.example` for complete variable list.

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Public tables (products) readable by everyone
- Admin operations restricted by admin_users table
- Audit logs readable only by admins

### Rate Limiting
- Per-endpoint rate limit configuration
- IP-based and user-based limiting
- Redis-backed distributed rate limiting
- Configurable limits: auth (5/15m), api (100/15m), search (30/1m), checkout (10/1h)

### Error Tracking
- Sentry integration for all errors
- Automatic error context capture
- Performance monitoring with tracing
- User identification in Sentry

### Authentication
- Supabase Auth with email/password
- OAuth support (Google, Apple)
- JWT-based session management
- Automatic token refresh

## Redis Cache Strategy

### Cache Keys
```
product:{id}           - Individual product data
cart:{userId}          - User shopping cart
wishlist:{userId}      - User wishlist items
referral:{userId}      - Referral statistics
session:{sessionId}    - User sessions
rate_limit:{key}       - Rate limit counters
```

### TTLs
- SHORT: 5 minutes (rate limits, temporary data)
- MEDIUM: 30 minutes (carts, search results)
- LONG: 1 hour (products, user profiles)
- VERY_LONG: 24 hours (sessions)

## Deployment Checkpoints

### Hour 8: Initial Setup
- ✅ Supabase project configured
- ✅ Schema design documented
- ✅ Migrations planned (6 total)

### Hour 12: Core Implementation
- ✅ 5 core migration files created
- ✅ Database client configured
- ✅ RLS policies implemented

### Hour 16: Auth & API
- ✅ Auth flow implemented
- ✅ API route structure ready
- ✅ Error tracking configured

### Hour 20: Caching & Monitoring
- ✅ Redis cache layer configured
- ✅ Sentry integration complete
- ✅ Rate limiting in place

### Hour 24: Ready for Next Track
- ✅ Full backend infrastructure complete
- ✅ All migrations tested
- ✅ API endpoints functional
- ✅ Error tracking active
- ✅ Cache layer operational
- ✅ Ready for Track D (product import)

## Testing the Setup

### Health Check
```bash
curl http://localhost:3000/api/health
```

Response indicates status of database and cache services.

### Database Migrations
```bash
pnpm db:migrate
```

Lists and applies pending migrations to Supabase.

### Type Checking
```bash
pnpm type-check
```

Ensures all TypeScript types are valid.

### Build
```bash
pnpm build
```

Verifies production build compatibility.

## Next Steps (Track D)

The backend is now ready for:
1. **Product Import** - Shopify product sync via webhooks
2. **Inventory Management** - Redis cache sync for real-time inventory
3. **Order Processing** - Stripe/Shopify checkout integration
4. **Referral System** - Commission calculation and payout processing

## Files Modified

- `next.config.js` - Added Sentry configuration
- `src/app/layout.tsx` - Added Sentry initialization
- `.env.example` - Updated with Redis and Sentry variables
- `package.json` - Added @upstash/redis dependency

## Files Created

**Migrations (6 files):**
- migrations/001_create_users_table.sql
- migrations/002_create_products_and_orders.sql
- migrations/003_create_referral_system.sql
- migrations/004_add_vector_search_support.sql
- migrations/005_add_admin_and_audit_tables.sql
- migrations/006_finalize_setup_and_security.sql

**Libraries (7 files):**
- src/lib/cache.ts
- src/lib/sentry.ts
- src/lib/rate-limit.ts
- src/lib/api-response.ts
- src/lib/auth.ts
- src/lib/db.ts
- src/lib/errors.ts

**API Routes (18+ files):**
- Auth routes (signup, login, logout, etc.)
- Product routes (list, details, search)
- Cart routes
- Order routes
- Referral routes
- Commission routes
- Health check

## Documentation

- This file: `BACKEND_SETUP.md` - Complete backend setup guide
- `CLAUDE.md` - Project architecture and standards
- `.env.example` - Environment variable reference

## Support

For issues or questions:
1. Check Sentry dashboard for error tracking
2. Review migration logs: `supabase migration list`
3. Check Redis connection: `redis-cli ping`
4. Run health check: `curl /api/health`
