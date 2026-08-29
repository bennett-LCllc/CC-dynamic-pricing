// Hermetic stub for @cc-ops/db (used by vitest alias in api-node config).
// auth.ts imports `prisma` at module load; this satisfies it without a DB.
export const prisma = {
  user: {
    findUnique: async () => null,
    findMany: async () => [],
  },
  expense: { findMany: async () => [] },
};
