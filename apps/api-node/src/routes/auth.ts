/**
 * Auth routes — login, register, session, token refresh, user management.
 */

import { prisma } from '@cc-ops/db';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { auditLog } from '../auditLogger';
import { authMiddleware } from '../middleware/auth';
import {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  generateCsrfToken,
} from '../middleware/cookies';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  authenticateUser,
  createUser,
  deleteUser,
  generateAccessToken,
  generateRefreshToken,
  getUserById,
  listUsers,
  rotateRefreshToken,
  updateUser,
} from '../services/auth';

const router = Router();

// Apply strict rate limiting to login/register to prevent brute force
router.use('/login', authRateLimiter);
router.use('/register', authRateLimiter);

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
      auditLog('user.login', {
        req,
        userEmail: parsed.data.email,
        success: false,
        reason: 'invalid credentials',
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set JWT access token in httpOnly cookie — prevents XSS theft
    const csrfToken = generateCsrfToken();
    res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);

    auditLog('user.login', {
      req,
      userId: user.id,
      userEmail: user.email,
      success: true,
    });

    // Return user without the token — it's now in the cookie
    res.json({ data: { user, csrfToken } });
  } catch (err) {
    auditLog('user.login', {
      req,
      userEmail: parsed.data.email,
      success: false,
      reason: err instanceof Error ? err.message : 'unknown error',
    });
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
    await getUserById(parsed.data.email).catch(() => null);
    // Check by email uniqueness via create catch
    const user = await createUser(parsed.data);
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: 0,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set JWT in httpOnly cookie + CSRF token
    const csrfToken = generateCsrfToken();
    res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);

    auditLog('user.register', {
      req,
      userId: user.id,
      userEmail: user.email,
      success: true,
      details: { role: user.role },
    });

    res.status(201).json({ data: { user, csrfToken } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unique constraint') || message.includes('unique')) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    auditLog('user.register', {
      req,
      userEmail: parsed.data.email,
      success: false,
      reason: err instanceof Error ? err.message : 'unknown error',
    });
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/refresh                                                    */
/* -------------------------------------------------------------------------- */

router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token missing' });
    return;
  }

  const result = await rotateRefreshToken(refreshToken);
  if (!result.user) {
    // Token was invalid, revoked, or already rotated — force re-login
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    res.clearCookie(CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS);
    auditLog('user.token_refresh', {
      req,
      success: false,
      reason: 'invalid or revoked refresh token',
    });
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: result.user.id },
    select: { tokenVersion: true },
  });

  const newPayload = {
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    tokenVersion: user!.tokenVersion,
  };

  const accessToken = generateAccessToken(newPayload);
  const newCsrfToken = generateCsrfToken();

  res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS);
  res.cookie(CSRF_COOKIE_NAME, newCsrfToken, CSRF_COOKIE_OPTIONS);

  auditLog('user.token_refresh', {
    req,
    userId: result.user.id,
    success: true,
  });

  res.json({ data: { user: result.user, csrfToken: newCsrfToken } });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/logout                                                     */
/* -------------------------------------------------------------------------- */

router.post('/logout', (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  res.clearCookie(CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS);

  auditLog('user.logout', {
    req,
    userId,
    userEmail,
    success: true,
  });

  res.json({ data: { success: true } });
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
    auditLog('admin.user_update', {
      req,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      targetUserId: req.params.id,
      success: false,
      reason: 'non-admin attempted role change',
    });
    res.status(403).json({ error: 'Only admins can change user roles' });
    return;
  }

  try {
    const targetUser = await getUserById(req.params.id);
    const data = await updateUser(req.params.id, parsed.data);

    auditLog('admin.user_update', {
      req,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      targetUserId: req.params.id,
      targetUserEmail: targetUser?.email,
      success: true,
      details: { changedFields: Object.keys(parsed.data) },
    });

    res.json({ data });
  } catch (err) {
    auditLog('admin.user_update', {
      req,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      targetUserId: req.params.id,
      success: false,
      reason: err instanceof Error ? err.message : 'unknown error',
    });
    console.error(`PUT /api/auth/users/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/auth/users/:id                                                */
/* -------------------------------------------------------------------------- */

router.delete('/users/:id', authMiddleware, async (req: Request, res: Response) => {
  if (req.user!.role !== 'ADMIN') {
    auditLog('admin.user_delete', {
      req,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      targetUserId: req.params.id,
      success: false,
      reason: 'non-admin attempted user deletion',
    });
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
        auditLog('admin.user_delete', {
          req,
          userId: req.user!.userId,
          userEmail: req.user!.email,
          targetUserId: req.params.id,
          targetUserEmail: targetUser.email,
          success: false,
          reason: 'cannot delete last admin',
        });
        res.status(403).json({ error: 'Cannot delete the last admin account' });
        return;
      }
    }

    await deleteUser(req.params.id);

    auditLog('admin.user_delete', {
      req,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      targetUserId: req.params.id,
      targetUserEmail: targetUser.email,
      success: true,
    });

    res.json({ success: true });
  } catch (err) {
    auditLog('admin.user_delete', {
      req,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      targetUserId: req.params.id,
      success: false,
      reason: err instanceof Error ? err.message : 'unknown error',
    });
    console.error(`DELETE /api/auth/users/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
