# Source Code Structure

```
erp-app/
├── backend/                       NestJS REST API
│   ├── prisma/
│   │   ├── schema.prisma          Single source of truth for the DB schema
│   │   └── seed.ts                Chart of accounts, warehouses, admin user, demo data
│   ├── src/
│   │   ├── main.ts                Bootstrap, global prefix /api/v1, Swagger, validation pipe
│   │   ├── app.module.ts          Wires every feature module + global JWT/RBAC guards
│   │   ├── prisma/                PrismaService (injectable PrismaClient) + module
│   │   ├── common/
│   │   │   ├── decorators/        @Roles, @Public, @CurrentUser
│   │   │   ├── guards/            JwtAuthGuard, RolesGuard
│   │   │   └── utils/             Batch/PO/lot number generation (document-number.util.ts)
│   │   ├── auth/                  Login, JWT strategy, token issuing
│   │   ├── users/                 Staff account CRUD
│   │   ├── products/              Finished-goods catalog
│   │   ├── raw-materials/         Raw material master + low-stock query
│   │   ├── suppliers/             Supplier master + performance report
│   │   ├── recipes/               BOM (recipe + ingredients), scaling helper
│   │   ├── inventory/             Warehouses, FEFO stock queries, expiry alerts,
│   │   │                          transfers, adjustments, stock opname, batch/customer trace
│   │   ├── purchasing/            PR → PO → Goods Receipt (creates lots + journal)
│   │   ├── production/            Plan → Order → FEFO ingredient issue → batch completion
│   │   ├── pos/                   Product search, FEFO sale creation, receipt payload
│   │   ├── customers/             CRM profile, favorites, loyalty points
│   │   ├── loyalty/                Loyalty tiers + coupons
│   │   ├── subscriptions/         Recurring order definitions + daily auto-order cron
│   │   ├── delivery/              Delivery + vehicle tracking
│   │   ├── waste/                 Waste recording (stock decrement + journal) + reports
│   │   ├── accounting/            Chart of accounts, generic journal posting, P&L/BS/CF/
│   │   │                          product-profitability reports
│   │   ├── dashboard/             Executive dashboard aggregation endpoint
│   │   └── marketplace/           Channel registry + generic webhook ingestion (stub)
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig*.json
│
├── frontend/                      Next.js 14 (App Router) + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         Root layout, wraps app in AuthProvider
│   │   │   ├── page.tsx           Redirects to /dashboard or /login
│   │   │   ├── login/page.tsx
│   │   │   └── (app)/             Route group: authenticated shell (Sidebar + AuthGuard)
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/     Executive dashboard
│   │   │       ├── pos/           POS terminal + receipt view
│   │   │       ├── products/      Product management
│   │   │       ├── bom/           Recipe management
│   │   │       ├── production/    Production orders
│   │   │       ├── batches/       Expiry alerts + batch trace lookup
│   │   │       ├── inventory/     Stock views (raw material / finished goods)
│   │   │       ├── purchasing/    Purchase orders + goods receipt
│   │   │       ├── waste/         Waste recording + history
│   │   │       ├── customers/     CRM
│   │   │       ├── subscriptions/ Subscription list + pause/resume
│   │   │       ├── delivery/      Delivery status board
│   │   │       └── accounting/    P&L + journal entries
│   │   ├── components/            Sidebar, AuthGuard, StatCard/PageHeader
│   │   └── lib/
│   │       ├── api.ts             Fetch wrapper — attaches JWT, throws ApiError
│   │       ├── auth.tsx           AuthProvider/useAuth (login/logout/session)
│   │       └── format.ts          Currency/date formatting (id-ID locale)
│   ├── Dockerfile
│   └── package.json
│
├── docs/                          This documentation set
├── docker-compose.yml             postgres + redis + backend + frontend, one command up
└── README.md
```

## Why this structure

- **Feature-module-per-domain on the backend** (NestJS convention): each business capability
  (production, purchasing, POS, waste, accounting…) is a self-contained module with its own
  `*.controller.ts` / `*.service.ts` / `dto/`, so a new hire can find "everything about
  purchasing" in one folder.
- **Cross-cutting logic lives in shared services, not duplicated**: `InventoryService` (FEFO,
  expiry, transfers) and `AccountingService` (generic journal posting) are imported by
  `PurchasingModule`, `ProductionModule`, `PosModule`, and `WasteModule` rather than each
  reimplementing stock math or ledger posting.
- **Route group `(app)`** on the frontend isolates the authenticated shell (sidebar + guard)
  from `/login`, without affecting the URL (Next.js route groups don't add a path segment).
- **No ORM logic outside services.** Controllers only translate HTTP ↔ DTO ↔ service call;
  every Prisma query lives in a service, which is what keeps `$transaction` boundaries correct.
