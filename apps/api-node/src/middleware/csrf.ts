/**
 * CSRF protection for state-changing requests (POST/PUT/DELETE/PATCH).
 *
 * Uses the "double-submit cookie" pattern: the CSRF token is set as a
 * readable cookie on login. Every state-changing request must include that
 * same value in the x-csrf-token header. If the cookie value and the header
 * value don't match (or the header is missing), the request is rejected.
 *
 * Safe HTTP methods (GET, HEAD, OPTIONS) are exempt.
 */

import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: 'CSRF validation failed',
    });
  }

  next();
}
