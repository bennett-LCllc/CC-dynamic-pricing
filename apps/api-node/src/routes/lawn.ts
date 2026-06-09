/**
 * Lawn routes — Express router for lawn job CRUD.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getLawnJobs,
  getLawnJob,
  createLawnJob,
  updateLawnJob,
  deleteLawnJob,
  addLawnPhoto,
  getLawnCrews,
} from '../services/lawn';

const router = Router();

/* -------------------------------------------------------------------------- */
/*  Zod schemas                                                                */
/* -------------------------------------------------------------------------- */

const createSchema = z.object({
  propertyId: z.string().cuid(),
  crewId: z.string().cuid().optional(),
  scheduledDate: z.string().datetime(),
  scheduledTime: z.string().max(10).optional(),
  serviceType: z.enum(['MOW', 'EDGE', 'TRIM', 'FERTILIZE', 'FULL_SERVICE']),
  lotSize: z.string().max(50).optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ISSUE_REPORTED']).optional(),
  customerCharge: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = createSchema.partial();

const photoSchema = z.object({
  url: z.string().url(),
  category: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
});

/* -------------------------------------------------------------------------- */
/*  GET /api/lawn/jobs                                                         */
/* -------------------------------------------------------------------------- */

router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { statuses, propertyId, crewId, fromDate, toDate } = req.query;

    // Parse comma-separated statuses
    const statusList = typeof statuses === 'string'
      ? statuses.split(',').filter(Boolean) as string[]
      : undefined;

    const data = await getLawnJobs({
      statuses: statusList,
      propertyId: propertyId as string | undefined,
      crewId: crewId as string | undefined,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
    });
    res.json({ data });
  } catch (err) {
    console.error('GET /api/lawn/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch lawn jobs' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/lawn/jobs/:id                                                     */
/* -------------------------------------------------------------------------- */

router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const data = await getLawnJob(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Lawn job not found' });
      return;
    }
    res.json({ data });
  } catch (err) {
    console.error('GET /api/lawn/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch lawn job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/lawn/jobs                                                        */
/* -------------------------------------------------------------------------- */

router.post('/jobs', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await createLawnJob(parsed.data as never);
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/lawn/jobs error:', err);
    res.status(500).json({ error: 'Failed to create lawn job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  PUT /api/lawn/jobs/:id                                                     */
/* -------------------------------------------------------------------------- */

router.put('/jobs/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await updateLawnJob(req.params.id, parsed.data as never);
    res.json({ data });
  } catch (err) {
    console.error('PUT /api/lawn/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to update lawn job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/lawn/jobs/:id                                                  */
/* -------------------------------------------------------------------------- */

router.delete('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const data = await deleteLawnJob(req.params.id);
    res.json({ data });
  } catch (err) {
    console.error('DELETE /api/lawn/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to cancel lawn job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/lawn/jobs/:id/photos                                             */
/* -------------------------------------------------------------------------- */

router.post('/jobs/:id/photos', async (req: Request, res: Response) => {
  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid photo data', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await addLawnPhoto(req.params.id, parsed.data);
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/lawn/jobs/:id/photos error:', err);
    res.status(500).json({ error: 'Failed to attach photo' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/lawn/crews                                                        */
/* -------------------------------------------------------------------------- */

router.get('/crews', async (_req: Request, res: Response) => {
  try {
    const data = await getLawnCrews();
    res.json({ data });
  } catch (err) {
    console.error('GET /api/lawn/crews error:', err);
    res.status(500).json({ error: 'Failed to fetch lawn crews' });
  }
});

export default router;
