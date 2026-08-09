import * as Sentry from '@sentry/nextjs';
import { initSentryServer } from '@/lib/sentry.server';

// Initialize Sentry for server-side (API routes, server components)
initSentryServer();

export const onRequestError = Sentry.captureRequestError;