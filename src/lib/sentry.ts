import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for error tracking and monitoring
 * Called during app startup
 */
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
  });
}

/**
 * Capture error with context
 */
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

/**
 * Capture exception with tags
 */
export function captureException(
  error: Error,
  tags?: Record<string, string>,
  context?: Record<string, any>
) {
  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  if (context) {
    Sentry.setContext('additional', context);
  }

  Sentry.captureException(error);
}

/**
 * Set user context in Sentry
 */
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

/**
 * Capture message for monitoring
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info') {
  Sentry.captureMessage(message, level);
}

export default Sentry;
