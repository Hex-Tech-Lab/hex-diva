# Backend Infrastructure Setup - Track C

## Overview

Complete backend infrastructure setup for Hex-Diva including Supabase schema, RLS policies, Redis caching, Sentry error tracking, and API routes.

## Database Schema

### Core Tables

**users**
- Authentication integrated via Supabase Auth
- Stores user profile data (email, display_name, avatar_url, tier)
- User tier system (B2C/B2B)
- RLS policies for data privacy

**user_profiles**
- Extended user profile information
- Preferences (JSON)
- References users table via foreign key

**addresses**
- Shipping and billing addresses
- Multiple addresses per user
- Default address flag

**products**
- Product catalog with Shopify integration
- Supports inventory tracking
- Tags, categories, brands
- Vector embeddings for semantic search

**orders & order_items**
- Order management system
- Line-item tracking
- Status workflow (pending, processing, shipped, delivered, cancelled)

**referrals & commissions**
- Referral tracking system
- Commission calculations with tiers
- Payout tracking

**inventory_cache**
- Redis-backed inventory cache
- Synced from Shopify with TTL: 5 minutes
- Tracks sync status and errors

**Additional Tables**
- product_reviews: User reviews with ratings
- wishlists: User saved items
- search_queries: Search analytics
- b2b_tier_requests: B2B verification workflow
- b2b_discount_tiers: Tiered discounts for B2B users
- admin_users: Admin role management
- audit_logs: System audit trail
- api_keys: API authentication
- notification_preferences: User notification settings
- user_sessions: Session tracking
- rate_limits: API rate limiting
- analytics_events: Event tracking

## API Routes

