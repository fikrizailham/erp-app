# MVP Roadmap

## What's in this build (Phase 0 — delivered)

Everything below is implemented and builds cleanly (`npm run build` passes on both
`backend` and `frontend`):

- Auth (JWT access/refresh) + 8-role RBAC
- Product management (finished goods)
- Recipe/BOM management with yield scaling
- Manufacturing: plan → order → FEFO ingredient issue → batch completion → journal
- Batch numbering (`BLM<YYMMDD><seq>`) and full forward/backward traceability
- FEFO-enforced inventory for both raw materials and finished goods
- Expiry alert buckets (expired / ≤3 days / ≤7 days) + daily status-sync job
- Multi-warehouse inventory: transfer, adjustment, stock opname
- Purchasing: PR → PO → Goods Receipt (auto-creates lots + AP journal + supplier invoice)
- POS: barcode/SKU/name search, FEFO checkout, multi-payment-method, receipt with
  batch/production/expiry, auto revenue + COGS journals, loyalty points
- Waste recording with automatic expense journal + waste % / value / trend report
- CRM: customer profiles, favorites, loyalty tiers, coupons
- Subscriptions: recurring order definitions + daily auto-order cron
- Delivery: driver/vehicle/status tracking
- Accounting: auto-posted journals from every module + P&L / Balance Sheet / Cash Flow /
  Product Profitability reports
- Executive dashboard: sales, manufacturing, inventory, finance in one view
- Marketplace integration: channel registry + generic webhook ingestion (adapter-ready, not
  wired to a live Tokopedia/Shopee/TikTok Shop account yet — see Full Roadmap Phase 3)
- Dockerized (backend, frontend, Postgres, Redis) + seed script with demo data

## 0–4 Weeks — Pilot Hardening

Goal: run the MVP in the actual retail outlet + kitchen for real transactions.

1. **Auth hardening**: refresh-token rotation endpoint, password reset flow, session
   revocation on device.
2. **PO partial receipt UI**: backend already supports partial goods receipt
   (`quantityReceived` per line); add a per-line receive form instead of "receive all".
3. **Stock opname UI**: expose the existing `/inventory/opname` endpoints in a screen
   (count entry grid → complete).
4. **Printable receipt**: wire `/pos/sales/:id/receipt` to an actual thermal-printer flow
   (ESC/POS via a local print bridge, or browser print CSS for A4/receipt-width).
5. **Data validation pass**: tighten DTO constraints (e.g. positive-only decimals, date
   ordering) and add e2e tests for the FEFO sale and production-completion paths — the two
   highest-risk transactional flows.
6. **Backups**: automated PostgreSQL backups (pg_dump to S3 or managed RDS snapshots) before
   any real inventory data accumulates.
7. **Observability**: structured logging + a basic uptime check on `/api/v1/dashboard/overview`.

## 4–8 Weeks — Operational Completeness

1. **Marketplace adapters**: implement real Tokopedia/Shopee/TikTok Shop order-sync workers
   against the existing `MarketplaceService.recordIncomingOrder` contract.
2. **WhatsApp order intake**: a lightweight intake form or WhatsApp Business API webhook that
   creates a `Sale` with `channel: WHATSAPP`, reusing the FEFO checkout engine.
3. **Delivery route optimization**: replace the free-text `route` field with a proper
   stop-sequencing view (still simple — not a full routing engine yet).
4. **Reseller pricing tier**: price lists per customer type (currently a single
   `Product.sellingPrice`); needed before onboarding resellers at scale.
5. **Multi-currency / tax**: `Sale.taxAmount` exists but is currently always 0 — wire actual
   Indonesian tax rules (PPN) if/when the business crosses the tax threshold.

## Success criteria to exit MVP phase

- A full day's retail sales run through POS with zero manual stock reconciliation.
- One full production day (plan → batches → FG receipt) with yield variance visible on the
  dashboard the same day.
- Month-end P&L generated entirely from auto-posted journals, reconciled against manual
  bookkeeping to confirm accuracy before manual books are retired.
