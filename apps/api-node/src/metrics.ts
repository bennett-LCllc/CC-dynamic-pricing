import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

// Create a new registry (default is singleton)
export const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop lag, etc.)
collectDefaultMetrics({ register, prefix: 'nodejs_' });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
  registers: [register],
});

// Business metrics
export const propertiesTotal = new Counter({
  name: 'properties_total',
  help: 'Total number of properties created',
  labelNames: ['status'],
  registers: [register],
});

export const bookingsTotal = new Counter({
  name: 'bookings_total',
  help: 'Total number of bookings',
  labelNames: ['status', 'source'],
  registers: [register],
});

export const revenueTotal = new Counter({
  name: 'revenue_total_usd',
  help: 'Total revenue in USD',
  labelNames: ['type', 'property_id'],
  registers: [register],
});

export const activeUsers = new Histogram({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['role'],
  registers: [register],
});

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  // Use route pattern if available, fallback to path
  const route = req.route?.path || req.path;

  // Capture response finish to record metrics
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // seconds
    const code = res.statusCode.toString();

    httpRequestDuration.observe({ method: req.method, route, code }, duration);
    httpRequestCount.inc({ method: req.method, route, code });
  });

  next();
};

// Expose Prometheus metrics endpoint
export const metricsHandler = async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
};
