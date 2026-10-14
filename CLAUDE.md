# CLAUDE.md — Bluma Juice POS

The product spec is [`PRD.md`](./PRD.md); read the relevant section before starting a phase. This file holds the rules that apply to every phase. If the two disagree, the PRD wins on behaviour and this file wins on conventions; flag the conflict instead of guessing.

## What we are building

A web POS for one Bluma Juice outlet: regular (walk-in) sales, scheduled pre-orders (PO) with a public order page, three delivery methods, flexible payment terms (after receipt, upfront, DP), invoices, returns and cash closing. Staff roles: `owner`, `cashier`, `courier`. Customers have no account; they are identified by WhatsApp number and use tokenized public links.

**Free tier first.** Running cost must stay at Rp0/month (QRIS fees aside). Before adding a service, package or Vercel feature, check it fits Vercel Hobby + Supabase Free. Avoid Vercel-only features other than Cron so the app can move to another host (e.g. Cloudflare via OpenNext).

## Stack

- Next.js (App Router) + TypeScript, Server Actions and Route Handlers. Next 16 uses `proxy.ts` (formerly `middleware.ts`).
- Tailwind CSS + shadcn/ui, mobile-first, PWA manifest.
- Supabase: Postgres, Auth (email + password), Storage. Client via `@supabase/ssr` + `@supabase/supabase-js`.
- SQL migrations in `supabase/migrations/` (no ORM).
- Zod for every form, Server Action and route input.
- `@react-pdf/renderer` for invoice PDFs, `qrcode` for QRIS, Recharts for charts.
- Vitest for unit tests; Playwright (preinstalled Chromium) for browser checks.
- Package manager: **pnpm**.

## Commands

```bash
pnpm dev          # local dev server
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest
pnpm build        # production build: run before every push
supabase db push  # apply migrations to the linked Supabase project
```

Before pushing: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must all pass.

## Folder structure

```
app/
  (staff)/        pos, orders, po, invoices, dashboard, settings  (login required)
  (public)/       po/[slug], t/[token], inv/[token]               (no login)
  login/
  api/            cron/keepalive, invoices/[token]/pdf, webhooks/midtrans
lib/
  supabase/       server.ts, client.ts, admin.ts (service role, server only)
  orders/         state.ts (status machine), …
  env.ts          Zod-validated environment
  money.ts        rupiah helpers
  dates.ts        WIB helpers
  wa.ts           wa.me click-to-chat links
components/ui/    shadcn components
supabase/migrations/
```

## Conventions

- **Money** is integer rupiah everywhere (DB `bigint`/`integer`, TS `number`). Never floats, never decimals. Display as `Rp25.000` via `lib/money.ts`.
- **Time** is stored as `timestamptz`; display and day boundaries are always Asia/Jakarta (WIB), e.g. `Jumat, 17 Okt 2026`. Never rely on the server's local timezone (Vercel runs UTC).
- **Language:** UI strings in Bahasa Indonesia; code, identifiers, DB, comments and commit messages in English.
- **Validation:** Zod on every input that crosses a trust boundary (forms, Server Actions, route handlers, webhooks).
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` is server-only. Modules that use it import `server-only`. Never expose it through `NEXT_PUBLIC_*`.
- **RLS** is on for every table. Public pages (`/po`, `/t`, `/inv`) read only through server code keyed by the slug or a 32-char random token, never with the anon key directly from the browser.
- **Privacy:** public pages show first name and masked phone only.
- **Prices** are copied into `order_items` at order time; issued invoices are never edited (void or credit note instead).
- **Integrity-critical logic lives in Postgres functions** with row locks: PO quota booking, FEFO batch deduction, invoice/credit-note numbering. Write the migration and its tests before the UI.
- **Idempotency:** payment confirmation and webhooks must be safe to repeat (one confirm per payment, unique gateway reference).
- **Audit:** every status change and payment confirmation is logged with user and timestamp.
- Number formats: orders `SO-YYMMDD-001` / `PO-YYMMDD-001`; invoices `INV/BLM/YYYY/MM/0001`; credit notes `CN/BLM/YYYY/MM/0001` (sequential per month, voids keep their number).

## Order status machine

Single source of truth: `lib/orders/state.ts`. Status changes only through server functions that check this map and write `order_status_logs`. Do not duplicate the map elsewhere; import it.

```ts
export const ORDER_STATUSES = [
  'pending',          // PO submitted by customer, awaiting staff review
  'awaiting_payment', // confirmed, upfront/DP not yet paid
  'confirmed',
  'ready',            // Ambil langsung: ready for pickup
  'on_the_way',       // Diantar mandiri / Kurir
  'received',
  'completed',        // received AND payment_status = 'paid'
  'cancelled',
] as const;

export const ALLOWED_TRANSITIONS = {
  pending:          ['awaiting_payment', 'confirmed', 'cancelled'],
  awaiting_payment: ['confirmed', 'cancelled'],        // paid (full or DP) / unpaid by deadline
  confirmed:        ['ready', 'on_the_way', 'cancelled'], // cancel: owner only
  ready:            ['received'],
  on_the_way:       ['received'],
  received:         ['completed'],                    // only when payment_status = 'paid'
  completed:        [],
  cancelled:        [],
} as const;
```

Rules the map alone does not express:

- `pending → confirmed` only for pay-after-receipt; upfront/DP go to `awaiting_payment`.
- `confirmed → ready` for `pickup`; `confirmed → on_the_way` for `self_delivery` / `courier`.
- After confirmation only the owner may cancel; customers can cancel only while `pending`. Cancelling after any payment requires a refund note.
- Walk-in "Serahkan sekarang" runs `confirmed → ready → received` in one action, logging each step.
- Payment status is a separate field: `unpaid → dp_paid → paid` (or `unpaid → paid`).

Enums: delivery method `pickup` (Ambil langsung) | `self_delivery` (Diantar mandiri) | `courier` (Kurir); payment term `after_receipt` (default) | `upfront` | `dp`; payment method `qris_static` | `qris_dynamic` | `bank_transfer` | `cash`.

## Environment variables

See `.env.example`. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `APP_BASE_URL`, `CRON_SECRET`. Phase 2 gateway: `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`. Access them through `lib/env.ts`, not `process.env` scattered around.

## Working agreement

- One PRD phase per session (see "Build plan" in `PRD.md`). Start in plan mode; write the plan to `docs/plans/phase-N-*.md`; implement after review.
- Write tests for the state machine and Postgres functions (quota, FEFO, numbering) before the UI that uses them.
- Keep changes inside the current phase's scope; note follow-ups in the plan file instead of building them.
- Each phase ends with a Vercel preview that meets the phase's "Done when".
