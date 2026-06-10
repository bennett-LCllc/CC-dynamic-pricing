# CC Ops — Handoff Document

**Date:** 2026-06-09 **From:** Claude Code (OWL) **To:** Hermes-agent (Evey), future Claude Code sessions

---

## What Was Done

### Task from Hermes (ID: 1780946447)

**Request:** Review corpus-christi-ops and continue building from the roadmap: Properties CRUD — add/edit/delete properties with photos.

**Result:** Properties CRUD was already fully implemented from a prior session. Completed the remaining photo UI:

1. **Photo management in PropertyForm** — URL input, caption, category selector (11 categories), reorder/remove photos, submitted with create/update payload
2. **Photo gallery on property detail page** — responsive 4-column grid with captions, graceful fallback for broken URLs
3. **Fixed** `ZodEffects.partial()` **TS error** in bookings route (extracted `baseSchema` pattern)
4. **Fixed** `CreateBookingInput` **types** — made `totalNights`/`subtotal`/`totalAmount` optional (service auto-calculates)

### Additional Bookings UI (built same session)

5. **Bookings list page** (`apps/web/src/app/bookings/page.tsx`) — search, status/property filters, grouped cards (Active/Upcoming/Past), summary stats
6. **BookingForm component** (`apps/web/src/components/bookings/BookingForm.tsx`) — create/edit modal
7. **Booking detail page** (`apps/web/src/app/bookings/[id]/page.tsx`) — guest info, stay details, financial breakdown

### Code Cleanup

 8. Fixed 2 TS compilation errors (QuickActions + Sidebar `href` types)
 9. Removed 9 unused imports across 6 files
10. Fixed all 9 catch blocks from `catch (err: any)` + `err.message` → safer `err instanceof Error` pattern
11. Extracted `StatusBadge` and `PlatformBadge` to `components/shared/` (removed 3 duplicate local definitions)

### Cleaning Scheduler (built prior session)

12. **Backend service** (`apps/api-node/src/services/cleaning.ts`) — full Prisma CRUD: getJobs (with filters), getJob, create, update, cancel (soft delete), submitChecklist (upsert), addPhoto, getCleaners
13. **Backend routes** (`apps/api-node/src/routes/cleaning.ts`) — 8 Express endpoints with zod validation
14. **Wired into index.ts** — `app.use('/api/cleaning', cleaningRoutes)` uncommented
15. **Shared types** — added `CleaningType`, `JobStatus`, `CleaningJob`, `CleaningChecklist`, `CleaningPhoto`, `Cleaner`, `CreateCleaningJobInput`, `UpdateCleaningJobInput`, `CleaningJobFilters`; updated `CleaningJobSummary` to match API shape
16. **API client** (`apps/web/src/lib/api.ts`) — 8 new functions: `getCleaningJobs`, `getCleaningJob`, `createCleaningJob`, `updateCleaningJob`, `deleteCleaningJob`, `submitCleaningChecklist`, `addCleaningPhoto`, `getCleaners`
17. **Cleaning list page** (`apps/web/src/app/cleaning/page.tsx`) — status-grouped job cards (Pending/Assigned/In Progress/Completed/Quality Check), search, status/property filters, summary stats (jobs today, total, pending, revenue)
18. **CleaningJobForm** (`apps/web/src/components/cleaning/CleaningJobForm.tsx`) — create/edit modal with property, booking link, schedule, type, status, cleaner, property details, financials, notes
19. **Cleaning job detail page** (`apps/web/src/app/cleaning/[id]/page.tsx`) — job details, cost breakdown, profit calculation, interactive checklist (type-specific templates), photo gallery, linked booking, edit/cancel actions

### Lawn Scheduler (built prior session)

