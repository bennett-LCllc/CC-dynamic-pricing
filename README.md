# CC Ops — Corpus Christi STR Portfolio Operations Platform

> Full-stack operations platform for managing short-term rental, lawn care, and cleaning businesses.

## Architecture

```
corpus-christi-ops/
├── apps/
│   ├── web/          # Next.js 14 dashboard (port 3000)
│   ├── api/          # FastAPI pricing engine (port 8000)
│   └── api-node/     # Express.js REST API (port 4000)
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── shared/       # Shared types, constants, utils
│   └── ui/           # Shared UI components (future)
└── docker-compose.yml
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
docker-compose up -d
```

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env with your database URL:
# DATABASE_URL="postgresql://ccops:ccops_dev_password@localhost:5432/corpus_christi_ops"
```

### 4. Initialize the database

```bash
npm run db:push        # Push schema to database
npm run db:seed        # Seed sample data
```

### 5. Start the apps

```bash
# Terminal 1 — Next.js dashboard
cd apps/web && npm run dev

# Terminal 2 — FastAPI pricing engine
cd apps/api && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Terminal 3 — Node.js API (when ready)
cd apps/api-node && npm run dev
```

### 6. Open the dashboard

Navigate to [http://localhost:3000](http://localhost:3000)

## What's Included

### ✅ Built
- **Database schema** — Full Prisma schema covering all 3 LLCs (STR, Lawn, Cleaning)
- **Pricing engine** — FastAPI service with Corpus Christi-specific seasonal, event, and occupancy-based pricing
- **Dashboard** — Next.js 14 app with sidebar navigation, stats cards, LLC overview
- **Pricing page** — Interactive single-night calculator + multi-day forecast
- **Seed data** — Sample properties, bookings, cleaners, crews, jobs, and expenses

### 🚧 Next (build in this order)
1. **Properties CRUD** — Add/edit/delete properties with photos
2. **Bookings management** — Calendar view, Airbnb/VRBO sync
3. **Cleaning scheduler** — Dispatch, checklists, photo verification
4. **Lawn scheduler** — Route optimization, crew management
5. **Financial dashboard** — Per-LLC P&L, consolidated view
6. **Guest messaging** — Automated templates, Airbnb API integration
7. **Customer management** — External lawn/cleaning customers
8. **Expense tracking** — Receipt upload, recurring expenses, tax reports

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| API (data) | Express.js + TypeScript |
| API (pricing) | FastAPI + Python |
| Database | PostgreSQL + Prisma ORM |
| Cache/Queue | Upstash Redis |
| Auth | NextAuth.js |
| Charts | Recharts |
| Icons | Lucide React |

## LLC Structure

The platform manages three separate businesses:

- **STR LLC** — Property acquisition, booking management, guest experience
- **Lawn LLC** — Lawn maintenance for STR properties (internal) + external customers
- **Cleaning LLC** — Turnover cleaning for STR properties (internal) + external customers

Each LLC has its own P&L tracking, with a consolidated view that eliminates internal transfers.

## License

MIT
