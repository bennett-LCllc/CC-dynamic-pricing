# Corpus Christi Ops — Run Book

**Project:** CC Ops (3 LLCs: STR, Lawn, Cleaning)  
**Stack:** Turborepo monorepo — Next.js 14 (Vercel) + Express API (Fly.io) + FastAPI ML Pricing (Fly.io) + Prisma/Postgres (Neon)  
**Last Updated:** 2026-08-28  
**Owner:** Michael Bennett

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Next.js Web)                     │
│  apps/web ──► https://cc-ops-web.vercel.app                     │
│  Env: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_PRICING_API_URL          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  FLY.IO     │ │  FLY.IO     │ │   NEON      │
    │ cc-ops-api  │ │cc-ops-pricing│ │  Postgres   │
    │  (Express)  │ │  (FastAPI)  │ │  (Primary)  │
    │  :4000      │ │  :8000      │ │  :5432      │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │ Prisma ORM
                           ▼
                    ┌─────────────┐
                    │  SHARED     │
                    │  TYPES      │
                    │ @cc-ops/    │
                    │  shared     │
                    └─────────────┘
```

**Three LLCs in One Database:**

- **STR** — Short-term rentals (Properties, Bookings, Guest Messages)
- **Lawn** — Lawn care (Customers, Jobs, Crews, Service Areas)
- **Cleaning** — Cleaning ops (Jobs, Cleaners, Checklists)

---

## 2. Quick Reference

| Service           | URL                              | Health Check | Logs                         |
| ----------------- | -------------------------------- | ------------ | ---------------------------- |
| Web (Vercel)      | `https://cc-ops-web.vercel.app`  | `/`          | Vercel Dashboard             |
| API Node (Fly)    | `https://cc-ops-api.fly.dev`     | `/health`    | `fly logs -a cc-ops-api`     |
| Pricing API (Fly) | `https://cc-ops-pricing.fly.dev` | `/health`    | `fly logs -a cc-ops-pricing` |
| Database          | Neon dashboard                   | `SELECT 1`   | Neon logs                    |

**Repo:** `/Users/michael.bennett@cognitedata.com/corpus-christi-ops`  
**Package Manager:** `yarn` (workspaces)  
**Node:** 20.x | **Python:** 3.12

---

## 3. Local Development

### Prerequisites

```bash
# Install dependencies
cd /Users/michael.bennett@cognitedata.com/corpus-christi-ops
yarn install

# Start PostgreSQL (if not using Neon dev branch)
# docker run -d --name cc-ops-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Set up .env (copy from .env.example)
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, etc.

# Generate Prisma client
cd packages/db && npx prisma generate && cd ../..

# Push schema to DB
cd packages/db && npx prisma db push && cd ../..

# Seed database
cd packages/db && npx prisma db seed && cd ../..
```

### Run All Services Locally

```bash
# Terminal 1: Express API (port 4000)
cd apps/api-node && yarn dev

# Terminal 2: FastAPI Pricing (port 8000)
cd apps/api && source .venv/bin/activate && uvicorn src.main:app --reload --port 8000

# Terminal 3: Next.js Web (port 3000)
cd apps/web && yarn dev

# Terminal 4: Prisma Studio (optional)
cd packages/db && npx prisma studio
```

### Verify Local Stack

```bash
curl http://localhost:4000/health     # Express API
curl http://localhost:8000/health     # FastAPI Pricing
curl http://localhost:3000            # Next.js Web
```

---

## 4. Deployment Procedures

### 4.1 First-Time Setup (Run Once)

#### Create Fly.io Apps

