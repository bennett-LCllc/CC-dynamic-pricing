# Observability Implementation Plan

## Current State Analysis

### ✅ Already Implemented (API Node)
- **Structured Logging**: Pino logger with request correlation IDs (`logger.ts`, `requestLogger`)
- **Error Tracking**: Sentry initialization with Node & HTTP integrations (`sentry.ts`)
- **Metrics**: Prometheus client with custom metrics (`metrics.ts`) - but has bugs
- **Health Check**: `/health` endpoint
- **Swagger**: API docs at `/api-docs`
- **Prometheus Endpoint**: `/metrics` exposed

### ❌ Missing / Broken
1. **Dependencies not in package.json**: pino, pino-pretty, prom-client, @sentry/node, @sentry/tracing, swagger-ui-express, js-yaml
2. **Metrics middleware bugs**: Incorrect label handling, timer logic flawed
3. **Web app (Next.js)**: No logging, no Sentry, no metrics
4. **Docker Compose**: No Prometheus, Grafana, Loki, Tempo
5. **No centralized log aggregation**: No Loki/Grafana for logs
6. **No distributed tracing**: No Tempo/Jaeger
7. **No alerting rules**: No PrometheusAlertmanager

---

## Implementation Plan

### Phase 1: Fix API Node Dependencies & Metrics
**Files to modify:**
- `apps/api-node/package.json` - Add missing dependencies
- `apps/api-node/src/metrics.ts` - Fix metrics middleware bugs
- `apps/api-node/src/sentry.ts` - Add error handler middleware registration
- `apps/api-node/src/logger.ts` - Add log levels, child loggers for modules

**New dependencies for api-node:**
```json
{
  "dependencies": {
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0",
    "prom-client": "^15.1.0",
    "@sentry/node": "^8.0.0",
    "@sentry/tracing": "^8.0.0",
    "swagger-ui-express": "^5.0.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

### Phase 2: Add Observability to Web App (Next.js)
**Files to create/modify:**
- `apps/web/package.json` - Add observability dependencies
- `apps/web/src/lib/logger.ts` - Pino logger for client/server
- `apps/web/src/lib/sentry.ts` - Sentry initialization (client + server)
- `apps/web/src/middleware.ts` - Request logging middleware
- `apps/web/next.config.js` - Sentry webpack plugin config
- `apps/web/src/app/layout.tsx` - Error boundary + Sentry init

**New dependencies for web:**
```json
{
  "dependencies": {
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0",
    "@sentry/nextjs": "^8.0.0"
  },
  "devDependencies": {
    "@sentry/nextjs": "^8.0.0"
  }
}
```

### Phase 3: Shared Observability Package
**Files to create:**
- `packages/observability/package.json` - Shared types, utilities
- `packages/observability/src/index.ts` - Common interfaces, log levels, metric names
- `packages/observability/src/logger.ts` - Shared logger factory
- `packages/observability/src/metrics.ts` - Shared metric definitions

### Phase 4: Infrastructure (Docker Compose)
**Files to modify:**
- `docker-compose.yml` - Add Prometheus, Grafana, Loki, Tempo, Alertmanager
- `grafana/prometheus.yml` - Prometheus scrape config
- `grafana/loki-config.yml` - Loki config
- `grafana/tempo-config.yml` - Tempo config
- `grafana/datasources.yml` - Grafana datasource provisioning
- `grafana/dashboards/` - Additional dashboards

### Phase 5: Environment Variables
**Files to modify:**
- `.env.example` - Add observability env vars
- `.env` - Local development values

---

## Detailed Implementation

### 1. Fix `apps/api-node/package.json`
Add all missing dependencies that are currently imported but not declared.

### 2. Fix `apps/api-node/src/metrics.ts`
Current bugs:
- Line 28: `end = httpRequestDuration.startTimer({ method, route })` - starts timer but labels not applied correctly
- Line 32-34: Label override logic is broken - `.labels()` returns a metric with labels, doesn't set them
- Line 37-45: Response override captures status but timer stop is wrong

Correct approach:
```typescript
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const code = res.statusCode.toString();

    httpRequestDuration.observe({ method: req.method, route, code }, duration);
    httpRequestCount.inc({ method: req.method, route, code });
  });

  next();
};
```

### 3. Add Sentry Error Handler
In `sentry.ts`, export error handler middleware for Express:
```typescript
import { errorHandler as sentryErrorHandler } from '@sentry/node';
// ... after init
export const sentryErrorHandlerMiddleware = Sentry.Handlers.errorHandler();
```

### 4. Web App Observability
- **Client-side**: @sentry/nextjs with browser tracing
- **Server-side**: @sentry/nextjs with Node tracing
- **Logger**: Pino with browser-safe transport
- **Middleware**: Request logging with correlation IDs

### 5. Docker Compose Stack
```yaml
services:
  prometheus:
    image: prom/prometheus:v2.47
    ports: ['9090:9090']
    volumes: ['./grafana/prometheus.yml:/etc/prometheus/prometheus.yml']
  
  grafana:
    image: grafana/grafana:10.1
    ports: ['3001:3000']
    volumes: ['./grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml',
              './grafana/dashboards:/etc/grafana/provisioning/dashboards']
    environment: ['GF_SECURITY_ADMIN_USER=admin', 'GF_SECURITY_ADMIN_PASSWORD=admin']

  loki:
    image: grafana/loki:2.9
    ports: ['3100:3100']
    volumes: ['./grafana/loki-config.yml:/etc/loki/local-config.yaml']

  tempo:
    image: grafana/tempo:2.3
    ports: ['3200:3200', '4317:4317']
    volumes: ['./grafana/tempo-config.yml:/etc/tempo.yaml']

  alertmanager:
    image: prom/alertmanager:v0.26
    ports: ['9093:9093']
```

---

## Environment Variables to Add

```bash
# Observability
LOG_LEVEL=info
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=

# Prometheus/Grafana (for docker-compose)
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
LOKI_URL=http://loki:3100
TEMPO_URL=http://tempo:3200
```

---

## Metrics to Collect

### HTTP (already partially implemented)
- `http_requests_total` - Counter by method, route, code
- `http_request_duration_seconds` - Histogram by method, route, code

### Business Metrics (to add)
- `properties_total` - Gauge
- `bookings_total` - Counter by status
- `revenue_total` - Counter by type
- `active_users` - Gauge

### System Metrics (auto from prom-client)
- `process_cpu_seconds_total`
- `process_resident_memory_bytes`
- `event_loop_lag_seconds`

---

## Log Structure

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "service": "cc-ops-api",
  "requestId": "uuid",
  "correlationId": "uuid",
  "msg": "Property created",
  "propertyId": "123",
  "userId": "456"
}
```

---

## Acceptance Criteria

- [ ] All dependencies declared in package.json files
- [ ] API Node metrics work correctly (no bugs)
- [ ] Sentry captures errors in both API and Web
- [ ] Web app has request logging with correlation IDs
- [ ] Docker compose runs full observability stack
- [ ] Grafana dashboard shows real data
- [ ] Logs aggregated in Loki, queryable in Grafana
- [ ] Traces in Tempo, queryable in Grafana
- [ ] Alert rules for 5xx rate, latency p99, error rate