/**
 * Audit logging — records security-relevant actions for compliance and
 * incident response. Unlike the general request/response logger (which
 * captures HTTP plumbing), the audit logger captures *who did what* at
 * the business-logic layer: logins, logouts, registrations, admin user
 * changes, and token refreshes.
 *
 * Each entry is a structured pino event tagged `audit: true` so it can
 * be filtered, routed, or shipped to a SIEM independently.
 */

import type { Request } from 'express';
import logger from './logger';

export type AuditAction =
  | 'user.login'
  | 'user.register'
  | 'user.logout'
  | 'user.token_refresh'
  | 'admin.user_update'
  | 'admin.user_delete';

interface AuditContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
}

function extractContext(req?: Request | AuditContext): AuditContext | undefined {
  if (!req) return undefined;
  if ('originalUrl' in req) {
    return {
      requestId: req.id || req.correlationId || 'unknown',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
  }
  return req;
}

interface AuditEntry {
  userId?: string;
  userEmail?: string | null;
  targetUserId?: string;
  targetUserEmail?: string | null;
  success: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export function auditLog(action: AuditAction, entry: AuditEntry & { req?: Request }): void {
  const { req, userId, userEmail, targetUserId, targetUserEmail, success, reason, details } = entry;
  logger.info(
    {
      audit: true,
      action,
      success,
      userId,
      userEmail,
      targetUserId,
      targetUserEmail,
      reason,
      ...details,
      ...extractContext(req),
    },
    `Audit: ${action}`,
  );
}