```bash
# Express API
fly launch --name cc-ops-api --region iad --dockerfile apps/api-node/Dockerfile --no-deploy
fly secrets set DATABASE_URL="postgresql://..." JWT_SECRET="$(openssl rand -base64 32)" NODE_ENV=production --app cc-ops-api
fly postgres create --name cc-ops-db --region iad --initial-cluster-size 1
fly postgres attach --app cc-ops-api cc-ops-db

# FastAPI Pricing
fly launch --name cc-ops-pricing --region iad --dockerfile apps/api/Dockerfile --no-deploy
fly secrets set DATABASE_URL="postgresql://..." PYTHONPATH=/app --app cc-ops-pricing
fly postgres attach --app cc-ops-pricing cc-ops-db
```

#### Create Vercel Project

```bash
vercel link --project cc-ops-web
vercel env add NEXT_PUBLIC_API_URL production       # https://cc-ops-api.fly.dev
vercel env add NEXT_PUBLIC_PRICING_API_URL production # https://cc-ops-pricing.fly.dev
```

#### Run Initial Migrations

```bash
# From local with production DATABASE_URL
cd packages/db
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 4.2 Routine Deployments

#### Deploy Express API (Fly.io)

```bash
cd /Users/michael.bennett@cognitedata.com/corpus-christi-ops
fly deploy --app cc-ops-api --dockerfile apps/api-node/Dockerfile

# Verify
fly status --app cc-ops-api
curl https://cc-ops-api.fly.dev/health
```

#### Deploy FastAPI Pricing (Fly.io)

```bash
cd /Users/michael.bennett@cognitedata.com/corpus-christi-ops
fly deploy --app cc-ops-pricing --dockerfile apps/api/Dockerfile

# Verify
fly status --app cc-ops-pricing
curl https://cc-ops-pricing.fly.dev/health
```

#### Deploy Web (Vercel)

```bash
cd /Users/michael.bennett@cognitedata.com/corpus-christi-ops
vercel --prod

# Or push to main branch (auto-deploys via GitHub integration)
git push origin main
```

### 4.3 Database Migrations (Production)

```bash
# Always backup first (Neon: create branch)
# Then run:
cd packages/db
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Verify
DATABASE_URL="postgresql://..." npx prisma migrate status
```

---

## 5. Environment Variables

### Express API (`apps/api-node/.env` / Fly secrets)

| Variable       | Description                | Required |
| -------------- | -------------------------- | -------- |
| `DATABASE_URL` | Postgres connection string | ✅       |
| `JWT_SECRET`   | 32+ char random string     | ✅       |
| `NODE_ENV`     | `production`               | ✅       |
| `PORT`         | `4000`                     | ✅       |
| `FRONTEND_URL` | Vercel URL for CORS        | ✅       |

### FastAPI Pricing (`apps/api/.env` / Fly secrets)

| Variable       | Description                | Required |
| -------------- | -------------------------- | -------- |
| `DATABASE_URL` | Postgres connection string | ✅       |
| `PYTHONPATH`   | `/app`                     | ✅       |
| `PORT`         | `8000`                     | ✅       |

### Next.js Web (Vercel Environment Variables)

| Variable                      | Description                      | Required |
| ----------------------------- | -------------------------------- | -------- |
| `NEXT_PUBLIC_API_URL`         | `https://cc-ops-api.fly.dev`     | ✅       |
| `NEXT_PUBLIC_PRICING_API_URL` | `https://cc-ops-pricing.fly.dev` | ✅       |
| `NEXTAUTH_SECRET`             | Random string for NextAuth       | ✅       |

---

## 6. Monitoring & Alerting

### Health Checks

```bash
# All services
curl -s https://cc-ops-api.fly.dev/health | jq .
curl -s https://cc-ops-pricing.fly.dev/health | jq .
curl -s https://cc-ops-web.vercel.app/api/health | jq .  # if exists
```

### Key Metrics to Watch

| Metric                   | Target     | Alert If |
| ------------------------ | ---------- | -------- |
| API Response Time (p95)  | < 500ms    | > 2s     |
| API Error Rate           | < 0.1%     | > 1%     |
| DB Connection Pool       | < 80% used | > 90%    |
| Fly Machine CPU          | < 70%      | > 90%    |
| Vercel Function Duration | < 10s      | > 30s    |

