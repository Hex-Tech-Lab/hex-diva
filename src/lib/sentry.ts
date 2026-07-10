import * as Sentry from '@sentry/nextjs';

export function initializeSentry() {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

  if (!sentryDsn) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    debug: environment !== 'production',
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaySessionSampleRate: 0.1,
    replayOnErrorSampleRate: 1.0,
  });
}

export function captureError(
  error: Error | string,
  context?: Record<string, any>
) {
  if (typeof error === 'string') {
    Sentry.captureMessage(error, 'error');
  } else {
    Sentry.captureException(error);
  }

  if (context) {
    Sentry.setContext('additional', context);
  }
}

export function setSentryUser(userId?: string, email?: string) {
  if (userId) {
    Sentry.setUser({
      id: userId,
      email,
    });
  } else {
    Sentry.setUser(null);
  }
}

export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info') {
  Sentry.captureMessage(message, level);
}

export default Sentry;
