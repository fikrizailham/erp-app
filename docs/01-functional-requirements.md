# Functional Requirement Specification (FRS)

**Project:** Bluma Juice Cold Press — ERP + POS
**Version:** 0.1.0 (MVP)

## 1. Purpose

Bluma Juice Cold Press needs a single system to run manufacturing, batch/expiry-controlled
inventory, point-of-sale, purchasing, delivery, CRM, and accounting for a short-shelf-life
cold-pressed juice business selling through retail, online, WhatsApp, marketplaces, corporate
subscriptions, and resellers.

## 2. Scope

In scope for this build (see `09-mvp-roadmap.md` / `10-full-roadmap.md` for phasing):

| # | Module | Status |
|---|--------|--------|
| 1 | POS (cashier, sales, receipts) | Implemented |
| 2 | Product Management | Implemented |
| 3 | Recipe Management (BOM) | Implemented |
| 4 | Manufacturing (Plan → Order → Issue → Batch) | Implemented |
| 5 | Batch Tracking & Traceability | Implemented |
| 6 | Expiry Management (FEFO, alerts) | Implemented |
| 7 | Inventory (multi-warehouse, transfers, opname) | Implemented |
| 8 | Purchasing (PR → PO → GR → Invoice) | Implemented |
| 9 | Waste Management | Implemented |
| 10 | Delivery Management | Implemented (core) |
| 11 | Subscription Management | Implemented (core + auto-order cron) |
| 12 | Marketplace Integration | Stubbed / future-ready |
| 13 | CRM & Loyalty | Implemented (core) |
| 14 | Accounting (auto journals, reports) | Implemented (core) |
| 15 | Executive Dashboard | Implemented |

## 3. Functional Requirements

### FR-1 POS
- FR-1.1 Cashier can search products by barcode, SKU, or name.
- FR-1.2 Cashier can add multiple products to a cart with quantity.
- FR-1.3 System allocates stock strictly **FEFO** (First-Expired-First-Out) per line item,
  splitting a line across batches transparently if needed.
- FR-1.4 System supports payment methods: Cash, QRIS, E-wallet, Card, Bank Transfer.
- FR-1.5 System supports walk-in, member (loyalty), and coupon-discounted sales.
- FR-1.6 Receipt must show, per line: product, quantity, price, **batch number, production
  date, expiry date**.
- FR-1.7 Every sale posts a balanced journal entry (revenue + COGS) automatically.

### FR-2 Product Management
- FR-2.1 Maintain finished-goods products with SKU, barcode, name, size, unit, selling price,
  shelf life (days), category, status (Active/Inactive/Discontinued).
- FR-2.2 Product shelf life drives the expiry date computed at production time.

### FR-3 Recipe Management (BOM)
- FR-3.1 Each product can have one or more recipe versions.
- FR-3.2 A recipe defines a standard yield quantity and a list of raw-material ingredients
  with quantity/unit.
- FR-3.3 System scales ingredient quantities proportionally to any planned production
  quantity (`requiredQty = ingredientQty × (plannedQty / standardYieldQty)`).
- FR-3.4 System records actual yield at production completion and computes yield variance %
  against planned/standard yield.

### FR-4 Manufacturing
- FR-4.1 Flow: Production Plan → Production Order → Ingredient Issue → Production →
  Packaging/Finished Goods Receipt.
- FR-4.2 Starting a production order issues ingredients FEFO from raw material lots in the
  order's warehouse and decrements lot quantities.
- FR-4.3 Completing a production order creates exactly one Finished Goods Batch, receives it
  into a Finished Goods warehouse, and posts a manufacturing journal (Dr Finished Goods /
  Cr Raw Materials) at consumed-ingredient cost.
- FR-4.4 System blocks starting a production order if any ingredient lot has insufficient
  stock in the target warehouse.

### FR-5 Batch Tracking
- FR-5.1 Every completed production order creates a batch numbered `BLM<YYMMDD><seq>`
  (e.g. `BLM240701A`), unique system-wide.
- FR-5.2 Batch record stores production date, expiry date, quantity produced, and unit cost.
- FR-5.3 System can trace a batch → production order → ingredient issues → raw material
  lots → suppliers, and separately batch → sales → customers.
- FR-5.4 System can trace a customer → sales → batches purchased.

### FR-6 Expiry Management
- FR-6.1 All finished-goods and raw-material stock queries return FEFO-ordered results
  (soonest expiry first).
