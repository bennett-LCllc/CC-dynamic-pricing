/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  transpilePackages: ['@cc-ops/shared', '@cc-ops/db'],
  experimental: {
    typedRoutes: true,
    // Required for @sentry/nextjs v7 auto-initialization via instrumentation.ts
    // (stable as `instrumentation` in Next 15+; opt-in here for 14.2.x).
    instrumentationHook: true,
  },
  // Enable source maps for better Sentry error stacks
  productionBrowserSourceMaps: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // CORS origin is set dynamically by middleware/_middleware to echo
          // only allowlisted origins — never a wildcard when credentials are used.
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'Content-Type, Authorization, X-Crosssell-Token, X-Request-ID, X-Correlation-ID, x-csrf-token',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Upload source maps to Sentry
  widenClientFileUpload: true,
  // Annotate React components with their display names
  reactComponentAnnotation: {
    enabled: true,
  },
  // Hide source maps from generated client bundles
  hideSourceMaps: true,
  // Automatically tree-shake Sentry logger statements in production
  disableLogger: true,
  // Enables automatic instrumentation of Vercel deployments
  automaticVercelMonitors: true,
};

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
