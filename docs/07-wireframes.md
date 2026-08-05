# Wireframes

These describe the actual implemented screens (`frontend/src/app/(app)/**`), not aspirational
mockups — every layout below is running code. ASCII sketches show structure; colors/spacing
follow the Tailwind design tokens in `frontend/tailwind.config.ts` (Bluma green, `bluma-500`).

## Global Shell

```
┌───────────────┬──────────────────────────────────────────────┐
│  Sidebar       │  Page content (scrollable)                    │
│  ─────────     │                                                │
│  Bluma logo    │  <PageHeader title / description>              │
│                │                                                │
│  ▸ Overview    │  <module-specific content>                     │
│  ▸ Sales       │                                                │
│  ▸ Manufactur. │                                                │
│  ▸ Supply Chain│                                                │
│  ▸ Finance     │                                                │
│                │                                                │
│  user email    │                                                │
│  [Sign out]    │                                                │
└───────────────┴──────────────────────────────────────────────┘
```
`Sidebar` (`components/Sidebar.tsx`) groups nav by business function, not by data model —
matching how staff think about their job ("Sales" vs. "Manufacturing") rather than the schema.

## Login

```
┌───────────────────────────┐
│         (B) Bluma          │
│   Bluma Juice Cold Press   │
│    ERP & POS Sign In       │
│  ┌───────────────────────┐ │
│  │ Email                 │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ Password               │ │
│  └───────────────────────┘ │
│  [        Sign In        ] │
└───────────────────────────┘
```

## Executive Dashboard (`/dashboard`)

Four stacked sections, each a responsive grid of `StatCard`s pulling from
`GET /dashboard/overview`:

```
Sales            [Sales Today] [Sales MTD] [Top Channel] [Top Product]
Manufacturing    [Production Today] [Yield % MTD] [Waste Value MTD] [RM Stock]
Inventory        [Expired] [Expiring 3d] [Expiring 7d]
Finance (MTD)    [Revenue] [Gross Profit] [Net Profit]
```
Tone-coded: red for expired/negative, amber for warnings (yield <90%, expiring soon), green
for healthy metrics.

## POS Terminal (`/pos`)

```
┌─────────────────────────────────┬──────────────┐
│ [Scan barcode / search…]        │  Checkout     │
│  ┌ product search results ┐     │  Outlet: [▾]  │
│                                  │  Payment: [▾] │
│ ┌ Cart table ───────────────┐   │  Total: Rp…   │
│ │ Product | Qty | Price |$ │   │  [Charge &    │
│ └────────────────────────────┘   │   Print]      │
└─────────────────────────────────┴──────────────┘
```
On checkout success the entire view swaps to a monospace **receipt** showing, per line, the
batch number, production date, and expiry date — this is the one non-negotiable UI requirement
from the spec (§ POS → Receipt) and is rendered directly from `GET /pos/sales/:id/receipt`.

## Products (`/products`)

Table (SKU, Name, Size, Category, Price, Shelf Life, Status) with a collapsible "+ New
Product" form above it — no modal, no page navigation, to keep data entry fast for a small
back-office team.

## Recipes / BOM (`/bom`)

Product picker → list of recipe versions as cards, each showing standard yield and an
ingredients table. "+ New Recipe Version" form has dynamic ingredient rows (add as many
raw materials as needed).

## Production Orders (`/production`)

Table of orders (Order #, Product, Planned, Actual Yield, Batch, Status, Scheduled, action).
Row actions are contextual to status: `PLANNED` → **Start**, `IN_PROGRESS` → **Complete**
(prompts for actual yield qty). The batch column links the produced batch number, hoverable
for its expiry date.

## Batch & Expiry Tracking (`/batches`)

```
┌ Expired ──────┐ ┌ Expiring ≤3d ─┐ ┌ Expiring ≤7d ─┐
│ batch table    │ │ batch table   │ │ batch table   │
└────────────────┘ └───────────────┘ └───────────────┘

┌ Trace a Batch ──────────────────────────────────────┐
│ [batch id…] [Trace]                                  │
│  Batch BLM240701A — Green Detox                       │
│  Ingredients & Suppliers table                        │
│  Sold To list                                          │
└────────────────────────────────────────────────────────┘
```

## Inventory (`/inventory`)

Tab switcher: **Finished Goods** (batch, product, warehouse, qty, expiry) vs. **Raw
Materials** (lot, material, supplier, warehouse, remaining, expiry) — both FEFO-sorted by the
API, so the UI needs no client-side sorting.

## Purchasing (`/purchasing`)

PO table with a **Receive Goods** row action (receives all ordered quantities in one call for
MVP speed; partial receipt is supported by the API and is a natural next UI iteration — see
roadmap). "+ New Purchase Order" form has dynamic line items (raw material, qty, unit price).

## Waste (`/waste`)

Stat cards (total waste value, record count) + a record form (type toggle Raw
Material/Finished Goods drives which item picker shows) + a history table.

## Customers, Subscriptions, Delivery, Accounting

Same list+form pattern as Products/Customers for consistency. Delivery's status column is an
inline `<select>` for one-click status transitions. Accounting shows a date-ranged P&L stat
row plus a journal entries table (debit/credit columns rendered as "Account — amount" chips).

## Design rationale

- **No modals.** Every create-form is an inline collapsible panel — faster for a small,
  trusted back-office team than routing to a separate page or a modal that hides context.
- **Tables, not cards, for lists.** This is an operations tool used for hours at a time;
  density beats visual flourish.
- **Color is functional, not decorative.** Green (`bluma-*`) for brand/primary actions and
  healthy states; amber/red reserved for things that need attention (expiry, waste, negative
  margins) — see the `dataviz`-style tone props on `StatCard`.
