import * as Sentry from '@sentry/nextjs';
import { initSentry } from '@/lib/sentry';

// Initialize Sentry for client-side
initSentry();

// Export onRouterTransitionStart for Next.js App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;