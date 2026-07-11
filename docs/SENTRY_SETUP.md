# Sentry Setup Guide for Hex-Diva

This document describes how to properly set up Sentry error tracking and performance monitoring for the hex-diva project.

## Prerequisites

- Sentry account at https://sentry.io
- Admin access to the Hex-Tech-Lab organization in Sentry (or ability to create projects)

## Step 1: Create Sentry Project

1. Log in to Sentry dashboard: https://sentry.io
2. Navigate to the "hex-tech-lab" organization (create if doesn't exist)
3. Click "Create Project"
4. Select "Next.js" as the platform
5. Name the project: `hex-diva` (or `hex-diva-staging` for staging)
6. Select your team and click "Create Project"

## Step 2: Get Project Credentials

After project creation, you'll see the Setup Instructions page with:

### Required Credentials:
- **DSN (Data Source Name)**: Format `https://<key>@<subdomain>.ingest.sentry.io/<projectId>`
  - This goes in `NEXT_PUBLIC_SENTRY_DSN` (public, safe in Next.js)
  
- **Auth Token**: Personal or Organization token with project:write scope
  - Generate at: https://sentry.io/settings/auth-tokens/
  - This goes in `SENTRY_AUTH_TOKEN` (secret, for build-time source map uploads)

## Step 3: Configure Environment Variables

### Local Development (.env.local)
```
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<subdomain>.ingest.sentry.io/<projectId>
SENTRY_AUTH_TOKEN=sntrys_eyJ...YOUR_TOKEN_HERE
```

### Vercel Production & Preview Deployments

1. Go to Vercel project settings for hex-diva
2. Navigate to "Environment Variables"
3. Add two variables:

**NEXT_PUBLIC_SENTRY_DSN**
- Value: `https://<key>@<subdomain>.ingest.sentry.io/<projectId>`
- Environments: Production, Preview, Development

**SENTRY_AUTH_TOKEN**
- Value: `sntrys_eyJ...YOUR_TOKEN_HERE`
- Environments: Production, Preview, Development

## Step 4: Verify Configuration

### Build-time Verification
When you deploy, look for these logs in Vercel:
```
Sentry CLI configured with auth token
Creating release: hex-diva@0.1.0
Uploading sourcemaps to Sentry
```

If sourcemaps aren't uploading, check:
- `SENTRY_AUTH_TOKEN` is set and valid
- Token has `project:write` scope
- Token hasn't expired

### Runtime Verification
1. Deploy the app
2. Generate a test error (e.g., throw an error on a page)
3. Check Sentry dashboard - error should appear within 30 seconds

To manually test error reporting:
```typescript
// In a route or component
import * as Sentry from '@sentry/nextjs';

// Manually capture an exception
Sentry.captureException(new Error("Test error from Hex-Diva"));
```

## Configuration Files Reference

### sentry.client.config.ts
- Configures client-side error capture
- Runs in browser; captures frontend errors
- Requires: `NEXT_PUBLIC_SENTRY_DSN`

### next.config.ts (withSentryConfig wrapper)
- Configures server-side error capture
- Uploads sourcemaps to Sentry during build
- Requires: `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`

### sentry.server.config.ts
- Configures server-side error capture
- Runs on Vercel Edge Network / serverless functions
- Auto-configured by withSentryConfig

## Key Features Enabled

✅ **Client-side error tracking**: Browser errors captured automatically
✅ **Server-side error tracking**: API route and SSR errors captured
✅ **Session replay**: 100% in dev, 10% in production (configurable)
✅ **Sourcemap upload**: Builds retain original source for better stack traces
✅ **Performance monitoring**: Tracing enabled with 10% sample rate in production
✅ **Network error filtering**: NetworkError and Failed to fetch filtered in dev

## Monitoring & Alerting

### Alert Rules (Set up in Sentry)
1. **Error rate > 1% in 5 minutes**: Alert to Slack
2. **Any JS error in production**: Alert immediately
3. **P95 response time > 5s**: Alert to Slack

### Sentry Dashboard
Access at: https://sentry.io/organizations/hex-tech-lab/issues/?project=hex-diva

Key metrics to monitor:
- Crash-free sessions %
- New issues
- Top errors by frequency
- Performance P95 latencies

## Troubleshooting

### Sourcemaps Not Uploading
```bash
# Check token validity
curl -I -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  https://sentry.io/api/0/organizations/hex-tech-lab/projects/hex-diva/

# If 401: token is invalid or expired
```

### Errors Not Appearing in Sentry
1. Verify DSN is correct (typos are common)
2. Check Network tab in browser DevTools for 404 to ingest URL
3. Verify `sentry.client.config.ts` is imported in app layout
4. Check browser console for Sentry initialization warnings

### Build Hanging During Sourcemap Upload
- Auth token might be invalid
- Network connectivity issue
- Set `sourcemaps.disable: true` in next.config.ts temporarily to test

## Source Maps Security

⚠️ **Important**: Source maps expose your source code.

Current configuration:
- Maps are uploaded to Sentry servers (private, not public)
- Maps are NOT included in production build output
- Only Sentry admins can view release source maps
- They are automatically deleted after 90 days per Sentry retention policy

To verify maps aren't public:
```bash
# Should return 404 (good)
curl https://hex-diva-o9vyy525k-techhypexps-projects.vercel.app/static/js/main.*.js.map
```

## Related Documentation

- Sentry Next.js docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry CLI reference: https://docs.sentry.io/cli/
- Sentry Release Tracking: https://docs.sentry.io/product/releases/

## References

Configured per Hex-Diva architectural guidelines:
- Monitoring infrastructure coordinate in CLAUDE.md
- Integrations enabled in next.config.ts (line 99-110)
- Client-side config in sentry.client.config.ts
