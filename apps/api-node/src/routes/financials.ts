/**
 * Financials route — P&L, expenses, and financial overview.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getFinancialOverview,
  getLLCFinancials,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/financials';
import type { ExpenseCategory } from '@cc-ops/shared';

const router = Router();

// ─── Validation schemas ─────────────────────────────────────────

const createExpenseSchema = z.object({
  propertyId: z.string().optional(),
  category: z.string().min(1),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  date: z.string().datetime(),
  incurredBy: z.enum(['STR', 'LAWN', 'CLEANING']).optional(),
  paidFrom: z.string().max(100).optional(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  vendor: z.string().max(200).optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional(),
  notes: z.string().max(1000).optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

// ─── Overview ───────────────────────────────────────────────────

// GET /api/financials/overview
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const data = await getFinancialOverview();
    res.json({ data });
  } catch (err) {
    console.error('GET /api/financials/overview error:', err);
    res.status(500).json({ error: 'Failed to fetch financial overview' });
  }
});

// ─── Per-LLC ────────────────────────────────────────────────────

// GET /api/financials/llc/:type  (STR | LAWN | CLEANING)
router.get('/llc/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!['STR', 'LAWN', 'CLEANING'].includes(type)) {
      res.status(400).json({ error: 'Invalid LLC type. Must be STR, LAWN, or CLEANING.' });
      return;
    }
    const data = await getLLCFinancials(type as 'STR' | 'LAWN' | 'CLEANING');
    res.json({ data });
  } catch (err) {
    console.error(`GET /api/financials/llc/${req.params.type} error:`, err);
    res.status(500).json({ error: 'Failed to fetch LLC financials' });
  }
});

// ─── Expenses CRUD ──────────────────────────────────────────────

// GET /api/financials/expenses
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const filters = {
      propertyId: req.query.propertyId as string | undefined,
      category: req.query.category as string | undefined,
      incurredBy: req.query.incurredBy as 'STR' | 'LAWN' | 'CLEANING' | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    };
    const data = await getExpenses(filters);
    res.json({ data });
  } catch (err) {
    console.error('GET /api/financials/expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST /api/financials/expenses
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid expense data', details: parsed.error.flatten() });
      return;
    }
    const data = await createExpense({
      ...parsed.data,
      category: parsed.data.category as ExpenseCategory,
    });
    res.status(201).json({ data });
  } catch (err) {
    console.error('POST /api/financials/expenses error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/financials/expenses/:id
router.put('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid expense data', details: parsed.error.flatten() });
      return;
    }
    const updatePayload: Record<string, unknown> = { ...parsed.data };
    if (updatePayload.category) {
      updatePayload.category = updatePayload.category as ExpenseCategory;
    }
    const data = await updateExpense(req.params.id, updatePayload as Parameters<typeof updateExpense>[1]);
    res.json({ data });
  } catch (err) {
    console.error(`PUT /api/financials/expenses/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/financials/expenses/:id
router.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    await deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/financials/expenses/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
