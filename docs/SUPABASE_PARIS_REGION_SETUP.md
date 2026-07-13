# Supabase Paris Region Configuration

**Status**: Database schema and migrations created, project region requires verification  
**Priority**: HIGH - Required for GDPR compliance  
**Requirement**: Primary: Paris (eu-west-1), Backup: Frankfurt (eu-central-1)

## Overview

Supabase PostgreSQL database **MUST** be hosted in the Paris region (eu-west-1 CDG) for GDPR compliance. This guide verifies and configures the region correctly.

## Step 1: Verify Supabase Project Region

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select the **hex-diva** project
3. Click **Settings** → **General**
4. Verify **Region**: Shows `eu-west-1` (Paris)
   - If showing different region, **STOP** - project must be recreated in Paris region
   - Supabase does not support region migration for existing projects

## Step 2: Create Supabase Project in Paris (If Not Already)

If the project is in wrong region, recreate:

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose organization (Hex-Tech-Lab)
4. Project name: `hex-diva`
5. **CRITICAL**: Region = **Europe (eu-west-1)** ← PARIS
6. Database password: Generate strong password
7. Click **Create new project** (takes 2-3 minutes)

## Step 3: Verify Database Configuration

After project creation:

1. Go to **Settings** → **Database**
2. Verify:
   - **Host**: `db.*.supabase.co` (eu-west-1 CDG)
   - **Port**: 5432 (or 6543 for connection pooling)
   - **Database**: postgres
   - **User**: postgres
   - **Version**: PostgreSQL 15+

3. Connection string format:
   ```
   postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
   ```

## Step 4: Enable PgVector Extension

Required for semantic search (AI product recommendations):

1. Go to **SQL Editor**
2. Create new query
3. Paste:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Click **Run**
5. Verify in **Database** → **Extensions** that `vector` shows as enabled

## Step 5: Run Database Migrations

Apply all schema migrations in order:

```bash
# From project root
pnpm db:migrate
```

This runs all `.sql` files in `migrations/` directory:

1. `001_create_users_table.sql` - Users, profiles, addresses with RLS
2. `002_create_products_and_orders.sql` - Products, orders, carts
3. `003_add_collections_and_variants.sql` - Collections, variants, search tags
4. `004_add_admin_role_to_users.sql` - Admin role system
5. `005_create_referral_system.sql` - Referrals, commissions, payouts

Alternatively, run manually via SQL Editor:

1. Copy entire migration file contents
2. Paste in **SQL Editor**
3. Click **Run**
4. Verify no errors

## Step 6: Verify All Tables Created

After migrations complete:

1. Go to **Database** → **Tables**
2. Verify these tables exist:
   - `auth.users` (Supabase Auth)
   - `public.users` (Extended user data)
   - `public.user_profiles` (B2B status, referral codes)
   - `public.products` (Product catalog)
   - `public.orders` (Order records)
   - `public.order_items` (Line items)
   - `public.carts` (Shopping carts)
   - `public.collections` (Product collections)
   - `public.product_collections` (Many-to-many)
   - `public.product_variants` (SKU variants)
   - `public.referrals` (Referral tracking)
   - `public.referral_clicks` (Click tracking)
   - `public.commissions` (Commission calculations)
   - `public.commission_payouts` (Payout records)
   - `public.referral_stats` (Analytics)

## Step 7: Configure Row Level Security (RLS)

RLS policies are defined in migrations but need verification:

1. Go to **Authentication** → **Policies**
2. For each table, verify:
   - `SELECT`: Users can only see own data (for auth.users, user_profiles, orders, etc.)
   - `INSERT`: Users can only insert own data
   - `UPDATE`: Users can only update own data
   - `DELETE`: Restricted to admins

Example policies already in migrations:
```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only modify their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Step 8: Configure Supabase Auth

1. Go to **Authentication** → **Providers**
2. **Email/Password**: Enabled by default
3. Optional - Enable OAuth:
   - **Google**: Requires Google Cloud credentials
   - **Apple**: Requires Apple Developer account
   - Leave disabled for MVP, enable later if needed

## Step 9: Set Up Supabase Secrets (API Keys)

1. Go to **Settings** → **API**
2. Copy these keys to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
   ```

