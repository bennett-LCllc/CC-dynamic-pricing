import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

/**
 * Initialize Sentry for Next.js (client + server + edge)
 * This should be called as early as possible in the app lifecycle
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Sentry] DSN not configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    enabled: true,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.1,
    profilesSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0.1,

    // Session replay (captures user interactions)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out common noise
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors that are likely user connectivity issues
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          return null;
        }
        // Ignore React hydration errors in development
        if (ENVIRONMENT === 'development' && error.message.includes('hydration')) {
          return null;
        }
      }
      return event;
    },

    // Attach additional context
    initialScope: {
      tags: {
        component: 'web',
      },
    },
  });
}

/**
 * Capture a custom exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Capture a message with level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>,
) {
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureMessage(message, level);
    });
  }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(
  user: { id: string; email?: string; username?: string; [key: string]: any } | null,
) {
  if (SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  if (SENTRY_DSN) {
    return Sentry.startTransaction({ name, op });
  }
  return null;
}

export default Sentry;
