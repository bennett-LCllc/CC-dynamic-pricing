/**
 * Cookie + CSRF utilities.
 *
 * Security rationale:
 *  - The JWT is stored in an httpOnly, SameSite=strict cookie so that XSS
 *    attackers can never read it (no document.cookie access, no localStorage).
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
export const CSRF_COOKIE_NAME = 'cc-ops-csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const isProd = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: 60 * 60 * 1000, // 1 hour — matches JWT expiry
  path: '/',
};

export const CSRF_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false, // intentionally readable by frontend JS for double-submit
  secure: isProd,
  sameSite: 'strict',
  maxAge: 60 * 60 * 1000,
  path: '/',
};

/**
 * Generate a cryptographically random CSRF token (32 bytes hex).
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}