3. **Security**:
   - `NEXT_PUBLIC_*` keys are public (safe in frontend)
   - `SUPABASE_SERVICE_ROLE_KEY` is **SECRET** (server-only)
   - Never commit `.env.local` to git
   - Store in Vercel Environment Variables for production

## Step 10: Configure Realtime (Optional)

Required for live updates (orders, inventory):

1. Go to **Database** → **Replication**
2. Enable Realtime for tables:
   - `products` (inventory changes)
   - `orders` (order status updates)
   - `commissions` (payout status)

3. In code, subscribe to changes:
   ```typescript
   const subscription = supabase
     .from('products')
     .on('*', payload => {
       console.log('Product updated:', payload);
     })
     .subscribe();
   ```

## Step 11: Backup Configuration

Supabase automatically backs up databases daily:

1. Go to **Database** → **Backups**
2. Verify:
   - Daily backups enabled
   - 7-day retention
   - Point-in-time recovery available

For manual backup:
```bash
# Dump PostgreSQL to file
pg_dump -h db.[project-id].supabase.co -U postgres -d postgres > backup.sql
```

## Step 12: Monitor Database Health

1. Go to **Database** → **Usage**
2. Monitor:
   - Database size (limit: 10GB free tier, 500GB+ paid)
   - Active connections (max: ~100 concurrent)
   - Transaction rate

3. Set up alerts via **Settings** → **Alerts**

## Step 13: Configure Read Replicas (Optional - Production Only)

For disaster recovery and geographic distribution:

1. Go to **Database** → **Read Replicas**
2. Create replica in **eu-central-1** (Frankfurt)
3. Configure failover settings
4. Update connection string for read-heavy operations

This enables:
- Automatic failover if Paris region fails
- Local Frankfurt reads for Eastern Europe users
- Disaster recovery RTO < 1 hour

## Verification Checklist

- [ ] Project region verified as `eu-west-1` (Paris CDG)
- [ ] PgVector extension enabled
- [ ] All 15 tables exist in public schema
- [ ] RLS policies configured on sensitive tables
- [ ] Supabase Auth email/password enabled
- [ ] API keys copied to environment variables
- [ ] Realtime enabled for `products`, `orders`, `commissions`
- [ ] Daily backups configured with 7-day retention
- [ ] Database health monitoring active
- [ ] Read replica in Frankfurt (optional but recommended)

## Environment Variables Checklist

Before deployment, verify these are set:

```bash
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Database connection pooling (optional, for high concurrency)
DATABASE_POOLING_URL=postgresql://[user]:[password]@[project-id].pooling.supabase.co:6543/postgres

# Webhook secret (for Supabase Functions)
WEBHOOK_SECRET=[generated-random-string]
```

## Integration with Vercel

After Supabase is configured:

1. Vercel **Project Settings** → **Environment Variables**
2. Add all Supabase vars (same as `.env.local`)
3. Redeploy to pick up new variables

## Troubleshooting

### "Not Found" Error When Querying

**Issue**: `Error: Not Found` when calling `supabase.from('table_name')`

**Solution**: Verify table exists:
```bash
# In SQL Editor
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### RLS Policy Errors

**Issue**: `new row violates row-level security policy` when inserting

**Solution**: Check RLS policies:
```sql
-- List all policies on a table
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Temporarily disable RLS for debugging
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### Connection Pool Exhaustion

**Issue**: `Too many connections` error

**Solution**:
1. Use connection pooling: `db.[id].pooling.supabase.co:6543`
2. Ensure app closes connections properly
3. Monitor active connections in **Database** → **Usage**

### Backup/Restore Issues

**Issue**: Cannot restore from backup

**Solution**:
1. Backups restore to **new** project (cannot overwrite)
2. To restore to same project, must drop all tables first
3. Better approach: Use git-based migrations and schema management

## Next Steps

After Supabase is fully configured:

1. ✅ Run migrations
2. ✅ Seed test data (products, users)
3. ✅ Test RLS policies
4. ✅ Connect Vercel to environment variables
5. ✅ Deploy and test end-to-end

**Note**: See `.env.example` for complete list of all 35+ environment variables needed for full deployment.
