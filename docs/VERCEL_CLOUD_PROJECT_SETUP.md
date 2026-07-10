# Vercel Cloud Project Creation Guide

**Status**: Configuration files created, cloud project requires manual creation  
**Priority**: CRITICAL - Required for deployment  
**Region**: Paris (CDG1) for GDPR compliance

## Quick Overview

The `vercel.json` configuration file has been created locally. However, the actual Vercel cloud project **must be created manually** in the Vercel dashboard. No automated tool exists to create projects through the API.

## Step 1: Create Vercel Project in Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"** button
3. Select **"Import Git Repository"**
4. Choose **Hex-Tech-Lab/hex-diva** repository from GitHub
5. Click **"Import"**

## Step 2: Configure Project Settings

On the "Configure Project" screen, do NOT change defaults yet. Click **"Deploy"** first to initialize the project.

After initial deployment:

1. Go to **Project Settings** → **General**
2. Verify **Framework Preset**: Next.js (should auto-detect)
3. Verify **Node.js Version**: 24.16.0 (match CLAUDE.md)

## Step 3: Set Region to Paris (CDG1)

1. Go to **Project Settings** → **Regions**
2. In "Production Deployments" section:
   - **Remove** any default regions (SFO, etc.)
   - **Add** only: **cdg1** (Paris - Cloudflare CDG)
   - Keep this as the only production region for GDPR compliance

3. Optional: Add **iad1** (Washington DC) as fallback for redundancy
4. Save changes

## Step 4: Configure Environment Variables

1. Go to **Project Settings** → **Environment Variables**
2. Add all variables from `.env.example` (listed below)
3. Set availability:
   - **Production**: All sensitive vars (API keys, tokens)
   - **Preview**: Subset (keys can be test keys)
   - **Development**: Only needed locals (test values)

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
SHOPIFY_ADMIN_API_ACCESS_TOKEN=[token]
SHOPIFY_STOREFRONT_ACCESS_TOKEN=[token]
SHOPIFY_STORE_NAME=hex-diva-store
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
REDIS_URL=redis://...
SENTRY_AUTH_TOKEN=[token]
SENTRY_PROJECT_ID=[id]
SENTRY_ORG=hex-tech-lab
POSTHOG_API_KEY=[key]
SENDGRID_API_KEY=[key]
RESEND_API_KEY=[key]
ANTHROPIC_API_KEY=[key]
WEBHOOK_SECRET=[generated]
NODE_ENV=production
```

## Step 5: Domain Configuration

1. Go to **Project Settings** → **Domains**
2. Add custom domain (e.g., `hex-diva.com`)
3. Vercel automatically provisions SSL/TLS certificate
4. Update DNS records as instructed by Vercel

## Step 6: Git Branch Deployment Configuration

1. Go to **Project Settings** → **Git**
2. Set:
   - **Production Branch**: `main`
   - **Preview Deployments**: All branches
   - **Automatic Deployments**: Enabled

## Step 7: Cron Jobs Setup

Vercel automatically reads `vercel.json` cron configuration:

```json
"crons": [
  {
    "path": "/api/cron/sync-inventory",
    "schedule": "0 */6 * * *"
  },
  {
    "path": "/api/cron/process-payouts",
    "schedule": "0 0 1 * *"
  }
]
```

These run automatically after deployment.

## Step 8: Verify Deployment

After all configuration:

1. Push a test commit to trigger deployment:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deployment"
   git push origin main
   ```

2. Go to **Deployments** tab in Vercel
3. Watch the build progress (should complete in 2-3 minutes)
4. Verify:
   - ✅ Build successful
   - ✅ Edge Function deployment (if applicable)
   - ✅ Region shows **cdg1**
   - ✅ All env vars loaded
   - ✅ Deployment URL accessible

## Step 9: Enable Advanced Features (Optional but Recommended)

1. **Web Analytics**: Project Settings → Analytics
   - Enable to track Core Web Vitals
   
2. **Speed Insights**: Same location
   - Enable to track deployment performance

3. **Edge Middleware**: Auto-enabled for `src/middleware.ts`
   - Handles auth redirects at edge

## Verification Checklist

- [ ] Vercel project created and visible at vercel.com
- [ ] Region set to **cdg1** (Paris only)
- [ ] All environment variables configured
- [ ] Git integration active (auto-deploy on main push)
- [ ] Domain configured (if applicable)
- [ ] First deployment successful
- [ ] Cron jobs registered in Vercel dashboard
- [ ] SSL certificate active on domain
- [ ] Sentry integration receiving errors
- [ ] PostHog analytics tracking events

## Troubleshooting

### Build Fails After Creation

**Issue**: Next.js build error about missing dependencies

**Solution**:
1. Vercel uses `package-manager: pnpm` from `vercel.json`
2. Ensure `.npmrc` or `pnpm-workspace.yaml` is committed
3. Check `pnpm-lock.yaml` is in repository (required for reproducible builds)

### Environment Variables Not Loaded

**Issue**: 500 errors about undefined process.env.VARIABLE

**Solution**:
1. Verify all vars in Vercel dashboard match `.env.example`
2. Redeploy after adding new vars (they're cached)
3. Check variable names are exactly correct (case-sensitive)

### Wrong Region Deployment

**Issue**: Vercel dashboard shows deployment in sfo1 instead of cdg1

**Solution**:
1. Project Settings → Regions
2. Remove ALL regions except cdg1
3. Redeploy by pushing new commit or clicking "Redeploy"

### Cron Jobs Not Running

**Issue**: `/api/cron/*` endpoints show 404 in logs

**Solution**:
1. Ensure routes exist:
   - `src/app/api/cron/sync-inventory/route.ts`
   - `src/app/api/cron/process-payouts/route.ts`
2. Vercel displays cron jobs in **Settings** → **Cron Jobs**
3. Manual test: `curl https://[deployment].vercel.app/api/cron/sync-inventory`

## Next Steps

After Vercel project creation and deployment:

1. ✅ Deploy to production (main branch)
2. ✅ Configure Supabase client-side integration
3. ✅ Set up CI/CD GitHub Actions
4. ✅ Configure CDN cache headers (Cloudflare)
5. ✅ Monitor deployment health via Vercel dashboard

**Note**: Once project is created, refer to `PARIS_REGION_DEPLOYMENT.md` for regional performance tuning and global CDN strategy.
