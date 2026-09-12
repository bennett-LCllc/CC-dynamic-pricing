/**
 * LLM proxy routes — gates and accounts for per-customer token budgets.
 *
 * This is the entry point for any LLM-consuming endpoint (guest messaging,
 * dynamic pricing insights, etc.). The tokenBudgetMiddleware pre-checks
 * budget; the route handler deducts actual consumption post-response.
 */
import { Request, Response, Router } from 'express';
import { logger } from '../logger';
import { deductTokens } from '../services/tokenLimiter';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  const customerId = req.user?.customerId;
  if (!customerId) {
    return res.status(403).json({ error: 'No customer context for token budget' });
  }

  try {
    // Placeholder — real LLM call would go here (e.g. Gemini bridge)
    // The tokenBudgetMiddleware already reserved tokens; after the LLM
    // call returns actual usage, deduct the real count.

    const estimatedTokens = 500; // placeholder for demo
    const { remaining } = await deductTokens(customerId, 'DAILY', estimatedTokens);

    return res.json({
      response: 'This is a placeholder LLM response.',
      tokensUsed: estimatedTokens,
      budgetRemaining: remaining,
    });
  } catch (err) {
    logger.error({ err, customerId }, 'LLM chat request failed');
    return res.status(500).json({ error: 'LLM request failed' });
  }
});

export default router;
