/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cc-ops/shared', '@cc-ops/db'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