### Log Queries

```bash
# Fly.io logs (last 100 lines)
fly logs -a cc-ops-api -n 100
fly logs -a cc-ops-pricing -n 100

# Follow logs in real-time
fly logs -a cc-ops-api -f

# Filter for errors
fly logs -a cc-ops-api | grep -i error
```

---

## 7. Common Operations

### 7.1 Database Operations

```bash
# Open Prisma Studio (local)
cd packages/db && npx prisma studio

# Run migration locally
cd packages/db && npx prisma migrate dev --name "describe_change"

# Reset database (DEV ONLY - destroys data)
cd packages/db && npx prisma migrate reset --force

# View migration history
cd packages/db && npx prisma migrate status

# Backup (Neon: create branch via dashboard or CLI)
# Restore: point Neon project to backup branch
```

### 7.2 Scaling

```bash
# Scale Express API (horizontal)
fly scale count 3 --app cc-ops-api
fly scale memory 2048 --app cc-ops-api

# Scale Pricing API
fly scale count 2 --app cc-ops-pricing
fly scale memory 2048 --app cc-ops-pricing

# Auto-scaling is configured in fly.toml (auto_stop_machines, min_machines_running)
```

### 7.3 Secrets Management

```bash
# List secrets
fly secrets list --app cc-ops-api
fly secrets list --app cc-ops-pricing

# Update secret
fly secrets set JWT_SECRET="new-value" --app cc-ops-api

# Remove secret
fly secrets unset OLD_KEY --app cc-ops-api

# Vercel secrets
vercel env ls
vercel env add KEY production
vercel env rm KEY production
```

### 7.4 Database Connection Debugging

```bash
# Test connection from local
psql "postgresql://..." -c "SELECT version();"

# Check active connections
psql "postgresql://..." -c "
  SELECT pid, usename, application_name, client_addr, state, query_start
  FROM pg_stat_activity
  WHERE datname = current_database();
"

# Kill stuck connections
psql "postgresql://..." -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle in transaction' AND query_start < now() - interval '5 minutes';
"
```

---

## 8. Troubleshooting Guide

### 8.1 API Returns 500 / 502 / 503

**Express API (cc-ops-api)**

```bash
# 1. Check logs
fly logs -a cc-ops-api -n 200 | grep -A 10 -B 5 ERROR

# 2. Check machine status
fly status --app cc-ops-api

# 3. Check database connectivity
fly ssh console --app cc-ops-api -C "node -e \"require('@prisma/client').PrismaClient()\""

# 4. Restart if stuck
fly apps restart cc-ops-api
```

**FastAPI Pricing (cc-ops-pricing)**

```bash
# 1. Check logs
fly logs -a cc-ops-pricing -n 200

# 2. Test ML model loading
fly ssh console --app cc-ops-pricing -C "python -c \"import joblib; print('OK')\""

# 3. Restart
fly apps restart cc-ops-pricing
```

### 8.2 Database Issues

**Prisma Client Out of Sync**

```bash
# Regenerate client
cd packages/db && npx prisma generate

# Rebuild API
cd apps/api-node && yarn build
```

**Migration Failed**

```bash
# Check migration status
npx prisma migrate status

# If stuck on failed migration, resolve manually in DB then:
npx prisma migrate resolve --rolled-back "migration_name"
# OR
npx prisma migrate resolve --applied "migration_name"
```

**Connection Pool Exhausted**

```bash
# Check pool usage
fly ssh console --app cc-ops-api -C "curl localhost:4000/health"

# Increase pool size in Prisma schema or reduce concurrent requests
# datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
# Add: connection_limit = 20 (in Prisma 5+)
```

### 8.3 Web Build Failures

**TypeScript Errors**

```bash
cd apps/web && yarn typecheck
# Fix errors, then rebuild
```

**ESLint Failures**

