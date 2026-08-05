# Business Process Diagrams

## 1. Manufacturing: Plan → Batch

```mermaid
flowchart LR
    A[Production Plan\nby product/date] --> B[Production Order\nPLANNED]
    B --> C{Sufficient raw\nmaterial stock?}
    C -- No --> X[Blocked —\nraise Purchase Request]
    C -- Yes --> D[Start Production\nFEFO ingredient issue]
    D --> E[Order: IN_PROGRESS]
    E --> F[Record Actual Yield]
    F --> G[Create Finished Goods Batch\nBLM&lt;YYMMDD&gt;&lt;seq&gt;]
    G --> H[Receive into\nFinished Goods Warehouse]
    H --> I[Post Journal:\nDr Finished Goods / Cr Raw Materials]
    I --> J[Order: COMPLETED]
```

## 2. Purchasing: Request → Lot

```mermaid
flowchart LR
    A[Purchase Request\nDRAFT/SUBMITTED] --> B[Approve]
    B --> C[Purchase Order\nSENT to supplier]
    C --> D[Goods Receipt]
    D --> E[Create Raw Material Lot\nwith expiry date]
    D --> F[Update Supplier Price\n+ Price History]
    D --> G[Post Journal:\nDr Raw Material Inventory / Cr AP]
    D --> H[Create Supplier Invoice]
    E --> I{All PO items\nreceived?}
    I -- Yes --> J[PO: RECEIVED]
    I -- No --> K[PO: PARTIALLY_RECEIVED]
```

## 3. POS Sale with FEFO Allocation

```mermaid
flowchart TD
    A[Cashier scans/searches product] --> B[Add to cart]
    B --> C[Checkout: warehouse + payment method]
    C --> D[For each cart line:\nquery batches for product\nin warehouse, sort by expiry ASC]
    D --> E[Consume soonest-expiring\nbatch(es) first — split line\nacross batches if needed]
    E --> F[Decrement FinishedGoodsStock\n+ write StockMovement]
    F --> G[Compute subtotal, coupon\ndiscount, total]
    G --> H[Create Sale + SaleItems\nlinked to batch]
    H --> I[Post Journal:\nDr Cash/Bank / Cr Revenue]
    H --> J[Post Journal:\nDr COGS / Cr Finished Goods\nat batch unit cost]
    H --> K[Award loyalty points\nif member customer]
    K --> L[Print Receipt:\nbatch #, production date, expiry date]
```

## 4. Expiry Management (FEFO + Alerts)

```mermaid
flowchart LR
    A[Daily scheduled job] --> B{Batch expiry date\nvs. today}
    B -- "< today" --> C[Status: EXPIRED]
    B -- "<= +7 days" --> D[Status: EXPIRING_SOON]
    B -- "> +7 days" --> E[Status: ACTIVE]
    C & D --> F[Surface on Dashboard\nExpiry Alert widget]
    F --> G[Warehouse/Ops action:\ndiscount, transfer, or waste]
```

## 5. Subscription Auto-Order

```mermaid
flowchart LR
    A[Customer creates subscription\nfrequency + items] --> B[nextRunDate = startDate]
    B --> C[Daily cron: find subscriptions\nwith nextRunDate <= now]
    C --> D[Create Sale via POS engine\nchannel = ONLINE, FEFO allocation]
    D --> E[Advance nextRunDate\nby frequency]
    E --> C
```

## 6. Waste Recording

```mermaid
flowchart LR
    A[Staff identifies spoiled/damaged\nraw material or finished goods] --> B[Record Waste\nreason + quantity]
    B --> C[Decrement source stock\nraw material lot or FG batch]
    C --> D[Value = quantity × recorded unit cost]
    D --> E[Post Journal:\nDr Waste Expense / Cr Inventory]
    E --> F[Waste Report:\nvalue, %, trend]
```

## 7. Traceability (Batch ⇄ Ingredients ⇄ Customer)

```mermaid
flowchart LR
    Supplier -->|Goods Receipt| Lot[Raw Material Lot]
    Lot -->|Ingredient Issue| ProdOrder[Production Order]
    ProdOrder -->|Completion| Batch[Finished Goods Batch]
    Batch -->|Sale Item| Sale[POS Sale]
    Sale --> Customer

    Batch -. "trace forward" .-> Sale
    Sale -. "trace backward" .-> Batch
    Batch -. "trace backward" .-> Lot
    Lot -. "trace backward" .-> Supplier
```