20. **Backend service** (`apps/api-node/src/services/lawn.ts`) — full Prisma CRUD: getLawnJobs (with filters), getLawnJob, create, update, cancel (soft delete), addLawnPhoto, getLawnCrews
21. **Backend routes** (`apps/api-node/src/routes/lawn.ts`) — 7 Express endpoints with zod validation
22. **Wired into index.ts** — `app.use('/api/lawn', lawnRoutes)` active
23. **LawnJobForm** (`apps/web/src/components/lawn/LawnJobForm.tsx`) — create/edit modal with property, crew, schedule, service type, lot size, status, financials, notes
24. **Lawn list page** (`apps/web/src/app/lawn/page.tsx`) — replaced placeholder with status-grouped job cards (Pending/Assigned/In Progress/Completed/Issue Reported), search, status/property/crew filters, summary stats (jobs today, total, pending, revenue)
25. **Lawn job detail page** (`apps/web/src/app/lawn/[id]/page.tsx`) — job details, cost breakdown, profit calculation, photo gallery, crew info, edit/cancel actions, issue reporting section
26. **Lawn API client** — added `getLawnJobs`, `getLawnJob`, `createLawnJob`, `updateLawnJob`, `deleteLawnJob`, `getLawnCrews` to `apps/web/src/lib/api.ts`

### Financial Dashboard (built this session)

27. **Backend service** (`apps/api-node/src/services/financials.ts`) — Prisma service: getExpenses (with filters), createExpense, updateExpense, deleteExpense, getFinancialOverview (consolidated P&L), getLLCFinancials (per-LLC breakdown)
28. **Backend routes** (`apps/api-node/src/routes/financials.ts`) — 6 Express endpoints with zod validation: overview, per-LLC, expense CRUD
29. **Wired into index.ts** — `app.use('/api/financials', financialsRoutes)` active
30. **Shared types** — added `ExpenseCategory`, `LLC`, `RecurringInterval`, `Expense`, `CreateExpenseInput`, `UpdateExpenseInput`, `ExpenseFilters`, `FinancialOverview` to `packages/shared/src/types/index.ts`
31. **API client** — added `getFinancialOverview`, `getLLCFinancials`, `getExpenses`, `createExpense`, `updateExpense`, `deleteExpense` to `apps/web/src/lib/api.ts`
32. **Financials page** (`apps/web/src/app/financials/page.tsx`) — replaced placeholder with consolidated P&L card, per-LLC cards (STR/Lawn/Cleaning) with expandable margins, expense breakdown pie chart (Recharts), sortable expense table with search/filters/CRUD
33. **ExpenseForm** (`apps/web/src/components/financials/ExpenseForm.tsx`) — add/edit modal with description, amount, date, category, LLC, vendor, recurring, notes

### Customer Management (built this session)

34. **Backend service** (`apps/api-node/src/services/customers.ts`) — Prisma service: getCustomers (with search/filter), getCustomer (with properties + jobs), createCustomer, updateCustomer, deleteCustomer (soft delete → INACTIVE)
35. **Backend routes** (`apps/api-node/src/routes/customers.ts`) — 5 Express endpoints with zod validation: list, detail, create, update, deactivate
36. **Wired into index.ts** — `app.use('/api/customers', customerRoutes)` active
37. **Shared types** — added CustomerType, CustomerStatus, LotSize, LawnPackage, CleaningFrequency, ServiceType, CustomerProperty, ExternalLawnJob, ExternalCleaningJob, Customer, CreateCustomerInput, UpdateCustomerInput, CustomerFilters
38. **API client** — added `getCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer` to `apps/web/src/lib/api.ts`
39. **Customers page** (`apps/web/src/app/customers/page.tsx`) — card grid with search, type/status filters, summary stats (total, active, properties, MRR), create button
40. **CustomerForm** (`apps/web/src/components/customers/CustomerForm.tsx`) — create/edit modal with name, email, phone, company, type, status, notes
41. **Customer detail page** (`apps/web/src/app/customers/[id]/page.tsx`) — contact info, properties table, lawn/cleaning job lists with revenue totals

**TypeScript: 0 errors.** Both `apps/web` and `apps/api-node` compile cleanly.

---

## Project State

### ✅ Complete Features

