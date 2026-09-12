/**
 * Token budget service — per-customer LLM token accounting via Redis.
 *
 * Design (per Gemini review):
 * - Pre-request: gatekeeper checks remaining budget, rejects if exceeded
 * - Post-request: actual token consumption deducted from the response
 * - Lazy reset: if now >= resetAt, zero the counter and advance resetAt
 * - Redis Lua scripts for atomicity under concurrent requests
 * - DB (Prisma TokenBudget) is the source of truth for limits/resetAt;
 *   Redis mirrors counters for fast read/write
 */
import { prisma } from '@cc-ops/db';
import { redis } from '../lib/redis';
import { logger } from '../logger';

// Default budgets (tokens) if no TokenBudget row exists
const DEFAULT_DAILY_LIMIT = 200_000; // ~5K tokens × 40 properties
const DEFAULT_MONTHLY_LIMIT = 6_000_000; // 200K × 30

type BudgetWindow = 'DAILY' | 'MONTHLY';

interface BudgetInfo {
  limit: number;
  used: number;
  resetAt: number; // epoch ms
}

// Redis key: token_budget:{customerId}:{window}
function redisKey(customerId: string, window: BudgetWindow): string {
  return `token_budget:${customerId}:${window}`;
}

// Lua script: atomically deduct tokens after LLM call.
// KEYS[1] = redis key, ARGV[1] = tokens to deduct, ARGV[2] = limit, ARGV[3] = resetAt, ARGV[4] = now
// Returns: new remaining count (limit - used), or -1 if over budget
const DEDUCT_LUA = `
local key = KEYS[1]
local deduct = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local resetAt = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

if now >= resetAt then
  redis.call('DEL', key)
  redis.call('SETEX', key, ARGV[5], deduct)
  return limit - deduct
end

local current = tonumber(redis.call('GET', key) or '0')
if (current + deduct) > limit then
  return -1
end
local newTotal = redis.call('INCRBY', key, deduct)
return limit - newTotal
`;

// Fallback TTL: 7 days (covers longest window + buffer)
const TTL_SECONDS = 7 * 24 * 3600;

/**
 * Get or create budget info for a customer.
 * Reads from DB (source of truth) and syncs Redis.
 */
export async function getBudget(
  customerId: string,
  window: BudgetWindow,
): Promise<BudgetInfo | null> {
  // Try Redis first
  const key = redisKey(customerId, window);
  const now = Date.now();

  if (redis) {
    const cached = await redis.get<string>(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (now < parsed.resetAt) {
        return parsed;
      }
      // Lazy reset: window has rolled over — zero used, advance resetAt
      const info: BudgetInfo = {
        limit: parsed.limit,
        used: 0,
        resetAt: computeResetAt(window),
      };
      await redis.setex(key, TTL_SECONDS, JSON.stringify(info));
      return info;
    }
  }

  // Fall back to DB
  const dbLimit = await prisma.tokenBudget.findUnique({
    where: {
      customerId_window: { customerId, window: window.toUpperCase() as 'DAILY' | 'MONTHLY' },
    },
  });

  if (!dbLimit) {
    // No budget configured — use defaults
    const limit = window === 'DAILY' ? DEFAULT_DAILY_LIMIT : DEFAULT_MONTHLY_LIMIT;
    const resetAt = computeResetAt(window);
    const info: BudgetInfo = { limit, used: 0, resetAt };
    if (redis) {
      await redis.setex(key, TTL_SECONDS, JSON.stringify(info));
    }
    return info;
  }

  const resetAt = dbLimit.resetAt.getTime();
  const info: BudgetInfo = {
    limit: dbLimit.limit,
    used: dbLimit.used,
    resetAt,
  };
  if (redis) {
    await redis.setex(key, TTL_SECONDS, JSON.stringify(info));
  }
  return info;
}

/**
 * Check if a customer can spend `tokens` more without exceeding budget.
 * Does NOT deduct — call `deductTokens()` after the LLM call completes.
 * Returns {allowed: boolean, remaining: number, resetAt: number}.
 */
