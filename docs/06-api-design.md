# API Design

Base URL: `/api/v1`. Auth: `Authorization: Bearer <JWT access token>` (except `POST /auth/login`).
Interactive Swagger/OpenAPI docs are served at `/api/docs` when the backend is running.

Roles referenced below: `ADMIN`, `MANAGER`, `PRODUCTION_STAFF`, `WAREHOUSE_STAFF`, `CASHIER`,
`SALES`, `ACCOUNTANT`, `DRIVER`. Endpoints with no role listed are open to any authenticated
user.

## Auth

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Returns access + refresh JWT and user profile |
| GET | `/auth/me` | Any | Current authenticated user |

## Users

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/users` | ADMIN | Create staff account |
| GET | `/users` | ADMIN, MANAGER | List users |
| GET | `/users/:id` | ADMIN, MANAGER | User detail |
| PATCH | `/users/:id/active` | ADMIN | Activate/deactivate account |

## Products

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/products` | ADMIN, MANAGER | Create finished good |
| GET | `/products?status=` | Any | List products |
| GET | `/products/:id` | Any | Product detail + recipes |
| PATCH | `/products/:id` | ADMIN, MANAGER | Update product |
| DELETE | `/products/:id` | ADMIN, MANAGER | Soft-delete (status → DISCONTINUED) |

## Raw Materials

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/raw-materials` | ADMIN, MANAGER, WAREHOUSE_STAFF | Create raw material |
| GET | `/raw-materials?category=` | Any | List |
| GET | `/raw-materials/low-stock` | Any | Materials at/below `minStockLevel` |
| GET | `/raw-materials/:id` | Any | Detail + supplier prices |
| PATCH | `/raw-materials/:id` | ADMIN, MANAGER, WAREHOUSE_STAFF | Update |

## Suppliers

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/suppliers` | ADMIN, MANAGER | Create |
| GET | `/suppliers?type=` | Any | List |
| GET | `/suppliers/:id` | Any | Detail |
| GET | `/suppliers/:id/performance` | Any | On-time rate + price history |
| PATCH | `/suppliers/:id` | ADMIN, MANAGER | Update |

## Recipes (BOM)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/recipes` | ADMIN, MANAGER | Create a new recipe version with ingredients |
| GET | `/recipes?productId=` | Any | List versions for a product |
| GET | `/recipes/:id` | Any | Detail |
| DELETE | `/recipes/:id` | ADMIN, MANAGER | Deactivate |

## Inventory

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/inventory/warehouses` | ADMIN, MANAGER | Create warehouse |
| GET | `/inventory/warehouses?type=` | Any | List warehouses |
| GET | `/inventory/stock/raw-materials?warehouseId=` | Any | FEFO-ordered raw material lots |
| GET | `/inventory/stock/finished-goods?warehouseId=` | Any | FEFO-ordered finished goods stock |
| GET | `/inventory/expiry-alerts` | Any | Expired / ≤3 days / ≤7 days buckets |
| POST | `/inventory/transfer` | ADMIN, MANAGER, WAREHOUSE_STAFF | Move stock between warehouses |
| POST | `/inventory/adjust` | ADMIN, MANAGER, WAREHOUSE_STAFF | Manual stock adjustment |
| GET | `/inventory/batches/:batchId/trace` | Any | Batch → production → ingredients → suppliers → sales |
| GET | `/inventory/customers/:customerId/trace` | Any | Customer → sales → batches |
| POST | `/inventory/opname` | ADMIN, MANAGER, WAREHOUSE_STAFF | Start a stock count session |
| GET | `/inventory/opname?warehouseId=` | Any | List opname sessions |
| POST | `/inventory/opname/:id/complete` | ADMIN, MANAGER, WAREHOUSE_STAFF | Apply counted variance as adjustments |

## Purchasing

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/purchasing/requests` | ADMIN, MANAGER, WAREHOUSE_STAFF | Create PR |
| GET | `/purchasing/requests?status=` | Any | List PRs |
| PATCH | `/purchasing/requests/:id/approve` | ADMIN, MANAGER | Approve PR |
| POST | `/purchasing/orders` | ADMIN, MANAGER | Create PO (optionally from a PR) |
| GET | `/purchasing/orders?status=` | Any | List POs |
| GET | `/purchasing/orders/:id` | Any | PO detail |
| POST | `/purchasing/goods-receipts` | ADMIN, MANAGER, WAREHOUSE_STAFF | Receive goods → creates lots + journal + invoice |

