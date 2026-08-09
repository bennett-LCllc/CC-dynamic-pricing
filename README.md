## Observability

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry ingest URL. If omitted, error tracking is disabled. |
| `LOG_LEVEL` | Logging verbosity (`error`, `warn`, `info`, `debug`, `trace`). Default: `info`. |
| `NODE_ENV` | Process environment; controls metric sampling (`tracesSampleRate`). |
| `CORRELATION_ID` | Optional override for request‑level correlation ID. |
| `PROMETHEUS_PULL_INTERVAL` | How often Prometheus should scrape `/metrics` (seconds). Default: `15`. |

### Local Development

1. **Start the API server**  
   ```bash
   npm run dev --prefix apps/api-node
   ```
2. **View logs** – pino emits structured JSON. In dev you’ll see pretty‑printed output thanks to `pino-pretty`.  
3. **Check metrics** – `curl http://localhost:4000/metrics | head -n 20` returns the Prometheus metric list.  
4. **Visualize metrics** – Open Grafana, add a Prometheus data source pointing at `http://localhost:4000/metrics`, then import the dashboard JSON at `grafana/dashboard-observability.json`.  

### CI/CD Integration

- Export `SENTRY_DSN` in your CI secret store if you want failures captured in Sentry.  
- Add a health‑check step that `curl`s `/metrics` and verifies a non‑empty response.  
- No extra steps are required for Sentry or Prometheus when using the default configuration.