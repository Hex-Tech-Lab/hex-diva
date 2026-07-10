import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    debug: environment !== 'production',
    serverName: process.env.VERCEL_ENV || 'unknown',
  });
}