## Production

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/production/plans` | ADMIN, MANAGER | Create production plan |
| GET | `/production/plans` | Any | List plans |
| POST | `/production/orders` | ADMIN, MANAGER | Create production order |
| GET | `/production/orders?status=` | Any | List orders |
| GET | `/production/orders/:id` | Any | Order detail + ingredient issues + batch |
| PATCH | `/production/orders/:id/start` | ADMIN, MANAGER, PRODUCTION_STAFF | FEFO-issue ingredients, order → IN_PROGRESS |
| PATCH | `/production/orders/:id/complete` | ADMIN, MANAGER, PRODUCTION_STAFF | Create batch, receive FG stock, post journal |
| PATCH | `/production/orders/:id/cancel` | ADMIN, MANAGER | Cancel order |

## POS

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/pos/products/search?q=` | Any | Barcode/SKU/name product lookup |
| POST | `/pos/sales` | ADMIN, MANAGER, CASHIER | Create sale — FEFO allocation, journals, loyalty points |
| GET | `/pos/sales?from=&to=&channel=` | Any | List sales |
| GET | `/pos/sales/:id` | Any | Sale detail |
| GET | `/pos/sales/:id/receipt` | Any | Print-ready receipt payload (batch/production/expiry per line) |

## Customers (CRM)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/customers` | Any | Create customer |
| GET | `/customers?search=` | Any | List / search |
| GET | `/customers/:id` | Any | Profile + recent sales + subscriptions |
| GET | `/customers/:id/favorite-products` | Any | Ranked by quantity purchased |
| PATCH | `/customers/:id` | Any | Update |

## Loyalty

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/loyalty/tiers` | ADMIN, MANAGER | Create tier |
| GET | `/loyalty/tiers` | Any | List tiers |
| POST | `/loyalty/coupons` | ADMIN, MANAGER | Create coupon |
| GET | `/loyalty/coupons?activeOnly=` | Any | List coupons |

## Subscriptions

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/subscriptions` | Any | Create subscription |
| GET | `/subscriptions?customerId=` | Any | List |
| PATCH | `/subscriptions/:id/pause` \| `/resume` \| `/cancel` | Any | Lifecycle actions |
| POST | `/subscriptions/run-due` | ADMIN, MANAGER | Manually trigger due-subscription auto-orders (also runs daily via cron) |

## Delivery

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/delivery` | ADMIN, MANAGER, SALES | Schedule a delivery |
| GET | `/delivery?status=` | Any | List |
| PATCH | `/delivery/:id/status` | ADMIN, MANAGER, DRIVER | Update delivery status |
| POST | `/delivery/vehicles` | ADMIN, MANAGER | Register vehicle |
| GET | `/delivery/vehicles` | Any | List fleet |

## Waste

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/waste` | ADMIN, MANAGER, WAREHOUSE_STAFF, PRODUCTION_STAFF | Record waste — decrements stock, posts journal |
| GET | `/waste?type=&from=&to=` | Any | List records |
| GET | `/waste/report?from=&to=` | Any | Value, raw-material waste %, daily trend |

## Accounting

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/accounting/accounts` | ADMIN, ACCOUNTANT | Create chart-of-accounts entry |
| GET | `/accounting/accounts` | Any | List accounts |
| GET | `/accounting/journal-entries?sourceType=` | Any | List journal entries |
| GET | `/accounting/reports/profit-and-loss?from=&to=` | Any | P&L |
| GET | `/accounting/reports/balance-sheet?asOf=` | Any | Balance sheet |
| GET | `/accounting/reports/cash-flow?from=&to=` | Any | Cash/bank net movement |
| GET | `/accounting/reports/product-profitability?from=&to=` | Any | Revenue by product |

## Dashboard

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/dashboard/overview` | Any | Sales, manufacturing, inventory, and finance snapshot |

## Marketplace (future-ready)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/marketplace/channels` | Any | List channels |
| POST | `/marketplace/channels` | ADMIN, MANAGER | Enable/configure a channel |
| POST | `/marketplace/webhook/:channel` | Public* | Ingest an external order (*add signature verification before going live) |
| GET | `/marketplace/orders?channel=` | Any | List synced orders |

## Design principles

1. **Every write that touches money or stock goes through a service method that wraps a
   Prisma `$transaction`** — partial writes never happen.
2. **No endpoint returns aggregate stock as a single number.** Stock endpoints always return
   lot/batch-level rows so the client can render FEFO order and expiry directly.
3. **RBAC is enforced with two global guards** (`JwtAuthGuard`, `RolesGuard`) plus a
   `@Roles(...)` decorator per route — there is no per-request manual role check scattered in
   controllers.
4. **The REST API has no server-rendered views** — it is consumed identically by the Next.js
   web app today and can be consumed by a future mobile app without modification.