```bash
cd apps/web && yarn lint
# Fix or: yarn lint:fix
```

**Prisma Client Missing in Web Build**

```bash
# Ensure @cc-ops/db is built first
cd packages/db && yarn build
cd ../.. && yarn build
```

### 8.4 ML Model Issues

**Model Not Loading**

```bash
# Check model files exist in Docker image
fly ssh console --app cc-ops-pricing -C "ls -la /app/src/ml/"

# Retrain if needed (local)
cd apps/api && source .venv/bin/activate && python src/ml/train.py

# Copy model to image (rebuild Docker)
fly deploy --app cc-ops-pricing --dockerfile apps/api/Dockerfile
```

**Prediction Errors**

```bash
# Test endpoint directly
curl -X POST https://cc-ops-pricing.fly.dev/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"base_rate": 175, "target_date": "2026-07-04", "property_type": "STANDARD", "bedrooms": 3}'

# Check logs for feature engineering errors
fly logs -a cc-ops-pricing | grep -i "feature\|predict\|error"
```

---

## 9. Incident Response

### Severity Levels

| Level     | Definition                               | Response Time | Escalation             |
| --------- | ---------------------------------------- | ------------- | ---------------------- |
| **SEV-1** | All services down, data loss             | 15 min        | Page owner immediately |
| **SEV-2** | Major feature broken (bookings, pricing) | 1 hour        | Notify owner           |
| **SEV-3** | Minor feature degraded                   | 4 hours       | Next business day      |
| **SEV-4** | Cosmetic / non-blocking                  | Next sprint   | Track in backlog       |

### SEV-1 Playbook (All Down)

1. **Check Fly.io status page** — `status.fly.io`
2. **Check Neon status** — `status.neon.tech`
3. **Check Vercel status** — `vercel-status.com`
4. **If Fly.io region issue:** `fly scale count 0 --app cc-ops-api && fly scale count 1 --app cc-ops-api` (forces new machine)
5. **If DB issue:** Failover to Neon read replica / restore from branch
6. **Communicate:** Update status page, notify stakeholders

### SEV-2 Playbook (Pricing API Down)

1. Fallback: Web uses static pricing engine (`apps/api/src/pricing/engine.py`)
2. Deploy hotfix to FastAPI or disable ML mount in `main.py`
3. `app.mount("/ml", ml_app)` — comment out if ML broken

---

## 10. Backup & Disaster Recovery

### Automated Backups

- **Neon:** Point-in-time recovery (7 days on free, 30+ on paid)
- **Fly.io:** Volume snapshots (if using volumes)
- **Git:** All code in GitHub (main branch protected)

### Recovery Procedures

```bash
# Database: Restore to Neon branch
# 1. Neon Dashboard → Branches → Create branch from timestamp
# 2. Update DATABASE_URL to new branch
# 3. Deploy apps

# Code: Rollback deployment
fly deploy --app cc-ops-api --image <previous-image-id>
vercel rollback <deployment-url>

# Full region failover (Fly.io)
fly apps restart cc-ops-api --region ord  # different region
```

### RTO / RPO Targets

| Component    | RTO    | RPO               |
| ------------ | ------ | ----------------- |
| Database     | 15 min | 1 min (Neon PITR) |
| API Services | 5 min  | 0 (stateless)     |
| Web          | 2 min  | 0 (static)        |
| ML Models    | 30 min | 1 day (retrain)   |

---

## 11. Security Checklist

### Monthly

- [ ] Rotate JWT_SECRET (requires re-login for all users)
- [ ] Review Fly.io audit logs
- [ ] Check for dependency vulnerabilities: `yarn audit` / `pip-audit`
- [ ] Verify SSL certs valid (Fly.io + Vercel handle automatically)

### Quarterly

- [ ] Database user permission audit
- [ ] API key rotation (any third-party integrations)
- [ ] Penetration test (if handling PII)
- [ ] Review IAM policies on Fly.io / Vercel / Neon

