# Phase 0 — Setup (plan)

**Deliverable (PRD):** Next.js + Tailwind + shadcn/ui, Supabase project, GitHub repo linked to Vercel Hobby, `CLAUDE.md`.
**Done when:** the Vercel preview URL shows the login page.

Status: **plan, awaiting review.** `CLAUDE.md` and `PRD.md` are already committed.

## 0. Blocking decision: the existing code in this repo

The branch this work sits on already contains a different system from an earlier session (commit `953eeb2`, open PR #1): a NestJS + Prisma backend, a separate Next.js 14 frontend, Docker Compose with Postgres + Redis, and a `docs/` set describing a full manufacturing ERP (recipes, purchasing, accounting, loyalty). It does not match the PRD on stack (Supabase, single Next.js app on Vercel, no Docker/Redis) or scope (the PRD puts BOM, multi-warehouse, loyalty and accounting out of scope). `main` is an empty commit.

Options:

| Option | What happens | Trade-off |
| --- | --- | --- |
| **A. Start clean (recommended)** | Remove `backend/`, `frontend/`, `docker-compose.yml`, legacy `docs/0*-*.md` and `README.md` from this branch in one commit. The old system stays in git history (`953eeb2`) and on branch `claude/bluma-juice-erp-pos-4fexz1`; tag it `legacy-nest-erp`. Close PR #1 unmerged. | Clean root for Vercel's Next.js auto-detection; nothing lost. |
| B. Move to `legacy/` | Keep old code in a subfolder for reference. | Two Next.js apps and two lockfiles in one repo confuse Vercel, ESLint and Claude; dead code to maintain. |
| C. Rebase onto `main` | Restart this branch from the empty `main` and drop the legacy commit from it. | Cleanest history, but rewrites this branch; needs your go-ahead. |

Nothing will be deleted until you pick one.

## 1. Scaffold the app (repo root)

1. `pnpm create next-app@latest .` → TypeScript, ESLint, Tailwind, App Router, no `src/`, import alias `@/*`, Turbopack. (Current stable: Next 16.4, Tailwind 4.)
2. Add `package.json` scripts: `typecheck` (`tsc --noEmit`), `test` (`vitest run`); pin `packageManager` and `engines.node` (22.x).
3. `pnpm dlx shadcn@latest init` (neutral base, CSS variables), then add `button input label card sonner form`.
4. Root layout: `<html lang="id">`, Inter (or Geist) via `next/font`, viewport for mobile, `app/manifest.ts` (name "Bluma Juice POS", `display: standalone`, theme colour, placeholder 192/512 icons) so staff can install it on a tablet.
5. Route skeleton matching `CLAUDE.md`: `app/(staff)/dashboard/page.tsx` placeholder, `app/(public)/` empty group, `app/login/page.tsx`, `/` redirects to `/login` (or `/dashboard` when signed in).

## 2. Supabase wiring (no tables yet; tables are Phase 1)

1. `pnpm add @supabase/supabase-js @supabase/ssr zod server-only`; `pnpm add -D supabase vitest`.
2. `pnpm supabase init` → `supabase/config.toml`, empty `supabase/migrations/`.
3. `lib/env.ts`: Zod schema for public and server env; server part imports `server-only`. Fails fast with a clear message when a variable is missing.
4. `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (cookies, Server Components/Actions), `lib/supabase/admin.ts` (service role, `server-only`).
5. `proxy.ts`: refresh the Supabase session cookie and redirect unauthenticated requests under `(staff)` routes to `/login`. Public routes and `/login` pass through.
6. `.env.example` with all PRD variables and comments.

## 3. Login page (the Phase 0 "done" screen)

- `/login`: Bahasa Indonesia form (Email, Kata sandi, "Masuk"), shadcn Card, works at 375 px and on a 10" tablet.
- Server Action validates with Zod and calls `supabase.auth.signInWithPassword`; errors shown inline ("Email atau kata sandi salah"); success redirects to `/dashboard`.
- Sign-out action on the placeholder dashboard.
- Roles, `profiles` table and role-based routing are **Phase 1**; Phase 0 only proves auth round-trips.

## 4. Convention helpers with tests

Small now, used from Phase 2 onward; they lock in the conventions early.

- `lib/money.ts`: `formatRupiah(25000) → "Rp25.000"`, guard against non-integers.
- `lib/dates.ts`: WIB formatting (`Jumat, 17 Okt 2026`) and WIB start/end of day, independent of server TZ.
- Vitest tests for both, run with `TZ=UTC` to mimic Vercel.

## 5. CI and repo hygiene

- `.github/workflows/ci.yml`: on PR and push → pnpm install, lint, typecheck, test, build (placeholder env values so the build does not need real keys). Free GitHub Actions minutes.
- Replace the legacy `.gitignore` with Next.js's plus `supabase/.temp`, `.vercel`.
- New `README.md`: what it is, link to `PRD.md` and `CLAUDE.md`, local setup steps.

## 6. Supabase project and Vercel (needs you)

These are account actions I cannot complete from here:

1. **Supabase:** create a Free project (region `ap-southeast-1` Singapore, closest to Indonesia). Under Authentication, disable public sign-ups (staff are invited by the owner). Create one test user for the owner. Share or paste into Vercel: project URL, anon key, service role key.
2. **Vercel:** the Vercel connector is available in this session, so I can create the Hobby project linked to `fikrizailham/erp-app` once you confirm the team/account. Then set env vars (Production + Preview): the three Supabase keys, `APP_BASE_URL`, `CRON_SECRET`. Production branch: `main`.
3. In Supabase Auth URL configuration, add the Vercel production and preview URLs as redirect URLs.

## 7. Verification

- Local: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all green.
- Playwright screenshots of `/login` at 375×812 and 1024×768; unauthenticated `/dashboard` redirects to `/login`.
- With real Supabase keys: test user logs in and lands on `/dashboard`, logs out.
- Push → Vercel preview builds; open the preview URL and confirm the login page renders. **This is the Phase 0 exit criterion.**

## Deferred (not in Phase 0)

- `profiles`, roles, RLS policies, seed data → Phase 1.
- Keep-alive cron (`/api/cron/keepalive` + `vercel.json`) → Phase 1, as soon as there is a table to query; until then the free project may pause after 7 idle days (un-pause from the dashboard).
- Weekly `pg_dump` backup workflow → Phase 5.
- `lib/orders/state.ts` + tests → Phase 2 (the map is already specified in `CLAUDE.md`).

## Questions for you

1. Legacy code: option A, B or C (section 0)?
2. Do you already have a Supabase project and a Vercel account/team for this, or should I set up the Vercel side via the connector after you create Supabase?
3. Any brand colour or logo for the login page and PWA icon? Otherwise a neutral green/orange juice palette with a text logo.
