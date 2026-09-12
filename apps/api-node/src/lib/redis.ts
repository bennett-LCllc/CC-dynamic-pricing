/**
 * Redis client — Upstash Redis (serverless) for atomic token counters.
 * Falls back to no-op if UPSTASH_REDIS_URL is unset (dev mode).
 */
import { Redis } from '@upstash/redis';
import { logger } from '../logger';

const url = process.env.UPSTASH_REDIS_URL;
const token = process.env.UPSTASH_REDIS_TOKEN;

export const redis: Redis | null = url && token ? new Redis({ url, token }) : null;

if (!redis) {
  logger.warn(
    'UPSTASH_REDIS_URL/TOKEN not set — token budgeting will be best-effort (in-memory fallback)',
  );
}
