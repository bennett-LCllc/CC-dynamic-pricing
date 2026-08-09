import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

/**
 * Initialize Sentry for Node.js server (API routes, server components)
 */
export function initSentryServer() {
  if (!SENTRY_DSN) {
    if (ENVIRONMENT === 'development') {
      console.warn('[Sentry Server] DSN not configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    enabled: true,

    tracesSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.1,
    profilesSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.1,

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined as any }),
    ],

    beforeSend(event) {
      // Filter out common noise
      const error = event.exception?.values?.[0]?.value;
      if (error && typeof error === 'string') {
        if (error.includes('ECONNRESET') || error.includes('socket hang up')) {
          return null;
        }
      }
      return event;
    },
  });
}

export default Sentry;