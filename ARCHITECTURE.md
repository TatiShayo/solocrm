# SoloCRM — Architecture

A single-founder CRM built with Next.js 16 (App Router, Turbopack) and React 19.
It manages contacts, a drag-and-drop sales pipeline, tasks, and automated email
sequences, with cookie-based authentication and a file-backed data store that
runs with zero external services.

## Stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Server Components, Server Actions) |
| UI            | React 19, Tailwind CSS v4, lucide-react icons           |
| Drag & drop   | @dnd-kit (pipeline kanban)                              |
| Data store    | JSON file (`data/db.json`) via a typed access layer      |
| Auth          | HTTP-only signed session cookie (HMAC), scrypt password hashing |
| Validation    | Zod at API boundaries                                    |
| Email (opt.)  | Resend HTTP API (mocked when unconfigured)              |
| AI (opt.)     | OpenAI (feature-flagged by env)                          |
| Tests         | Vitest (unit/flow), Playwright (E2E spec)               |

## Request / auth flow

```
Browser
  │  (HTTP-only cookie: solocrm-session = userId:ts:HMAC)
  ▼
Server Component / Server Action / Route Handler
  │  requireUser()  ── verifies HMAC, loads Profile, else redirect('/login')
  ▼
Typed data layer (src/lib/db.ts)
  │  ownership-scoped queries (user_id === user.id)
  ▼
data/db.json  (atomic write via temp file + rename; in-process read cache)
```

Authentication is enforced **per page/action** through `requireUser()` (server
side), which redirects unauthenticated requests to `/login`. There is no
network middleware; protection lives next to the data access so it cannot be
bypassed by hitting an action directly.

## Directory map

```
src/
  app/
    (app)/               Authenticated application (route group, no URL segment)
      layout.tsx         Sidebar shell; calls requireUser()
      dashboard/         KPIs, recent contacts, upcoming tasks
      contacts/          List + [id] detail (timeline, deals, tasks, sequences)
      pipeline/          Kanban board (drag to change stage), revenue forecast
      deals/[id]/        Deal detail
      tasks/             Task list
      sequences/         Email sequence management
      error.tsx          Route error boundary
      loading.tsx        Route loading UI
    login/ signup/       Public auth pages (password required)
    unsubscribe/         Public, token-gated opt-out page
    global-error.tsx     App-root error boundary
    api/
      auth/              signin, signup, signout, me  (zod + rate limited)
      contacts/          List/search + create (Chrome-extension API-key auth)
      cron/              send-emails, sequences, overdue-digest (CRON_SECRET)
      reminders/         send-reminders (CRON_SECRET)
      settings/api-keys/ Personal API-key CRUD
      webhooks/          Outbound webhook config + Resend inbound (svix-verified)
      unsubscribe/       Token-gated opt-out endpoint
    actions/             Server actions: auth, contacts, deals, sequences
  lib/
    db.ts                Typed JSON data layer (TableAccess<T>, read cache, write queue)
    auth.ts              Session sign/verify, scrypt hashing, requireUser, sanitizeProfile
    unsubscribe-token.ts HMAC-signed opt-out tokens (fail-closed in prod)
    rate-limit.ts        In-memory sliding-window limiter
    csv.ts               CSV escaping (formula-injection + delimiter safe)
    validation.ts        Zod schemas for API boundaries
    sequence-engine.ts   Supabase-based batch sender (used by cron)
    resend.ts openai.ts  External integrations (feature-flagged)
supabase/
  migrations/            SQL schema + RLS policies (for the Supabase-backed API routes)
  schema.sql             Full reference schema
```

## Data layer (`src/lib/db.ts`)

- `TableAccess<T>` provides `list / find / findById / insert / update / delete`.
- All access is **serialized** through a promise queue so concurrent requests
  never interleave a read/modify/write on the JSON file.
- Writes are **atomic**: serialize to `db.json.tmp`, then `rename`.
- An **in-process read cache** holds the last parsed snapshot; reads reuse it
  and writes refresh it, so a page that touches several tables parses the file
  once instead of once per query.
- Every query is **ownership-scoped** by the caller (`user_id === user.id`);
  detail lookups verify ownership before returning (or `notFound()`).

## Security model (summary)

- **AuthN**: signed HTTP-only cookie; scrypt password hashes with per-user salt;
  constant-time comparisons. Demo fallback is dev/test only, never production.
- **AuthZ / IDOR**: every read and mutation is scoped to the session user;
  detail routes verify ownership. Public opt-out is gated by an HMAC token, not
  a raw contact id.
- **Input**: Zod at API boundaries; JSON parse guarded; source/enum fields
  whitelisted.
- **Output**: API errors are logged server-side and returned generically (no DB
  internals). CSV export is escaped against formula injection.
- **Rate limiting**: auth and unsubscribe endpoints are per-IP limited.
- **Headers**: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy,
  Permissions-Policy, and related set in `next.config.ts`.
- **Supabase-backed routes** additionally rely on RLS (`force row level
  security`, per-user policies, default-deny) — see `supabase/migrations/`.

## Notable trade-offs

- The JSON store is single-instance by design (so is the in-memory rate limiter
  and read cache). A multi-instance deployment would move the store to Postgres
  and the limiter to a shared cache (Redis/Upstash). The Supabase migrations and
  API routes exist for that path.
- A previously-committed parallel Supabase UI (`app/dashboard/*`, `proxy.ts`,
  `app/auth/*`) collided with this app at `/dashboard` and required live
  Supabase; it was removed in favor of the self-contained, tested app. The
  Supabase **API routes and migrations** are retained.
