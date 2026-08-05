# Bluma Juice Cold Press — ERP + POS

A cloud-based ERP and POS system for a cold-pressed juice manufacturer, covering
manufacturing (recipes, batch tracking, expiry/FEFO), multi-warehouse inventory, purchasing,
point-of-sale, CRM/loyalty, subscriptions, delivery, waste management, and accounting with
automatic journal posting.

Full design documentation (functional spec, user stories, ERD, API design, wireframes, and
roadmap) is in [`docs/`](./docs/README.md).

## Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: NestJS, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh) with role-based access control
- **Deployment**: Docker Compose (Postgres, Redis, backend, frontend)

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

Then seed the database (chart of accounts, warehouses, admin user, demo product/recipe):

```bash
docker compose exec backend npm run prisma:deploy
docker compose exec backend npm run prisma:seed
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Swagger docs: http://localhost:3001/api/docs
- Demo login: `admin@blumajuice.com` / `BlumaAdmin123!`

## Local development (without Docker)

Requires Node.js 20+ and a local/remote PostgreSQL instance.

```bash
# Backend
cd backend
cp .env.example .env   # point DATABASE_URL at your Postgres instance
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev       # http://localhost:3001

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:3000
```

## Project layout

```
backend/    NestJS REST API + Prisma schema
frontend/   Next.js web app (POS terminal, dashboard, and all ERP modules)
docs/       Functional spec, user stories, ERD, API design, wireframes, roadmap
```

See [`docs/08-source-code-structure.md`](./docs/08-source-code-structure.md) for the full
module-by-module breakdown.

## Mobile (Android / iOS)

The backend is a stateless JWT-secured REST API, so it's ready to serve a future React
Native app without changes. See [`docs/10-full-roadmap.md`](./docs/10-full-roadmap.md)
(Phase 4) for the planned approach (driver app, cashier app, manager app).

## What's implemented vs. planned

This is a working MVP: every module in the spec has real backend logic (FEFO allocation,
batch traceability, auto-journal posting, expiry alerts, etc.) and a functional UI, not just
scaffolding. Marketplace integration (Tokopedia/Shopee/TikTok Shop) is architected but not
wired to live marketplace accounts yet. See
[`docs/09-mvp-roadmap.md`](./docs/09-mvp-roadmap.md) for exactly what's done vs. next.
