'use client';

import { ReactNode, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export function SentryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Sentry on client side
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.replayIntegration(),
        Sentry.captureRouterTransitionStart(),
      ],
    });
  }, []);

  return <>{children}</>;
}
