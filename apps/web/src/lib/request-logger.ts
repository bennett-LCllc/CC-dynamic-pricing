import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { logger } from './logger';

/**
 * Request logging middleware for Next.js App Router
 * Adds correlation ID and logs request/response
 */
export function requestLoggingMiddleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  const correlationId = request.headers.get('x-correlation-id') || requestId;

  // Create child logger with request context
  const log = logger.child({
    requestId,
    correlationId,
    method: request.method,
    url: request.url,
    path: request.nextUrl.pathname,
    searchParams: Object.fromEntries(request.nextUrl.searchParams),
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  // Log incoming request
  log.info('Incoming request');

  // Add correlation ID to response headers
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-correlation-id', correlationId);

  // Store logger on request for use in route handlers
  (request as any).log = log;
  (request as any).requestId = requestId;
  (request as any).correlationId = correlationId;

  return response;
}

/**
 * Wrapper for API route handlers to add logging
 */
export function withRequestLogging(
  handler: (request: NextRequest, context: { params: Promise<any> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<any> }) => {
    const requestId = request.headers.get('x-request-id') || randomUUID();
    const correlationId = request.headers.get('x-correlation-id') || requestId;

    const log = logger.child({
      requestId,
      correlationId,
      method: request.method,
      path: request.nextUrl.pathname,
    });

    (request as any).log = log;
    (request as any).requestId = requestId;
    (request as any).correlationId = correlationId;

    const start = Date.now();

    try {
      log.info('API request started');
      const response = await handler(request, context);
      const duration = Date.now() - start;

      log.info({
        statusCode: response.status,
        durationMs: duration,
      }, 'API request completed');

      response.headers.set('x-request-id', requestId);
      response.headers.set('x-correlation-id', correlationId);

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      log.error({
        err: error,
        durationMs: duration,
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 'API request failed');

      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      errorResponse.headers.set('x-request-id', requestId);
      errorResponse.headers.set('x-correlation-id', correlationId);

      return errorResponse;
    }
  };
}

/**
 * Get logger from request (for use in route handlers)
 */
export function getRequestLogger(request: NextRequest) {
  return (request as any).log || logger;
}

/**
 * Get request ID from request
 */
export function getRequestId(request: NextRequest) {
  return (request as any).requestId || request.headers.get('x-request-id');
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(request: NextRequest) {
  return (request as any).correlationId || request.headers.get('x-correlation-id');
}