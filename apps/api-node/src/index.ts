/**
 * CC Ops — Node.js REST API
 *
 * Handles: CRUD operations, webhooks, integrations, authentication
 * Run with: npm run dev (port 4000)
 */

import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import logger, { requestLogger, responseLogger } from './logger';

import { metricsHandler, metricsMiddleware } from './metrics';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import bookingRoutes from './routes/bookings';
import cleaningRoutes from './routes/cleaning';
import customerRoutes from './routes/customers';
import dashboardRoutes from './routes/dashboard';
import financialsRoutes from './routes/financials';
import lawnRoutes from './routes/lawn';
import messageRoutes from './routes/messages';
import propertyRoutes from './routes/properties';
import settingsRoutes from './routes/settings';
import { sentryErrorHandler, sentryRequestHandler } from './sentry';
import { setupSwagger } from './swagger';

const app = express();
const PORT = process.env.PORT || 4000;

// Sentry request handler - must be before all other middleware
app.use(sentryRequestHandler);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
  }),
);
app.use(express.json());
app.use(requestLogger);
app.use(responseLogger);

// Collect metrics before handling routes
app.use(metricsMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'cc-ops-api', timestamp: new Date().toISOString() });
});

// Expose /metrics endpoint for Prometheus scraping
app.get('/metrics', metricsHandler);

// Swagger API docs
setupSwagger(app);

// Global auth middleware for all /api routes except /api/v1/auth/login and /api/v1/auth/register.
// NOTE: Express strips the mount prefix, so req.path for "/api/v1/auth/login" is "/auth/login".
// Match on req.originalUrl (the unstripped path) so the exemption actually fires.
app.use('/api', (req, res, next) => {
  const url = req.originalUrl;
  if (url.startsWith('/api/v1/auth/login') || url.startsWith('/api/v1/auth/register')) {
    next();
    return;
  }
  authMiddleware(req, res, next);
});

// Routes
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/cleaning', cleaningRoutes);
app.use('/api/v1/lawn', lawnRoutes);
app.use('/api/v1/financials', financialsRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/settings', settingsRoutes);
// app.use('/api/v1/expenses', expenseRoutes);
// app.use('/api/v1/webhooks', webhookRoutes);

// Sentry error handler - must be after all routes
app.use(sentryErrorHandler);

// Generic error handler for non-Sentry errors
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, message: err.message }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`CC Ops API running on http://localhost:${PORT}`);
});
