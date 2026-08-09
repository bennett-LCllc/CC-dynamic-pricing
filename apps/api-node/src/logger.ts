import pino from 'pino';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

const serviceName = 'cc-ops-api';
const serviceVersion = process.env.npm_package_version || '0.0.0';

/**
 * Base logger with service metadata
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: serviceName,
    version: serviceVersion,
    env: process.env.NODE_ENV || 'development',
  },
  // Redact sensitive fields from logs
  redact: {
    paths: [
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.api_key',
      '*.authorization',
      '*.cookie',
      '*.set-cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      singleLine: true,
      ignore: 'pid,hostname',
    },
  } : undefined,
});

/**
 * Create a child logger for a specific module/context
 */
export function createModuleLogger(moduleName: string, extraMeta?: Record<string, any>) {
  return logger.child({ module: moduleName, ...extraMeta });
}

/**
 * Request logger middleware - adds correlation IDs and child logger to request
 */
export const requestLogger = (req: Request, _res, next) => {
  const requestId = randomUUID();
  // Use existing correlation ID from headers (for distributed tracing) or generate new
  const correlationId = (req.headers['x-correlation-id'] as string) || requestId;

  req.id = requestId;
  req.correlationId = correlationId;
  req.log = logger.child({ requestId, correlationId });

  // Log incoming request
  req.log.info({
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');

  next();
};

/**
 * Response logger middleware - logs response details
 */
export const responseLogger = (req: Request, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = req.log || logger;

    log.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.get('content-length'),
    }, 'Request completed');
  });

  next();
};

export default logger;