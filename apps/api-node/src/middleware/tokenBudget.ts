/**
 * Token budget middleware — gates LLM-consuming endpoints by per-customer budget.
 *
 * Pre-request gatekeeper: checks if customer has enough token budget remaining.
 * Does NOT know actual LLM consumption — reserves a conservative estimate.
 * Actual deduction happens post-response via `deductTokens()` in the service layer.
 *
 * Usage:
 *   app.use('/api/llm', tokenBudgetMiddleware);  // gates all LLM routes
 *
 * Reads `req.user.customerId` — set by auth middleware.
 * Returns 429 with budget details if over limit.
 */
import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';
import { checkBudget } from '../services/tokenLimiter';

// Conservative token reservation per LLM request — covers input + output estimate.
// A typical STR guest-message query uses ~1,500–3,500 tokens. 5,000 is a safe over-estimate.
const DEFAULT_RESERVATION = 5_000;

export interface TokenBudgetOptions {
  /** Override the token reservation for this route (default: 5000) */
  reservation?: number;
  /** Budget window to check (default: DAILY) */
  window?: 'DAILY' | 'MONTHLY';
  /** If true, only check budget status without reserving (read-only probe) */
  probeOnly?: boolean;
}

export function tokenBudgetMiddleware(opts: TokenBudgetOptions = {}) {
  const reservation = opts.reservation ?? DEFAULT_RESERVATION;
  const window = opts.window ?? 'DAILY';

  return async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.customerId;
    if (!customerId) {
      // No customer linked — log and allow (admin or untracked user)
      logger.debug('tokenBudgetMiddleware: no customerId on user, skipping budget check');
      return next();
    }

    try {
      const tokens = opts.probeOnly ? 0 : reservation;
      const result = await checkBudget(customerId, window, tokens);

      if (!result.allowed) {
        res.setHeader('X-Token-Budget-Limit', String(result.remaining + tokens));
        res.setHeader('X-Token-Budget-Reset', String(result.resetAt));
        return res.status(429).json({
          error: 'Token budget exceeded',
          budget: {
            window,
            remaining: result.remaining,
            resetAt: result.resetAt,
          },
        });
      }

      // Attach budget info to response header for client visibility
      res.setHeader('X-Token-Budget-Remaining', String(result.remaining));
      res.setHeader('X-Token-Budget-Reset', String(result.resetAt));

      next();
    } catch (err) {
      logger.error({ err, customerId }, 'tokenBudgetMiddleware: budget check failed');
      // Fail-open: don't block traffic if budget check is broken
      next();
    }
  };
}
