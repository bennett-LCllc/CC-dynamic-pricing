/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  transpilePackages: ['@cc-ops/shared', '@cc-ops/db'],
  experimental: {
    typedRoutes: true,
  },
  // Enable source maps for better Sentry error stacks
  productionBrowserSourceMaps: true,
  // Allow cross-origin requests for Sentry
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Request-ID, X-Correlation-ID',
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