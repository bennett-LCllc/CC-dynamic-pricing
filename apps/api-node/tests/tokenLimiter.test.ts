import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the redis lib before importing the service
const mockRedis = vi.hoisted(() => ({
  get: vi.fn(),
  setex: vi.fn(),
  eval: vi.fn(),
}));

vi.mock('../src/lib/redis', () => ({
  redis: mockRedis,
}));

// Mock the logger to avoid pino noise
vi.mock('../src/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { checkBudget, deductTokens } from '../src/services/tokenLimiter';

describe('tokenLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
  });

  describe('checkBudget', () => {
    it('returns allowed=true when no customerId', async () => {
      // No customer ID means no budget tracking — allow
      const result = await checkBudget('untracked-customer', 'DAILY', 1000);
      expect(result.allowed).toBe(true);
    });

    it('deducts from used budget correctly', async () => {
      // Mock Redis to simulate existing budget with 10K used of 50K limit
      const budgetInfo = {
        limit: 50_000,
        used: 10_000,
        resetAt: Date.now() + 3_600_000, // 1 hour from now
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(budgetInfo));

      const result = await checkBudget('cust-123', 'DAILY', 5_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(35_000); // 50K - 10K - 5K reservation
    });

    it('rejects when budget exceeded', async () => {
      const budgetInfo = {
        limit: 1_000,
        used: 1_000,
        resetAt: Date.now() + 3_600_000,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(budgetInfo));

      const result = await checkBudget('cust-123', 'DAILY', 5_000);
      expect(result.allowed).toBe(false);
    });

    it('lazy-resets when resetAt is in the past', async () => {
      const budgetInfo = {
        limit: 50_000,
        used: 50_000,
        resetAt: Date.now() - 1000, // already past
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(budgetInfo));

      const result = await checkBudget('cust-123', 'DAILY', 5_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(45_000); // reset to 50K, then 5K reservation
    });

    it('returns allowed=true with probeOnly (tokens=0)', async () => {
      const budgetInfo = {
        limit: 50_000,
        used: 40_000,
        resetAt: Date.now() + 3_600_000,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(budgetInfo));

      const result = await checkBudget('cust-123', 'DAILY', 0);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10_000);
    });
  });

  describe('deductTokens', () => {
    it('deducts tokens from Redis counter via Lua script', async () => {
      const budgetInfo = {
        limit: 50_000,
        used: 10_000,
        resetAt: Date.now() + 3_600_000,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(budgetInfo));
      // Lua script returns remaining: limit - new_used
      mockRedis.eval.mockResolvedValue(35_000);

      const result = await deductTokens('cust-123', 'DAILY', 500);
      expect(result.remaining).toBe(35_000);
      expect(result.overLimit).toBe(false);
    });

    it('handles negative result (over budget)', async () => {
      const budgetInfo = {
        limit: 50_000,
        used: 49_800,
        resetAt: Date.now() + 3_600_000,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(budgetInfo));
      mockRedis.eval.mockResolvedValue(-1); // Lua returns -1 for over-limit

      const result = await deductTokens('cust-123', 'DAILY', 500);
      expect(result.overLimit).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });
});
