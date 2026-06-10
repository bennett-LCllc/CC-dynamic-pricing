/**
 * Customer routes — Express router for external customer CRUD.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../services/customers';

const router = Router();

/* -------------------------------------------------------------------------- */
/*  Zod schemas                                                                */
/* -------------------------------------------------------------------------- */

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1).max(50),
  company: z.string().max(200).optional(),
  type: z.enum(['STR_OWNER', 'PM_COMPANY', 'RESIDENTIAL', 'COMMERCIAL']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CHURNED']).optional(),
  stripeCustomerId: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

const updateSchema = createSchema.partial();

const listFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  type: z.enum(['STR_OWNER', 'PM_COMPANY', 'RESIDENTIAL', 'COMMERCIAL']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CHURNED']).optional(),
});

/* -------------------------------------------------------------------------- */
/*  GET /api/customers                                                        */
/* -------------------------------------------------------------------------- */

router.get('/', async (req: Request, res: Response) => {
  const parsed = listFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid filter params', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await getCustomers(parsed.data);
    res.json({ data });
  } catch (err) {
    console.error('GET /api/customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/customers/:id                                                    */
/* -------------------------------------------------------------------------- */

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await getCustomer(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ data });
  } catch (err) {
    console.error(`GET /api/customers/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/customers                                                       */
/* -------------------------------------------------------------------------- */

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await createCustomer(parsed.data);
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/customers error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/* -------------------------------------------------------------------------- */
/*  PUT /api/customers/:id                                                    */
/* -------------------------------------------------------------------------- */

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const data = await updateCustomer(req.params.id, parsed.data);
    res.json({ data });
  } catch (err) {
    console.error(`PUT /api/customers/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/customers/:id                                                 */
/* -------------------------------------------------------------------------- */

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteCustomer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/customers/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to deactivate customer' });
  }
});

export default router;
