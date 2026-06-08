/**
 * Dashboard route — aggregated overview stats.
 */

import { Router, Request, Response } from 'express';
import { getDashboardOverview } from '../services/dashboard';

const router = Router();

// GET /api/dashboard/overview
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const data = await getDashboardOverview();
    res.json({ data });
  } catch (err) {
    console.error('GET /api/dashboard/overview error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
