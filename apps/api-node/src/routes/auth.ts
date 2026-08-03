/**
 * Auth routes — login, register, session, user management.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  authenticateUser,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  listUsers,
  generateToken,
} from '../services/auth';
import { prisma } from '@cc-ops/db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/* -------------------------------------------------------------------------- */
/*  Zod schemas                                                                */
/* -------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Public self-registration: role is intentionally NOT accepted here. New accounts are
// VIEWER only; an existing ADMIN promotes users via PUT /api/auth/users/:id. This closes
// the open-admin-registration privilege-escalation path (HG-003 scope on create).
const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
  password: z.string().min(8).optional(),
});

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/login                                                      */
/* -------------------------------------------------------------------------- */

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion });
    res.json({ data: { token, user } });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/register                                                   */
/* -------------------------------------------------------------------------- */

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const existing = await getUserById(parsed.data.email).catch(() => null);
    // Check by email uniqueness via create catch
    const user = await createUser(parsed.data);
    const token = generateToken({ userId: user.id, email: user.email, role: user.role, tokenVersion: 0 });
    res.status(201).json({ data: { token, user } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unique constraint') || message.includes('unique')) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/auth/me                                                          */
/* -------------------------------------------------------------------------- */

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ data: user });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/auth/users                                                       */
/* -------------------------------------------------------------------------- */

router.get('/users', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const data = await listUsers();
    res.json({ data });
  } catch (err) {
    console.error('GET /api/auth/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/* -------------------------------------------------------------------------- */
/*  PUT /api/auth/users/:id                                                   */
/* -------------------------------------------------------------------------- */

router.put('/users/:id', authMiddleware, async (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  // Non-admin users cannot change roles
  if (req.user!.role !== 'ADMIN' && parsed.data.role !== undefined) {
    res.status(403).json({ error: 'Only admins can change user roles' });
    return;
  }

  try {
    const data = await updateUser(req.params.id, parsed.data);
    res.json({ data });
  } catch (err) {
    console.error(`PUT /api/auth/users/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/auth/users/:id                                                */
/* -------------------------------------------------------------------------- */

router.delete('/users/:id', authMiddleware, async (req: Request, res: Response) => {
  if (req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only admins can delete users' });
    return;
  }

  try {
    // Last-admin guard: prevent deleting the last admin
    const targetUser = await getUserById(req.params.id);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(403).json({ error: 'Cannot delete the last admin account' });
        return;
      }
    }

    await deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/auth/users/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
