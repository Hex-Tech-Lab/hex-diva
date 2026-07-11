import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    debug: environment !== 'production',
    beforeSend(event) {
      // Filter out certain errors before sending to Sentry
      if (event.exception) {
        const error = event.exception.values?.[0]?.value || '';
        // Don't send network errors in development
        if (
          environment === 'development' &&
          (error.includes('NetworkError') || error.includes('Failed to fetch'))
        ) {
          return null;
        }
      }
      return event;
    },
    integrations: [
      ...((Sentry as any).Replay ? [new (Sentry as any).Replay({
        maskAllText: false,
        blockAllMedia: false,
      })] : []),
    ],
    // Capture 100% of Replay sessions in development, 10% in prod
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Capture 100% of sessions with an error in production
    replaysOnErrorSampleRate: 1.0,
  });
}
