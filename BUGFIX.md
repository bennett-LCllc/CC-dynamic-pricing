# Bugfix Report — 2026-06-23

**Scope:** Full security audit remediation based on HermaGuard report (`hermaguard-20260623-0419-a843ad7.json`)
**Branch:** `feature/hermes-experiment` (commit `a843ad7`)
**Files changed:** 10

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 1 | Fixed |
| HIGH     | 4 | Fixed |
| MEDIUM   | 4 | Fixed |
| LOW      | 3 | Fixed |

---

## HG-001 — CRITICAL: Hardcoded JWT Secret

**File:** `apps/api-node/src/services/auth.ts`

Removed the hardcoded fallback `'dev-secret-change-in-production'`. The app now fails at startup with `process.exit(1)` if `JWT_SECRET` is not set in the environment.

```ts
// Before
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// After
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
```

---

## HG-002 — HIGH: No Authentication on API Routes

**File:** `apps/api-node/src/index.ts`

Added global `authMiddleware` for all `/api/*` routes. Exemptions: `/api/auth/login` and `/api/auth/register`.

```ts
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
    next();
    return;
  }
  authMiddleware(req, res, next);
});
```

This protects: bookings, properties, dashboard, financials, messages, customers, cleaning, lawn, and settings routes.

---

## HG-003 — HIGH: Role Escalation on User Update

**File:** `apps/api-node/src/routes/auth.ts`

Non-admin users can no longer modify the `role` field on `PUT /api/auth/users/:id`. Returns 403 if a non-admin attempts to change roles.

```ts
if (req.user!.role !== 'ADMIN' && parsed.data.role !== undefined) {
  res.status(403).json({ error: 'Only admins can change user roles' });
  return;
}
```

---

## HG-004 — HIGH: Unauthenticated Settings Leak

**File:** `apps/api-node/src/routes/settings.ts`

Added `authMiddleware` to `GET /api/settings`, which previously returned all stored API keys and platform credentials without authentication.

```ts
// Before
router.get('/', async (_req, res) => { ... });

// After
router.get('/', authMiddleware, async (_req, res) => { ... });
```

---

## HG-005 — HIGH: No Date Validation on Booking Creation

**File:** `apps/api-node/src/services/bookings.ts`

Added validation for `checkIn`/`checkOut` dates and a `isNaN` guard on `totalAmount`:

- Rejects invalid date strings (`isNaN(date.getTime())`)
- Rejects `checkOut <= checkIn`
- Rejects `NaN` total amounts before database write

---

## HG-006 — MEDIUM: Booking Overlap (Double-Booking)

**File:** `apps/api-node/src/services/bookings.ts`

Added an overlap check before `prisma.booking.create`. Queries for existing non-cancelled/non-no-show bookings on the same property with overlapping date ranges. Throws an error if a conflict is found.

---

## HG-007 — MEDIUM: Dashboard Revenue/Expense Inversion

**File:** `apps/api-node/src/services/dashboard.ts`

- Fixed `lawn` and `cleaning` LLC `mtdRevenue` — was incorrectly set to `lawnExpenses`/`cleaningExpenses`. Now correctly set to `0` with a comment noting revenue tracking is not yet implemented.
- Replaced hardcoded unit caps (`/ 15`, `/ 45`, `/ 50`) with dynamic values (`activeProperties`, `activeCustomers`).

---

## HG-008 — MEDIUM: Unrestricted Account Deletion

**File:** `apps/api-node/src/routes/auth.ts`

- Restricted `DELETE /api/auth/users/:id` to ADMIN role only (403 for non-admins).
- Added last-admin guard: prevents deletion if the target is the last remaining admin account.

---

## HG-009 — MEDIUM: JWT Token Lifetime Too Long

**Files:** `apps/api-node/src/services/auth.ts`, `packages/db/prisma/schema.prisma`

- Reduced `JWT_EXPIRES_IN` from `'7d'` to `'1h'`.
- Added `tokenVersion Int @default(0)` to the `User` Prisma model.
- `TokenPayload` now includes `tokenVersion`.
- `updateUser` increments `tokenVersion` when a password is changed, invalidating all previously issued tokens.
- Login and register routes include `tokenVersion` in the signed JWT.

**Migration:** `packages/db/prisma/schema.prisma` updated; `prisma db push` applied.

---

## HG-010 — LOW: Empty String Update Silently Ignored

**File:** `apps/api-node/src/services/bookings.ts`

Changed `if (data.guestName)` to `if (data.guestName !== undefined)` so that setting `guestName` to an empty string is no longer silently ignored.

---

## HG-011 — LOW: Month-Boundary Revenue Misattribution

**File:** `apps/api-node/src/services/financials.ts`

Changed STR revenue query from filtering by `checkIn` to `checkOut`, so revenue is attributed to the month the guest actually stayed (correct for bookings spanning month boundaries).

---

## HG-012 — LOW: CORS Hardcoded to Localhost

**File:** `apps/api-node/src/index.ts`

CORS origin now reads from `ALLOWED_ORIGINS` env var (comma-separated). Falls back to `['http://localhost:3000', 'http://localhost:3001']` if not set.

```ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001']
}));
```

---

## Infrastructure

- **PostgreSQL** started via `docker-compose.yml` (postgres:16-alpine, container `cc-ops-db`).
- **Schema sync:** `prisma db push` applied to create all tables including the new `tokenVersion` column.
- **TypeScript:** Both `apps/api-node` and `packages/db` pass `tsc --noEmit` cleanly.
- **Env:** Symlinked root `.env` → `packages/db/.env` so Prisma commands work from that directory.
