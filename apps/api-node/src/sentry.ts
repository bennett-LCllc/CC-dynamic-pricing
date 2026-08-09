import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';
import type { Request, Response, NextFunction } from 'express';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '0.0.0',
    enabled: true,
    attachStacktrace: true,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,
    includeLocations: true,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

    integrations: [
      new Integrations.Node(), // captures unhandled exceptions
      new Integrations.Http({ tracing: true }), // captures HTTP request traces
      new Integrations.Express({ app: undefined as any }), // Express middleware (set app later)
    ],
  });
}

/**
 * Express request handler middleware - must be the first middleware
 * to capture all requests including those that error before other middleware
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler();

/**
 * Express error handler middleware - must be the last middleware
 * to capture all errors
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError: (error) => {
    // Don't handle 404s or validation errors as "errors" in Sentry
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      return false;
    }
    return true;
  },
});

/**
 * Capture a custom exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Capture a message with level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level, { extra: context });
  }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: { id: string; email?: string; username?: string; [key: string]: any } | null) {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

export default Sentry;