| Feature | Backend (API) | Frontend (Web) | Notes |
| --- | --- | --- | --- |
| Database schema | ✅ Prisma | — | 18 models covering all 3 LLCs |
| Seed data | ✅ | — | 2 properties, 4 bookings, cleaners, crews, jobs, expenses |
| Pricing engine | ✅ FastAPI | ✅ Page | Single-night calculator + multi-day forecast |
| Properties CRUD | ✅ Express routes + service | ✅ List + Detail + Form | Photos via URL (S3 phase 2) |
| Bookings CRUD | ✅ Express routes + service | ✅ List + Detail + Form | Calendar API built, UI pending |
| Dashboard | ✅ API | ✅ Page | Stats, quick actions, recent activity, alerts, LLC summary |
| Shared components | — | ✅ Header, Sidebar, StatusBadge, PlatformBadge | Extracted from duplicates |
| Cleaning Scheduler | ✅ Express routes + service | ✅ List + Detail + Form | Checklist templates, photos, financials |
| Lawn Scheduler | ✅ Express routes + service | ✅ List + Detail + Form | Crew dispatch, photos, financials, issue reporting |
| Financial Dashboard | ✅ Express routes + service | ✅ Page + ExpenseForm | Per-LLC P&L, consolidated view, expense pie chart, expense CRUD |
| Bookings Calendar | ✅ (API existed) | ✅ Calendar page | Month/week toggle, property color-coding, booking chips, period stats |
| Guest Messaging | ✅ Express routes + service | ✅ Page + Thread component | Template CRUD, message thread, channel selector, variable substitution |
| Customer Management | ✅ Express routes + service | ✅ List + Detail + Form | External customers, properties, lawn/cleaning jobs |

### 🚧 Remaining Features (see PLAN.md for full detail)

1. ~~Bookings Calendar View~~ ✅ Complete
2. ~~Guest Messaging~~ ✅ Complete
3. ~~Customer Management~~ ✅ Complete
4. Settings & Auth

---

## Architecture

```
corpus-christi-ops/
├── apps/
│   ├── web/              # Next.js 14 dashboard (port 3000)
│   │   ├── src/app/      # Pages (/, /properties, /bookings, /cleaning, /lawn, /financials, /pricing, /messages, /settings)
│   │   ├── src/components/
│   │   │   ├── shared/   # Header, Sidebar, StatusBadge, PlatformBadge
│   │   │   ├── bookings/ # BookingForm
│   │   │   ├── cleaning/ # CleaningJobForm
│   │   │   ├── properties/ # PropertyForm
│   │   │   ├── dashboard/  # StatsCards, QuickActions, RecentActivity, AlertsPanel, LLCSummary
│   │   │   ├── financials/ # ExpenseForm
│   │   │   └── customers/  # CustomerForm
│   │   └── src/lib/      # api.ts (all API client functions)
│   ├── api/              # FastAPI pricing engine (port 8000)
│   └── api-node/         # Express.js REST API (port 4000)
│       ├── src/routes/   # properties.ts, bookings.ts, dashboard.ts, cleaning.ts, lawn.ts, financials.ts, customers.ts
│       └── src/services/ # properties.ts, bookings.ts, dashboard.ts, cleaning.ts, lawn.ts, financials.ts, customers.ts
├── packages/
│   ├── db/               # Prisma schema + seed
│   └── shared/           # Shared types (Property, Booking, CleaningJob, etc.)
├── PLAN.md               # Development plan with remaining features
└── HANDOFF.md            # This file
```

---

## Patterns to Follow

### Backend (Express + Prisma)

```typescript
// Route pattern: zod validation → service → response
router.get('/', async (req, res) => {
  try {
    const data = await getService(params);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// Service pattern: Prisma query → return
export async function getService() {
  return prisma.model.findMany({ include: { ... } });
}
```

### Frontend (Next.js + Tailwind)

```typescript
// Page pattern: useState + useEffect for data fetching
const [items, setItems] = useState([]);
useEffect(() => { fetchItems(); }, []);

// Form pattern: modal with local state, submit via API client
const [form, setForm] = useState(defaults);
const handleSubmit = async (e) => {
  await createItem(form);
  onSaved();
};

// Error handling: catch (err) with instanceof Error
catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to load');
}
```