### Incident Response

- [ ] Incident runbook accessible
- [ ] On-call rotation defined
- [ ] Post-mortem template ready

---

## 12. Useful Commands Cheatsheet

```bash
# ── Repo ──────────────────────────────────────────────
cd /Users/michael.bennett@cognitedata.com/corpus-christi-ops
yarn install              # Install all workspaces
yarn build                # Build all packages
yarn lint                 # Lint all packages
yarn typecheck            # TypeScript check all

# ── Database ──────────────────────────────────────────
cd packages/db
npx prisma generate       # Generate client
npx prisma db push        # Push schema (dev)
npx prisma migrate dev    # Create + apply migration
npx prisma migrate deploy # Apply migrations (prod)
npx prisma studio         # Open GUI
npx prisma db seed        # Run seed.ts

# ── Fly.io ────────────────────────────────────────────
fly status -a cc-ops-api
fly logs -a cc-ops-api -f
fly ssh console -a cc-ops-api
fly secrets list -a cc-ops-api
fly scale count 2 -a cc-ops-api
fly apps restart cc-ops-api
fly deploy -a cc-ops-api --dockerfile apps/api-node/Dockerfile

# ── Vercel ────────────────────────────────────────────
vercel --prod
vercel logs <deployment-url>
vercel env ls
vercel rollback

# ── Docker (Local Testing) ────────────────────────────
docker build -t cc-ops-api -f apps/api-node/Dockerfile .
docker build -t cc-ops-pricing -f apps/api/Dockerfile .
docker run -p 4000:4000 --env-file apps/api-node/.env cc-ops-api
docker run -p 8000:8000 --env-file apps/api/.env cc-ops-pricing
```

---

## 13. Key Files Reference

```
/Users/michael.bennett@cognitedata.com/corpus-christi-ops/
├── RUNBOOK.md                    # This file
├── PLAN.md                       # Feature completion tracker
├── PACKAGES.md                   # Dependency inventory
├── turbo.json                    # Turborepo config
├── vercel.json                   # Vercel deployment config
├── .env.example                  # Environment template
├── packages/
│   ├── db/
│   │   ├── prisma/schema.prisma  # Database schema (18 models)
│   │   ├── prisma/seed.ts        # Seed data
│   │   └── package.json
│   ├── shared/
│   │   └── src/
│   │       ├── types/index.ts    # Shared TypeScript types
│   │       └── constants/        # Corpus Christi constants
│   └── ui/                       # Shared React components
├── apps/
│   ├── web/                      # Next.js 14 (Vercel)
│   │   ├── src/app/              # App Router pages
│   │   ├── src/components/       # React components
│   │   ├── src/lib/api.ts        # API client
│   │   └── vercel.json
│   ├── api-node/                 # Express API (Fly.io)
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── routes/           # Express routes
│   │   │   ├── services/         # Prisma services
│   │   │   └── middleware/       # Auth, validation
│   │   ├── Dockerfile
│   │   ├── fly.toml
│   │   └── openapi.yaml
│   └── api/                      # FastAPI Pricing (Fly.io)
│       ├── src/
│       │   ├── main.py           # FastAPI app
│       │   ├── pricing/          # Static pricing engine
│       │   └── ml/               # ML model server
│       ├── Dockerfile
│       ├── fly.toml
│       └── requirements.txt
└── scripts/                      # Utility scripts
```

---

## 14. Contacts & Escalation

| Role                | Name            | Contact                   |
| ------------------- | --------------- | ------------------------- |
| **Owner / Primary** | Michael Bennett | [Primary contact]         |
| **Fly.io Support**  | —               | `fly support` / dashboard |
| **Vercel Support**  | —               | Vercel dashboard          |
| **Neon Support**    | —               | Neon dashboard            |

---

**End of Run Book** — Keep this updated with every deployment and incident.  
_Last reviewed: 2026-08-28 by James Brown (Hermes Agent)_ 🎸