export async function checkBudget(
  customerId: string,
  window: BudgetWindow,
  tokens: number = 0,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const budget = await getBudget(customerId, window);
  if (!budget) {
    // No budget tracking — allow (admin or untracked customer)
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  // getBudget already handled lazy reset; remaining is straightforward
  const remaining = budget.limit - budget.used;

  // If tokens === 0, just report status (no reservation)
  if (tokens === 0) {
    return { allowed: remaining >= 0, remaining, resetAt: budget.resetAt };
  }

  const allowed = remaining >= tokens;
  return { allowed, remaining: Math.max(0, remaining - tokens), resetAt: budget.resetAt };
}

/**
 * Deduct actual token consumption after an LLM call.
 * Called from the service/controller post-response.
 */
export async function deductTokens(
  customerId: string,
  window: BudgetWindow,
  tokens: number,
): Promise<{ remaining: number; overLimit: boolean }> {
  if (!redis) {
    // Fallback: update DB directly (not atomic, but best-effort in dev)
    logger.warn('Redis unavailable — falling back to DB-only token deduction (not atomic)');
    return deductTokensDB(customerId, window, tokens);
  }

  const budget = await getBudget(customerId, window);
  if (!budget) {
    return { remaining: Infinity, overLimit: false };
  }

  const now = Date.now();
  const resetAtSec = Math.floor(budget.resetAt / 1000);
  const nowSec = Math.floor(now / 1000);

  const result = await redis.eval(
    DEDUCT_LUA,
    [redisKey(customerId, window)],
    [tokens, budget.limit, resetAtSec, nowSec, TTL_SECONDS],
  );

  const remaining = typeof result === 'number' ? result : -1;
  if (remaining < 0) {
    return { remaining: 0, overLimit: true };
  }
  return { remaining, overLimit: false };
}

/**
 * DB-only fallback for token deduction (single-instance, no concurrency).
 * Used when Redis is unavailable.
 */
async function deductTokensDB(
  customerId: string,
  window: BudgetWindow,
  tokens: number,
): Promise<{ remaining: number; overLimit: boolean }> {
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const budget = await tx.tokenBudget.findUnique({
      where: {
        customerId_window: { customerId, window: window.toUpperCase() as 'DAILY' | 'MONTHLY' },
      },
    });

    if (!budget) {
      // Create default budget with used = tokens
      const limit = window === 'DAILY' ? DEFAULT_DAILY_LIMIT : DEFAULT_MONTHLY_LIMIT;
      await tx.tokenBudget.create({
        data: {
          customerId,
          window: window.toUpperCase() as 'DAILY' | 'MONTHLY',
          limit,
          used: tokens,
          resetAt: new Date(computeResetAt(window)),
        },
      });
      return { remaining: limit - tokens, overLimit: false };
    }

    // Lazy reset
    if (now >= budget.resetAt) {
      await tx.tokenBudget.update({
        where: { id: budget.id },
        data: { used: 0, resetAt: new Date(computeResetAt(window)) },
      });
      if (tokens > budget.limit) {
        return { remaining: 0, overLimit: true };
      }
      await tx.tokenBudget.update({
        where: { id: budget.id },
        data: { used: tokens },
      });
      return { remaining: budget.limit - tokens, overLimit: false };
    }

    if (budget.used + tokens > budget.limit) {
      return { remaining: 0, overLimit: true };
    }

    await tx.tokenBudget.update({
      where: { id: budget.id },
      data: { used: { increment: tokens } },
    });
    return { remaining: budget.limit - budget.used - tokens, overLimit: false };
  });

  return result;
}

/**
 * Compute the next reset time for a given window.
 * DAILY resets at midnight UTC. MONTHLY resets at midnight UTC on the 1st.
 */
function computeResetAt(window: BudgetWindow): number {
  const now = new Date();
  if (window === 'DAILY') {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return next.getTime();
  } else {
    // MONTHLY: first day of next month
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.getTime();
  }
}