### Authentication (`/api/auth/*`)
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Email + password login
- `POST /api/auth/logout` - Clear session
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/reset-password` - Password reset

### Products (`/api/products/*`)
- `GET /api/products` - List products with filters (category, brand, sort)
- `GET /api/products/[id]` - Product detail with reviews
- `POST /api/products/search` - Full-text & semantic search

### Cart (`/api/cart/*`)
- `POST /api/cart/add` - Add item to cart
- `POST /api/cart/remove` - Remove item from cart
- `POST /api/cart/update` - Update item quantity

### Orders (`/api/orders/*`)
- `GET /api/orders` - List user's orders
- `GET /api/orders/[id]` - Order detail

### Referrals (`/api/referrals/*`)
- `GET /api/referrals` - User's referral stats
- `POST /api/referrals/track` - Track referral click/conversion

### Commissions (`/api/commissions/*`)
- `GET /api/commissions` - Commission history
- `POST /api/commissions/payout` - Request payout

### Admin (`/api/admin/*`)
- `GET /api/admin/analytics` - Dashboard analytics

### Webhooks (`/api/webhooks/*`)
- `POST /api/webhooks/shopify` - Shopify product sync webhook
- `POST /api/webhooks/orders` - Order status webhook

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Admin users have elevated permissions
- Public read-only access for products and reviews

### Rate Limiting
- Redis-backed rate limiter
- 100 requests per 15 minutes per IP/endpoint
- Implemented via middleware at `/src/middleware.ts`
- Graceful degradation if Redis unavailable

### Error Handling
- Centralized error handling in `/src/lib/errors.ts`
- Custom error classes (ValidationError, NotFoundError, UnauthorizedError, etc.)
- Sentry integration for error tracking

## Configuration Files

### Environment Variables
See `.env.example` for required configuration:
- Supabase (URL, keys)
- Stripe (publishable, secret, webhook)
- Shopify (API tokens, shop name)
- Redis (Upstash URL and token)
- Sentry DSN
- Email services (SendGrid, Resend)
- OAuth credentials (Google, Apple)

### Sentry Configuration
- `sentry.client.config.ts` - Client-side error tracking with session replay
- `sentry.server.config.ts` - Server-side error tracking
- Automatic error filtering (suppresses network errors in dev)
- Session replay capture (100% in dev, 10% in prod)

### Redis Cache Configuration
- `/src/lib/cache.ts` - Cache utilities
- Typed cache operations with TTL
- Cache keys for products, users, sessions, searches, referrals
- TTL configurations: SHORT (5m), MEDIUM (30m), LONG (1h), VERY_LONG (24h)

### Rate Limiting Configuration
- `/src/lib/rate-limit.ts` - Rate limit configurations per endpoint
- Separate limits for auth (5 req/15m), API (100 req/15m)

## Migration Files

### 001_create_users_table.sql
- Users table with Supabase Auth integration
- User profiles extended data
- Addresses for shipping/billing
- Initial RLS policies

### 002_create_products_and_orders.sql
- Products catalog
- Orders and line items
- Shopping cart (session-based)
- Initial indexes and RLS

### 003_create_referrals_and_commissions.sql
- Referral tracking
- Commission ledger
- B2B tier management
- Inventory cache table
- Product reviews and wishlists

### 004_add_vector_search_support.sql
- pgvector extension
- Product embeddings (1536-dim)
- Vector search indexes (IVFFlat)
- Search analytics tracking

### 005_add_admin_and_audit_tables.sql
- Admin users with role-based access
- Audit logs for compliance
- API key management
- Notification preferences
- Session tracking
- Rate limit tracking
- Analytics events

### 006_finalize_setup_and_security.sql
- Final RLS policy completeness check
- Additional indexes for performance
- Table documentation/comments

## Dependencies Added

```json
{
  "@upstash/redis": "^1.34.0"
}
```

## Usage

### Setup
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Apply migrations (via Supabase CLI or dashboard)
supabase migration push

# Start development server
pnpm dev
```

### Database Operations
```bash
# View migrations
supabase migration list

# Create new migration
supabase migration create <name>

# Test locally
supabase start
```

### Testing API Routes
```bash
# Run dev server
pnpm dev

# Test auth signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","displayName":"User Name"}'

# Test products
curl http://localhost:3000/api/products?page=1&limit=10

# Test product search
curl -X POST http://localhost:3000/api/products/search \
  -H "Content-Type: application/json" \
  -d '{"query":"makeup"}'
```

## Cache Strategy

### Product Cache
- 1 hour TTL
- Invalidated on product update via webhook

### Inventory Cache
- 5 minutes TTL
- Synced from Shopify
- Fallback to database if cache miss

### Session Cache
- 24 hour TTL
- Redis-backed user sessions

### Search Cache
- 30 minutes TTL
- Query results cached
- Invalidate on pattern match

## Performance Optimization

### Indexes
- Created on frequently queried columns:
  - users (email, referral_code, created_at)
  - products (category, brand, sku, shopify_id)
  - orders (user_id, status, created_at)
  - referrals (referrer_id, referred_user_id, status)
  - commissions (user_id, status, created_at)

### Vector Search
- IVFFlat indexes for semantic search
- 1536-dimensional embeddings
- List parameter: 100 (trade-off between speed/accuracy)

## Monitoring & Observability

### Sentry
- Real-time error tracking
- Performance monitoring
- Session replay (authentication errors)
- Custom breadcrumbs for debugging

### Rate Limiting
- Tracks requests per IP/endpoint
- Returns 429 status with Retry-After header
- Redis-backed for distributed systems

### Audit Logs
- All admin actions logged
- User activity tracking
- Change history for compliance

## Next Steps (for Tracks D & E)

1. **Track D (Product Import)**: Implement Shopify product sync using webhooks
2. **Track E (Frontend Development)**: Build React components consuming these APIs
3. **Frontend Auth**: Integrate with Supabase Auth UI
4. **Cart Persistence**: Connect frontend cart to backend
5. **Checkout Flow**: Implement Stripe payment processing
6. **Real-time Updates**: Enable Supabase Realtime subscriptions

## Troubleshooting

### Redis Connection Issues
- Verify REDIS_URL and REDIS_TOKEN in .env.local
- Check Upstash dashboard for connection status
- Cache operations gracefully degrade if Redis unavailable

### Supabase Auth Issues
- Verify email confirmation is enabled
- Check OAuth provider configuration
- Review auth policies in RLS

### Rate Limiting Triggering
- Check actual request count
- Adjust limits in `/src/lib/rate-limit.ts`
- Consider implementing API key-based higher limits

### Vector Search Not Working
- Ensure pgvector extension is enabled
- Verify embeddings are generated
- Check index creation in migrations

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
