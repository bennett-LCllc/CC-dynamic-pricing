import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: RELEASE,
  enabled: Boolean(SENTRY_DSN),

  tracesSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.1,
  profilesSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.1,

  integrations: [
    new Sentry.Integrations.BrowserTracing({
      traceFetch: true,
      traceXHR: true,
    }),
  ],

  beforeSend(event, hint) {
    const error = hint.originalException;
    if (error instanceof Error) {
      if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        return null;
      }
      if (ENVIRONMENT === 'development' && error.message.includes('hydration')) {
        return null;
      }
    }
    return event;
  },

  initialScope: {
    tags: { component: 'web-client' },
  },
});
