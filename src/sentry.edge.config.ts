import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "https://b4778ebe94bb2e8963cf38dde19fab66@o4510320861839361.ingest.de.sentry.io/4511715776790608",

  dataCollection: {
    userInfo: true,
    httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  environment: process.env.NODE_ENV,
});
