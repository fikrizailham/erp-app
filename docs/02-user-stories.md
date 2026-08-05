# User Stories

Format: `As a <role>, I want <capability>, so that <benefit>.` Grouped by module; IDs map
loosely to the FRS in `01-functional-requirements.md`.

## POS (Cashier)
- **US-01** As a Cashier, I want to scan a barcode or search a product by name, so that I can
  add it to the cart quickly during a rush.
- **US-02** As a Cashier, I want the system to automatically pick the soonest-expiring batch
  for each sale, so that we never sell fresher stock while older stock spoils on the shelf.
- **US-03** As a Cashier, I want to accept Cash, QRIS, e-wallet, or card payment, so that I can
  serve any customer's preferred method.
- **US-04** As a Customer, I want my receipt to show the batch number and expiry date of the
  juice I bought, so that I know how fresh it is and can get it replaced if something's wrong.
- **US-05** As a Manager, I want every sale to auto-post its accounting entries, so that daily
  revenue and COGS are correct without manual journal entry.

## Product & BOM
- **US-06** As a Product Manager, I want to define a finished good with SKU, size, price, and
  shelf life, so that POS, production, and expiry logic all reference one source of truth.
- **US-07** As a Production Manager, I want to define a recipe (BOM) for each product with
  ingredient quantities, so that production orders know exactly what to consume.
- **US-08** As a Production Manager, I want the system to scale a recipe to any batch size, so
  that I don't have to hand-calculate ingredient quantities for a 200-bottle run vs. a
  20-bottle run.

## Manufacturing
- **US-09** As a Production Planner, I want to create a daily/weekly production plan by
  product, so that the team knows what to produce and when.
- **US-10** As a Production Operator, I want to start a production order and have ingredients
  auto-issued from the freshest-first raw material lots, so that I don't manually track which
  lot to pull from.
- **US-11** As a Production Operator, I want to record the actual yield when a batch is done,
  so that management can see yield variance vs. the standard recipe.
- **US-12** As a Production Manager, I want the system to block starting an order if raw
  material stock is insufficient, so that we don't discover a shortage mid-run.

## Batch Tracking & Expiry
- **US-13** As a Quality Manager, I want to trace any batch back to its ingredients and
  suppliers, so that if a customer complaint comes in, I can identify the root cause in
  minutes, not hours.
- **US-14** As a Quality Manager, I want to trace which customers bought a specific batch, so
  that I can proactively notify them in a recall scenario.
- **US-15** As a Warehouse Staff, I want a dashboard widget showing batches expiring in 3 and
  7 days, so that I can prioritize discounting or pulling stock before it expires.
- **US-16** As an Inventory system, batches past their expiry date should auto-flag as EXPIRED
  daily, so that POS never sells expired stock even if a manager forgets to check.

## Inventory
- **US-17** As a Warehouse Staff, I want to transfer finished-goods batches between warehouses
  (e.g. Production → Outlet), so that stock reflects where it physically is.
- **US-18** As a Warehouse Staff, I want to run a stock opname (physical count) and have
  variances auto-applied as adjustments, so that system stock matches reality after a count.
- **US-19** As an Accountant, I want every stock movement logged immutably, so that I can
  audit exactly what happened to any unit of inventory.

## Purchasing
- **US-20** As a Warehouse Staff, I want to raise a purchase request for low-stock raw
  materials, so that purchasing knows what to reorder.
- **US-21** As a Purchasing Manager, I want to convert a request into a PO with supplier
  pricing, so that I can formally order from a supplier.
- **US-22** As a Warehouse Staff, I want receiving goods to automatically create a
  traceable lot with an expiry date, so that FEFO and traceability work from day one of the
  material's life in our system.
- **US-23** As a Purchasing Manager, I want to see a supplier's on-time delivery rate and
  price history, so that I can negotiate or switch suppliers with data.

## Waste Management
- **US-24** As a Warehouse Staff, I want to record spoiled/damaged raw material or finished
  goods with a reason, so that shrinkage is tracked, not silently absorbed.
- **US-25** As a Finance Manager, I want waste automatically valued and posted to a waste
  expense account, so that P&L reflects true cost of spoilage.
- **US-26** As an Operations Manager, I want a waste % and trend report, so that I can see if
  a process change is reducing spoilage over time.

## Delivery
- **US-27** As a Dispatcher, I want to assign a driver and vehicle to a delivery and update its
  status as it moves, so that customers and staff know where their order is.

## Subscriptions
- **US-28** As a Corporate Customer, I want to subscribe to a weekly juice package, so that I
  don't have to reorder manually every week.
- **US-29** As the System, subscriptions due today should auto-generate a sale, so that
  recurring revenue doesn't depend on someone remembering to place the order.

## CRM & Loyalty
- **US-30** As a Marketing Manager, I want to see a customer's favorite products, so that I can
  tailor promotions.
- **US-31** As a Member Customer, I want to earn loyalty points on purchases and be promoted
  to a higher tier automatically, so that I'm rewarded for repeat business without asking.

## Accounting
- **US-32** As a Finance Manager, I want P&L, Balance Sheet, Cash Flow, and Product
  Profitability reports generated from live operational data, so that I don't reconcile
  spreadsheets manually at month-end.

## Executive Dashboard
- **US-33** As an Owner, I want one screen showing today's sales, this month's yield %, waste
  value, expiring stock, and net profit, so that I can assess the business health in under a
  minute each morning.

## Mobile (Future)
- **US-34** As a Driver, I want a mobile app to see my delivery list and update status from my
  phone, so that I don't need a laptop in the van. *(The REST API is already mobile-ready;
  see `10-full-roadmap.md` Phase 4.)*
