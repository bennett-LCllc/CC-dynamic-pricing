/**
 * CC Ops — Node.js REST API
 *
 * Handles: CRUD operations, webhooks, integrations, authentication
 * Run with: npm run dev (port 4000)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import propertyRoutes from './routes/properties';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'cc-ops-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/properties', propertyRoutes);

// Future routes:
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/cleaning', cleaningRoutes);
// app.use('/api/lawn', lawnRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/expenses', expenseRoutes);
// app.use('/api/webhooks', webhookRoutes);

app.listen(PORT, () => {
  console.log(`CC Ops API running on http://localhost:${PORT}`);
});
