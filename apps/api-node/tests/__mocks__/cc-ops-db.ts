// Hermetic stub for @cc-ops/db (used by vitest alias in api-node config).
// auth.ts imports `prisma` at module load; this satisfies it without a DB.

interface TokenBudgetRow {
  id: string;
  customerId: string;
  window: 'DAILY' | 'MONTHLY';
  limit: number;
  used: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const budgets: TokenBudgetRow[] = [];

function findBudget(customerId: string, window: 'DAILY' | 'MONTHLY') {
  return budgets.find((b) => b.customerId === customerId && b.window === window);
}

export const prisma = {
  user: {
    findUnique: async () => null,
    findMany: async () => [],
  },
  expense: { findMany: async () => [] },
  tokenBudget: {
    findUnique: async (args: {
      where: { customerId_window: { customerId: string; window: string } };
    }) => {
      const { customerId, window } = args.where.customerId_window;
      return findBudget(customerId, window as 'DAILY' | 'MONTHLY') ?? null;
    },
    create: async (args: { data: any }) => {
      const row: TokenBudgetRow = {
        id: `tb_${budgets.length + 1}`,
        customerId: args.data.customerId,
        window: args.data.window,
        limit: args.data.limit,
        used: args.data.used ?? 0,
        resetAt: args.data.resetAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      budgets.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const row = budgets.find((b) => b.id === args.where.id);
      if (!row) throw new Error('TokenBudget not found');
      Object.assign(row, args.data);
      return row;
    },
  },
  $transaction: async (fn: (tx: any) => Promise<any>) => fn(prisma),
};
