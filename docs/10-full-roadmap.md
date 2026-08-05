# Full Production Roadmap

Builds on `09-mvp-roadmap.md`. Phases are sequential but can overlap where team capacity
allows.

## Phase 1 (Months 1–2): Pilot Hardening
See `09-mvp-roadmap.md` — auth hardening, partial-receipt UI, stock opname UI, printable
receipts, backups, observability.

## Phase 2 (Months 2–4): Manufacturing & Inventory Depth

- **Partial/split production runs**: today `FinishedGoodsBatch.productionOrderId` is
  `@unique` (one order → one batch). Support multiple batches per order for large runs split
  across shifts, or multiple orders contributing to one batch — whichever matches real kitchen
  practice better once observed.
- **Partial raw-material lot transfer** is implemented at the service layer already
  (`InventoryService.transferRawMaterialLot` splits a lot); expose it in the UI.
- **Production overhead costing**: currently batch `unitCost` = ingredient cost only. Add
  labor/overhead allocation (the `5300 Production Overhead` account already exists in the
  chart of accounts) for accurate product profitability.
- **Supplier scorecards**: expand `Supplier.performance()` beyond on-time rate — quality
  reject rate (link to `WasteRecord.reason = QUALITY_REJECT`), price trend.
- **Barcode/label printing**: generate batch-labeled barcodes at production completion for
  physical bottle labels (ties into `Product.barcode` + `FinishedGoodsBatch.batchNumber`).

## Phase 3 (Months 3–5): Channel Expansion

- **Marketplace live adapters** (Tokopedia, Shopee, TikTok Shop): implement OAuth/API-key
  storage (`MarketplaceChannel.apiConfig`, encrypted at rest), order polling/webhooks, and
  two-way inventory sync (push stock levels out, not just pull orders in).
- **WhatsApp Business API integration**: automated order intake + delivery status
  notifications to customers.
- **Reseller portal**: a scoped view (or separate lightweight app) for resellers to place
  orders against reseller pricing and see their own order history.
- **Corporate subscription self-service**: let corporate customers manage their own
  subscription items/pause via a customer-facing portal instead of staff doing it in the ERP.

## Phase 4 (Months 4–7): Mobile Apps (Android / iOS)

The backend is already a stateless JWT-secured REST API — no backend rework is required to
add mobile clients. Recommended approach:

- **Tech choice**: React Native (Expo) to reuse the team's React/TypeScript skills and share
  some logic (types, API client shape) with the Next.js web app via a small shared package.
- **Driver app** (highest ROI first): delivery list, status updates, proof-of-delivery photo
  upload (needs a new `Delivery.proofPhotoUrl` field + object storage, e.g. S3).
- **Cashier/POS app**: same FEFO checkout flow as web, optimized for a handheld/tablet with a
  Bluetooth barcode scanner and receipt printer.
- **Manager app**: read-only dashboard + approvals (PR approval, production order start) for
  on-the-go oversight.
- **Push notifications**: expiry alerts and low-stock alerts pushed to relevant roles
  (requires a notification service — Firebase Cloud Messaging or AWS SNS).

## Phase 5 (Months 6–9): Financial & Compliance Depth

- **Tax engine**: Indonesian PPN calculation and reporting once revenue crosses the
  registration threshold.
- **Multi-entity / multi-branch**: if Bluma opens a second kitchen or outlet, promote
  `Warehouse` groupings into a proper `Branch`/`CostCenter` dimension on journals for
  branch-level P&L.
- **Bank reconciliation**: import bank statements (CSV/API) and match against `JournalLine`
  cash/bank entries.
- **Fixed asset register**: equipment (cold press machines, chillers) depreciation — the
  `1500 Fixed Assets` account is anticipated in the chart of accounts structure but not yet
  modeled as a table.
- **Audit log**: who-changed-what on master data (products, recipes, prices) — currently only
  stock and journals are immutably logged.

## Phase 6 (Months 8–12): Scale & Intelligence

- **Demand forecasting**: use historical `SaleItem` data to suggest production plan
  quantities (simple moving average first; ML-based later).
- **Dynamic FEFO markdown**: auto-suggest discount % for batches in the "expiring ≤3 days"
  bucket based on days-to-expiry and remaining quantity.
- **Route optimization**: replace free-text delivery routes with real routing (e.g. Google
  Maps Directions API / OSRM) once delivery volume justifies it.
- **Multi-warehouse replenishment**: auto-generate purchase requests when
  `RawMaterialsService.lowStock()` detects a shortfall, instead of requiring a manual check.
- **Data warehouse / BI**: if reporting needs outgrow the built-in dashboard, replicate to a
  warehouse (e.g. BigQuery/Snowflake) for heavier analytics without impacting the operational
  database.

## Non-functional evolution

| Concern | MVP | Target at scale |
|---|---|---|
| Hosting | Docker Compose on a single VM | AWS ECS/Fargate + RDS Postgres (Multi-AZ) + ElastiCache Redis |
| File storage | N/A | S3 for product images, delivery proof photos, invoice PDFs |
| Background jobs | `@nestjs/schedule` in-process cron | Dedicated queue (BullMQ + Redis) once job volume/latency needs it |
| Secrets | `.env` files | AWS Secrets Manager / Parameter Store |
| CI/CD | Manual | GitHub Actions: lint + typecheck + test → build Docker images → deploy |
| Monitoring | Console logs | Structured logs to CloudWatch/Datadog + error tracking (Sentry) |
