/**
 * Settings routes — platform configuration and API key management.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getSettings,
  upsertSettings,
  deleteSetting,
} from '../services/settings';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/* -------------------------------------------------------------------------- */
/*  Zod schemas                                                                */
/* -------------------------------------------------------------------------- */

const upsertSchema = z.object({
  entries: z.array(
    z.object({
      key: z.string().min(1).max(200),
      value: z.string().max(5000),
    }),
  ).min(1),
});

/* -------------------------------------------------------------------------- */
/*  GET /api/settings                                                         */
/* -------------------------------------------------------------------------- */

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getSettings();
    res.json({ data });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/settings                                                        */
/* -------------------------------------------------------------------------- */

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await upsertSettings(parsed.data.entries);
    res.json({ data });
  } catch (err) {
    console.error('POST /api/settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/settings/:key                                                 */
/* -------------------------------------------------------------------------- */

router.delete('/:key', authMiddleware, async (req: Request, res: Response) => {
  try {
    await deleteSetting(req.params.key);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/settings/${req.params.key} error:`, err);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;
