/**
 * Auth middleware — verifies JWT from httpOnly cookie (or Bearer header)
 * and attaches user to request.
 *
 * Tokens are read from the httpOnly cookie primarily, with the Bearer
 * header as a fallback for API client tools / scripts.
 */

import { NextFunction, Request, Response } from 'express';
import { verifyToken, type TokenPayload } from '../services/auth';
import { COOKIE_NAME } from './cookies';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prefer cookie, fall back to Authorization header
  const token = req.cookies?.[COOKIE_NAME] ?? req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
