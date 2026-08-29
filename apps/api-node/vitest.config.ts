import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// api-node unit tests. Stubs @cc-ops/db so auth/crypto tests stay hermetic
// (no Prisma client, no DB connection). Integration tests should import the
// real db separately.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@cc-ops/db': resolve(__dirname, 'tests/__mocks__/cc-ops-db.ts'),
    },
  },
});
