/**
 * Cookie + CSRF utilities.
 *
 * Security rationale:
 *  - The JWT access token is stored in an httpOnly, SameSite=strict cookie so that XSS
 *    attackers can never read it (no document.cookie access, no localStorage).
 *  - A refresh token lives in a separate httpOnly cookie with a longer TTL.
 *    On each rotation the tokenVersion is incremented in the DB, invalidating
 *    all prior refresh tokens.
 *  - A CSRF token is issued as a *non-httpOnly* cookie so the frontend JS
 *    can read it and echo it back in a custom header on state-changing
 *    requests (POST/PUT/DELETE/PATCH). The server validates that the header
 *    value matches the cookie value — this is the "double-submit cookie"
 *    pattern and defeats CSRF even though the cookie itself is automatically
 *    sent by the browser.
 */

import type { CookieOptions } from 'express';
import { randomBytes } from 'node:crypto';

export const COOKIE_NAME = 'cc-ops-token';
export const REFRESH_COOKIE_NAME = 'cc-ops-refresh';
export const CSRF_COOKIE_NAME = 'cc-ops-csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const isProd = process.env.NODE_ENV === 'production';

// Access token: 15 min — short-lived, limits blast radius on breach.
export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes — matches JWT access expiry
  path: '/',
};

// Refresh token: 7 days — long enough for a usable session, short enough
// to limit window of compromise. Invalidated on every rotation.
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth/refresh',
  // Scope the refresh cookie to the refresh endpoint path only
};

export const CSRF_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false, // intentionally readable by frontend JS for double-submit
  secure: isProd,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // aligns with access-token lifetime
  path: '/',
};

/**
 * Generate a cryptographically random CSRF token (32 bytes hex).
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}