### Shared Types

- Defined in `packages/shared/src/types/index.ts`
- Imported as `import type { ... } from '@cc-ops/shared'`
- Prisma types imported from `@cc-ops/db`

---

## Key Files

| Purpose | File |
| --- | --- |
| Shared types | `packages/shared/src/types/index.ts` |
| Property API routes | `apps/api-node/src/routes/properties.ts` |
| Property service | `apps/api-node/src/services/properties.ts` |
| Booking API routes | `apps/api-node/src/routes/bookings.ts` |
| Booking service | `apps/api-node/src/services/bookings.ts` |
| Cleaning API routes | `apps/api-node/src/routes/cleaning.ts` |
| Cleaning service | `apps/api-node/src/services/cleaning.ts` |
| API entry | `apps/api-node/src/index.ts` |
| Web API client | `apps/web/src/lib/api.ts` |
| Property form | `apps/web/src/components/properties/PropertyForm.tsx` |
| Properties list | `apps/web/src/app/properties/page.tsx` |
| Property detail | `apps/web/src/app/properties/[id]/page.tsx` |
| Booking form | `apps/web/src/components/bookings/BookingForm.tsx` |
| Bookings list | `apps/web/src/app/bookings/page.tsx` |
| Booking detail | `apps/web/src/app/bookings/[id]/page.tsx` |
| Cleaning job form | `apps/web/src/components/cleaning/CleaningJobForm.tsx` |
| Cleaning list | `apps/web/src/app/cleaning/page.tsx` |
| Cleaning job detail | `apps/web/src/app/cleaning/[id]/page.tsx` |
| Lawn API routes | `apps/api-node/src/routes/lawn.ts` |
| Lawn service | `apps/api-node/src/services/lawn.ts` |
| Lawn job form | `apps/web/src/components/lawn/LawnJobForm.tsx` |
| Lawn list | `apps/web/src/app/lawn/page.tsx` |
| Lawn job detail | `apps/web/src/app/lawn/[id]/page.tsx` |
| Dashboard home | `apps/web/src/app/page.tsx` |
| Financials page | `apps/web/src/app/financials/page.tsx` |
| Expense form | `apps/web/src/components/financials/ExpenseForm.tsx` |
| StatusBadge | `apps/web/src/components/shared/StatusBadge.tsx` |
| PlatformBadge | `apps/web/src/components/shared/PlatformBadge.tsx` |
| Messages API routes | `apps/api-node/src/routes/messages.ts` |
| Messages service | `apps/api-node/src/services/messages.ts` |
| Messages page | `apps/web/src/app/messages/page.tsx` |
| MessageThread | `apps/web/src/components/messages/MessageThread.tsx` |
| Customers API routes | `apps/api-node/src/routes/customers.ts` |
| Customers service | `apps/api-node/src/services/customers.ts` |
| Customer form | `apps/web/src/components/customers/CustomerForm.tsx` |
| Customers list | `apps/web/src/app/customers/page.tsx` |
| Customer detail | `apps/web/src/app/customers/[id]/page.tsx` |

---

## Running the Project

```bash
# 1. Start DB
docker-compose up -d

# 2. Install + seed
npm install
npm run db:push
npm run db:seed

# 3. Start API (terminal 1)
cd apps/api-node && npm run dev

# 4. Start web (terminal 2)
cd apps/web && npm run dev

# 5. Open http://localhost:3000
```

---

## TypeScript Compiles Clean

```bash
cd apps/web && npx tsc --noEmit    # 0 errors
cd apps/api-node && npx tsc --noEmit  # 0 errors
```

---

## Hermes Bridge

Tasks from Hermes-agent arrive at `~/.hermes/claude-bridge/inbox/*.yaml`Responses go to `~/.hermes/claude-bridge/outbox/*.yaml`Active tasks at `~/.hermes/claude-bridge/active/`

Task ID `1780946447` (Properties CRUD) — **complete**, response sent.