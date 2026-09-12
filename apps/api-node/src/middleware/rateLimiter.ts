/**
 * Rate limiting — protects auth endpoints from brute force and API abuse.
 */

import rateLimit from 'express-rate-limit';

/**
 * Strict rate limit for authentication endpoints.
 *
 * Why: brute-force / credential-stuffing attacks hammer POST /login and
 * POST /register with thousands of payloads. 10 requests per 15-minute
 * window per IP is generous for legitimate users but cripples attackers.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per window
  message: {
    error: 'Too many attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * General API rate limit for all other endpoints.
 *
 * Why: protects expensive operations (dashboard, financials, bookings)
 * from abuse and DoS without blocking normal interactive use.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: {
    error: 'Rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