- FR-6.2 System classifies finished-goods batches (with remaining stock) into: Expired,
  Expiring in ≤3 days, Expiring in ≤7 days.
- FR-6.3 A scheduled job (daily) transitions batch status ACTIVE → EXPIRING_SOON → EXPIRED
  based on expiry date.
- FR-6.4 The Executive Dashboard exposes an expiry-alert widget with counts per bucket.

### FR-7 Inventory Management
- FR-7.1 Warehouses are typed: Raw Material, Production, Finished Goods, Outlet.
- FR-7.2 Stock is tracked per lot (raw material) or per batch+warehouse (finished goods) —
  never as a single aggregate number — to preserve traceability and FEFO ordering.
- FR-7.3 System supports stock transfer (between warehouses), stock adjustment (with reason),
  and stock opname (physical count vs. system count, with variance auto-applied on
  completion).
- FR-7.4 Every stock-affecting event is written to an immutable `StockMovement` ledger.

### FR-8 Purchasing
- FR-8.1 Flow: Purchase Request → Purchase Order → Goods Receipt → Supplier Invoice.
- FR-8.2 Goods Receipt creates one raw-material lot per line with a generated lot number,
  captures unit cost and expiry date (explicit or derived from the material's shelf life),
  and posts a journal (Dr Raw Material Inventory / Cr Accounts Payable).
- FR-8.3 Goods Receipt updates the supplier's current price and appends to price history.
- FR-8.4 Supplier performance view: total orders, on-time delivery rate, price history.

### FR-9 Waste Management
- FR-9.1 Waste can be recorded against a specific raw-material lot or finished-goods batch,
  with a reason (Expired, Rotten, Damaged, Production Loss, Quality Reject, Other).
- FR-9.2 Recording waste decrements the source stock and posts a journal (Dr Waste Expense /
  Cr Inventory) at the item's recorded cost.
- FR-9.3 Waste report returns total waste value, raw-material waste % (waste qty / received
  qty in period), and a daily value trend.

### FR-10 Delivery Management
- FR-10.1 Deliveries reference a customer, optional sale/subscription, driver, vehicle, and
  route, with status Scheduled → Out for Delivery → Delivered/Failed.

### FR-11 Subscription Management
- FR-11.1 Customers can subscribe to a recurring set of products at Daily/Weekly/Monthly
  frequency.
- FR-11.2 A scheduled job creates a sale automatically for subscriptions due on/before "now"
  and advances `nextRunDate`.

### FR-12 Marketplace Integration
- FR-12.1 Channel registry (Tokopedia, Shopee, TikTok Shop) with a generic webhook endpoint
  to ingest external orders — architecture is ready for per-channel adapters in a later phase.

### FR-13 CRM
- FR-13.1 Customer profile, purchase history, favorite products (by quantity purchased),
  loyalty points and tier (auto-promoted on point thresholds).
- FR-13.2 Coupons: percent or fixed discount, validity window, usage limit.

### FR-14 Accounting
- FR-14.1 Every purchase, production, sale, and waste event posts a **balanced double-entry
  journal** automatically — no manual bookkeeping required for standard operations.
- FR-14.2 Reports: Profit & Loss, Balance Sheet, Cash Flow (cash/bank movement), Product
  Profitability (revenue by product from sale lines).

### FR-15 Executive Dashboard
- FR-15.1 Single overview endpoint aggregating: sales (today/MTD/by product/by channel),
  manufacturing (production today, yield %, waste value MTD), inventory (raw material stock,
  expiring batches), finance (revenue, gross profit, net profit MTD).

## 4. Non-Functional Requirements

- **NFR-1 Auth:** JWT access/refresh tokens; role-based access control (Admin, Manager,
  Production Staff, Warehouse Staff, Cashier, Sales, Accountant, Driver).
- **NFR-2 Auditability:** Immutable stock ledger and journal entries; no destructive updates
  to historical financial/inventory records.
- **NFR-3 Data integrity:** All multi-step stock/financial operations run inside database
  transactions (Prisma `$transaction`).
- **NFR-4 Portability:** Backend is a stateless REST API so the same endpoints can serve a
  future React Native / Flutter mobile app (Android/iOS) without change.
- **NFR-5 Deployability:** Dockerized backend, frontend, PostgreSQL, and Redis; deployable to
  AWS (ECS/Fargate + RDS, or EC2 + Docker Compose for smaller scale).
