# Little Sprouts — Daycare Franchise ERP

A multi-tenant ERP for a daycare franchise business: independently-operated
Centers under one Franchise (HQ), with global Guardian/Child records and
center-scoped Enrollment, Billing, and Staff data.

## Stack

- **Backend**: NestJS + TypeScript, PostgreSQL via Prisma, JWT auth with
  RBAC + application-layer center-scoping (`src/common/services/center-access.service.ts`)
- **Web frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Mobile app** (parents only): React Native (Expo), same REST API
- **Notifications**: Expo Push / FCM adapter (`backend/src/notifications`)

## Project layout

```
backend/    NestJS REST API + Prisma schema + seed data
frontend/   Next.js web app (HQ Admin / Center Owner / Front-desk)
mobile/     Expo React Native app (Parent portal)
```

## Quick start (Docker)

```bash
docker compose up --build
```

- API: http://localhost:3001/api/v1 — Swagger docs at http://localhost:3001/api/docs
- Web app: http://localhost:3000

The backend container runs `prisma migrate deploy` on startup. Seed demo data
separately (see below) once the containers are healthy.

## Local development (without Docker)

Requires Node.js 20+, PostgreSQL 14+.

### Backend

```bash
cd backend
cp .env.example .env   # point DATABASE_URL at your Postgres instance
npm install
npx prisma migrate dev --name init
npm run prisma:seed     # demo data: 1 franchise, 2 centers, all roles
npm run start:dev       # http://localhost:3001
```

### Web frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

### Mobile app (parents)

```bash
cd mobile
cp .env.example .env
npm install
npm start                 # opens Expo dev tools — scan with Expo Go, or run
npm run android / npm run ios
```

## Demo accounts

Seeded by `npm run prisma:seed` (password for all: `Passw0rd!`):

| Role | Email |
|---|---|
| HQ Admin | `hq.admin@littlesprouts.demo` |
| Center Owner (Downtown) | `owner.downtown@littlesprouts.demo` |
| Center Owner (Riverside) | `owner.riverside@littlesprouts.demo` |
| Front-desk (Downtown) | `frontdesk.downtown@littlesprouts.demo` |
| Front-desk (Riverside) | `frontdesk.riverside@littlesprouts.demo` |
| Parent | `maria.g@example.com` / `james.c@example.com` |

Two centers under one franchise are seeded with real cross-linked data
(guardians, children, leads at every pipeline stage, programs, enrollments,
invoices in each status, franchise fees, attendance, an incident log, staff
with certifications and shifts, payroll rate tables, and inventory) so the
multi-tenant behavior — Center Owner A cannot see Center B's data, HQ Admin
sees both, Parents see only their own children — is visible end to end.

## What's implemented

Every module in the blueprint has real backend logic and a working UI, not
scaffolding:

- **Foundation**: JWT auth (access + refresh), RBAC guard, and a
  `CenterAccessService` that enforces the Section 3 access matrix uniformly
  across every module (HQ Admin read-only across all centers; Center Owner /
  Front-desk scoped to their assigned center(s); Parent scoped to their own
  guardian/children).
- **Enrollment/CRM**: Lead → Tour → Waitlist (with position tracking and
  automatic reflow when someone leaves the list) → Enrolled pipeline.
- **Billing**: tiered tuition + itemized add-ons, manual bank-transfer
  payment recording and reconciliation, parent payment-proof upload, a daily
  cron that flips past-due invoices to `OVERDUE`, and franchise fees tracked
  separately from tuition.
- **Attendance & Health**: hybrid self/front-desk check-in and check-out,
  headcount reporting (no ratio enforcement, per spec), and structured
  incident logging that pushes a notification to every linked guardian and
  tracks acknowledgement.
- **Staff/HCM/Payroll**: shift scheduling, certification expiry tracking
  with 30/14/1-day alerts (daily cron), and a payroll engine that computes
  regular/overtime hours from shifts and applies BPJS + progressive PPh21
  tax from a **configurable rate table** (`PayrollRateTable`) — never
  hardcoded. Sample rates are seeded for the demo and are explicitly flagged
  as needing validation against current regulations before go-live.
- **Inventory**: stock levels with low-stock reorder flags, in/out
  transactions.
- **Reporting**: financial (revenue, AR aging, collections rate),
  operational (enrollment/lead/attendance trends), staff, and a
  franchise-wide rollup — full detail for HQ Admin, own-center-plus-
  anonymized-benchmark for Center Owners.
- **Parent mobile app**: enrollment/waitlist status, invoices with
  payment-proof upload, attendance history and self check-in/out, and an
  incident feed with an acknowledge action.

## Out of scope (by design, per the blueprint)

Curriculum/milestone tracking, payment gateway integration (Midtrans/Xendit),
real-time teacher:child ratio enforcement, a full procurement/PO workflow,
and split-guardian invoicing were explicitly excluded from this MVP. The
data model and API leave clean extension points for all of them (e.g. the
`Invoice.billingGuardianId` is a single FK today; adding a split would mean
a new `InvoiceShare` join table without touching the rest of billing).
