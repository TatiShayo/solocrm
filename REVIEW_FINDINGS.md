# SoloCRM — Security & Quality Review Findings

Audit of the SoloCRM codebase focused on authorization/IDOR, RLS, input
validation, secrets, performance, and build/gate health. Severities: Critical /
High / Medium / Low. Status: **Fixed**, **Mitigated**, or **Accepted**.

---

## Critical

### C1 — Cross-tenant unsubscribe IDOR (proven, fixed)
**Status: Fixed** · `src/app/unsubscribe/*`, `src/app/api/unsubscribe/route.ts`,
`src/app/actions/contacts.ts`, `src/lib/sequence-engine.ts`

Two public opt-out paths trusted attacker-supplied identity:
1. `/unsubscribe?contactId=<raw id>` → `optOutContactPublicAction(contactId)`
   looked the contact up **by raw id with no auth**, returned its email address,
   set `is_opted_out`, and cancelled its sequences.
2. `/api/unsubscribe?token=…` hashed the id with an **unsalted default secret**
   (`CRON_SECRET || "solocrm-unsubscribe"`) and scanned **every tenant's
   contacts** for a match.

Impact: any unauthenticated user could enumerate contact IDs across all tenants,
disclose a victim's email, force-unsubscribe them, and cancel their sequences.

Fix: both entry points now require an **HMAC-signed token** minted server-side
when the email is sent (`makeUnsubscribeToken`). Raw IDs, legacy hashes,
tampered and forged tokens are all rejected (constant-time verify). The token
module **fails closed in production** if `APP_SECRET`/`CRON_SECRET` is unset.
Both paths are rate-limited. Proven by a 6-case regression test
(`src/lib/__tests__/unsubscribe-token.test.ts`).

---

## High

### H1 — Password authentication not enforced
**Status: Fixed** · `src/lib/auth.ts`, `src/app/actions/auth.ts`,
`src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/api/auth/*`

`signInAction` accepted an email only — anyone knowing a registered email (the
login page even advertised `solo@founder.com`) could sign in. `Profile` had no
`password_hash` field wired through. Fixed: login/signup UIs and server actions
now require a password; `signInAction(email, password)` verifies a scrypt hash;
API routes validate with Zod and are rate-limited.

### H2 — Missing security headers
**Status: Fixed** (prior round, extended) · `next.config.ts`

Added/extended: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`,
`X-Permitted-Cross-Domain-Policies`.

### H3 — Default/guessable signing secrets
**Status: Fixed (fail-closed)** · `src/lib/unsubscribe-token.ts`

Token signing fell back to a hardcoded default secret, letting anyone forge
tokens. Now throws in production when no secret is configured; dev keeps a clear
dev-only value. (`auth.ts` session secret shares the same env; documented in
README env section.)

---

## Medium

### M1 — Error-message leakage to clients
**Status: Fixed** · `src/app/api/**`, `src/app/dashboard/pipeline/actions.ts`

API routes returned raw Supabase/JS `error.message` (DB internals, column
names) to clients. Now logged server-side and returned as generic messages.

### M2 — Missing input validation on auth API
**Status: Fixed** · `src/lib/validation.ts`, `src/app/api/auth/*`

Added `signInSchema` / `signUpSchema`; all auth routes parse with `validateBody`.

### M3 — Defense-in-depth ownership on pipeline mutations
**Status: Fixed** · `src/app/dashboard/pipeline/actions.ts`

`deletePipeline` / `updateStages` relied on RLS alone. Added explicit
`user_id` ownership checks so a missing/misconfigured policy cannot expose
cross-tenant writes.

### M4 — CSV/formula injection on export
**Status: Fixed** · `src/lib/csv.ts`, `src/app/dashboard/analytics/_components/analytics-export.tsx`

Analytics CSV was built with naive `join(',')`: unescaped values allowed
delimiter breakout, and cells beginning with `= + - @` execute as formulas in
Excel/Sheets. Added `src/lib/csv.ts` (neutralises formula triggers, quotes and
doubles embedded quotes) and routed export through it. CSV **import** uses
PapaParse with `dynamicTyping:false` (no evaluation) — safe.

### M5 — No rate limiting on auth / opt-out
**Status: Fixed** · `src/lib/rate-limit.ts`

Added an in-memory sliding-window limiter; applied to signin/signup (server
action + API) and both unsubscribe paths.

### M6 — RLS hardening / default-deny
**Status: Fixed** · `supabase/migrations/013_security_and_perf_hardening.sql`

All Supabase tables already had RLS + per-user policies. Added `FORCE ROW LEVEL
SECURITY` on every table (so even the owner role is subject to policy), revoked
`anon` grants on sensitive tables, and confirmed tables with RLS + no matching
policy deny by default.

---

## Low

### L1 — `password_hash` could reach the client
**Status: Fixed** · `src/lib/auth.ts`, `src/app/api/auth/me/route.ts`

Added `sanitizeProfile()` to strip the hash before serializing a profile.

### L2 — Unindexed hot query paths
**Status: Fixed** · `migration 013`

Added indexes: `scheduled_emails(resend_message_id)`, `(contact_id)`,
`(enrollment_id)`, partial `(scheduled_at) where sent_at is null`;
`deals(user_id,status)`, `(user_id,created_at)`; `contacts(user_id,name)`;
partial `tasks(due_date) where completed=false`.

### L3 — Repeated full-file reads in the JSON data layer
**Status: Fixed** · `src/lib/db.ts`

Every `TableAccess` query re-read and re-parsed the whole `db.json`. Added an
in-process read cache (5+ reads/render → 1); writes refresh it, `reset()` clones
`SEED_DATA` so seeded inserts never mutate the constant.

### L4 — No error/loading boundaries
**Status: Fixed** · `src/app/(app)/error.tsx`, `loading.tsx`, `src/app/global-error.tsx`

Added route-level error and loading boundaries plus an app-root error boundary;
none leak raw error text to users.

---

## Structural

### S1 — Dual parallel apps colliding at `/dashboard` (build-breaking)
**Status: Resolved** · removed `src/app/dashboard`, `src/app/auth`, `src/proxy.ts`, `src/middleware.ts`

The repo shipped two apps: a self-contained JSON-db app (route group `(app)`,
cookie auth, fully tested, homepage-linked) and a Supabase app
(`dashboard/*` + supabase middleware) that required live Supabase, had no tests,
and whose middleware redirected every request to `/auth/login` — making the two
mutually exclusive. Next 16 refused to build (two pages at `/dashboard`; plus a
`middleware.ts`+`proxy.ts` conflict). Kept the tested, self-contained app;
retained the Supabase **API routes + migrations** for a future scale-out path.

---

## Accepted / documented

- **npm audit**: 2 **moderate** (PostCSS XSS via a transitive dep of Next).
  0 high, 0 critical. The only "fix" downgrades Next to 9.x (a severe breaking
  change) — **Accepted**; revisit when Next ships an updated PostCSS.
- **In-memory rate limiter & read cache** are single-instance by design,
  matching the single-instance JSON store. Documented in ARCHITECTURE.md.
- **eslint**: 0 errors; ~100 warnings (mostly `no-explicit-any` in the generic
  db layer and React-Compiler experimental rules) left as follow-up warnings.

---

## Gate status

`tsc --noEmit` ✅ · `eslint` ✅ (0 errors) · `next build` ✅ · `vitest` ✅ 32/32.
