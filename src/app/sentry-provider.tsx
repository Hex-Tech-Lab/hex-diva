'use client';

import { ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

// Ensure Sentry is initialized on client
if (typeof window !== 'undefined' && !Sentry.isInitialized?.()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}

export function SentryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
