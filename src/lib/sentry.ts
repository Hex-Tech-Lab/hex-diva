import * as Sentry from '@sentry/nextjs';

<<<<<<< HEAD
=======
/**
 * Initialize Sentry for error tracking and monitoring
 * Called during app startup
 */
>>>>>>> origin/main
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
<<<<<<< HEAD
  });
}

=======
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

/**
 * Capture error with context
 */
>>>>>>> origin/main
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

<<<<<<< HEAD
=======
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
>>>>>>> origin/main
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

<<<<<<< HEAD
=======
/**
 * Capture message for monitoring
 */
>>>>>>> origin/main
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info') {
  Sentry.captureMessage(message, level);
}

<<<<<<< HEAD
=======
/**
 * Start transaction for performance monitoring
 */
export function startTransaction(name: string, op: string = 'http.request') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error as Error, undefined, context);
      throw error;
    }
  };
}

/**
 * Wrap sync function with error tracking
 */
export function withErrorTrackingSync<T extends any[], R>(
  fn: (...args: T) => R,
  context?: Record<string, any>
) {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      captureException(error as Error, undefined, context);
      throw error;
    }
  };
}

>>>>>>> origin/main
export default Sentry;
