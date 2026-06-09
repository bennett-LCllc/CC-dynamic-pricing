/**
 * Cleaning routes — Express router for cleaning job CRUD.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getCleaningJobs,
  getCleaningJob,
  createCleaningJob,
  updateCleaningJob,
  deleteCleaningJob,
  submitChecklist,
  addCleaningPhoto,
  getCleaners,
} from '../services/cleaning';

const router = Router();

/* -------------------------------------------------------------------------- */
/*  Zod schemas                                                                */
/* -------------------------------------------------------------------------- */

const createSchema = z.object({
  propertyId: z.string().cuid(),
  bookingId: z.string().cuid().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  cleaningType: z.enum(['TURNOVER', 'DEEP_CLEAN', 'MOVE_IN_OUT', 'MID_STAY', 'POST_CONSTRUCTION']),
  status: z.enum(['PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ISSUE_REPORTED', 'QUALITY_CHECK']).default('PENDING'),
  cleanerId: z.string().cuid().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  squareFeet: z.number().int().min(0).optional(),
  customerCharge: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
  supplyCost: z.number().min(0).optional(),
  travelCost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = createSchema.partial();

const checklistSchema = z.record(z.string(), z.boolean());

const photoSchema = z.object({
  url: z.string().url(),
  category: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
});

/* -------------------------------------------------------------------------- */
/*  GET /api/cleaning/jobs                                                     */
/* -------------------------------------------------------------------------- */

router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { statuses, propertyId, cleanerId, fromDate, toDate } = req.query;

    // Parse comma-separated statuses
    const statusList = typeof statuses === 'string'
      ? statuses.split(',').filter(Boolean) as string[]
      : undefined;

    const data = await getCleaningJobs({
      statuses: statusList,
      propertyId: propertyId as string | undefined,
      cleanerId: cleanerId as string | undefined,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
    });
    res.json({ data });
  } catch (err) {
    console.error('GET /api/cleaning/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch cleaning jobs' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/cleaning/jobs/:id                                                */
/* -------------------------------------------------------------------------- */

router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const data = await getCleaningJob(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Cleaning job not found' });
      return;
    }
    res.json({ data });
  } catch (err) {
    console.error('GET /api/cleaning/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch cleaning job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/cleaning/jobs                                                    */
/* -------------------------------------------------------------------------- */

router.post('/jobs', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await createCleaningJob(parsed.data as never);
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/cleaning/jobs error:', err);
    res.status(500).json({ error: 'Failed to create cleaning job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  PUT /api/cleaning/jobs/:id                                                */
/* -------------------------------------------------------------------------- */

router.put('/jobs/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await updateCleaningJob(req.params.id, parsed.data as never);
    res.json({ data });
  } catch (err) {
    console.error('PUT /api/cleaning/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to update cleaning job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/cleaning/jobs/:id                                             */
/* -------------------------------------------------------------------------- */

router.delete('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const data = await deleteCleaningJob(req.params.id);
    res.json({ data });
  } catch (err) {
    console.error('DELETE /api/cleaning/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to cancel cleaning job' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/cleaning/jobs/:id/checklist                                      */
/* -------------------------------------------------------------------------- */

router.post('/jobs/:id/checklist', async (req: Request, res: Response) => {
  const parsed = checklistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid checklist', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await submitChecklist(req.params.id, parsed.data);
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/cleaning/jobs/:id/checklist error:', err);
    res.status(500).json({ error: 'Failed to submit checklist' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/cleaning/jobs/:id/photos                                         */
/* -------------------------------------------------------------------------- */

router.post('/jobs/:id/photos', async (req: Request, res: Response) => {
  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid photo data', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await addCleaningPhoto(req.params.id, parsed.data);
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/cleaning/jobs/:id/photos error:', err);
    res.status(500).json({ error: 'Failed to attach photo' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/cleaning/cleaners                                                 */
/* -------------------------------------------------------------------------- */

router.get('/cleaners', async (_req: Request, res: Response) => {
  try {
    const data = await getCleaners();
    res.json({ data });
  } catch (err) {
    console.error('GET /api/cleaning/cleaners error:', err);
    res.status(500).json({ error: 'Failed to fetch cleaners' });
  }
});

export default router;
