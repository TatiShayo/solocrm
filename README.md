# SoloCRM

A focused CRM for solo founders and one-person sales teams: manage contacts, run
a drag-and-drop sales pipeline, track tasks, and automate follow-up email
sequences — with cookie-based auth and a zero-dependency data store that runs
out of the box.

Built with **Next.js 16** (App Router, React 19, Turbopack) and **Tailwind CSS v4**.

---

## Features

- **Contacts** — searchable list, rich detail view with an activity timeline,
  CSV import, tags, and notes.
- **Sales pipeline** — drag-and-drop kanban (@dnd-kit) with live column totals,
  a weighted revenue forecast (Σ value × stage probability), and won/lost flow.
- **Tasks** — per-contact and per-deal to-dos with due dates and reminders.
- **Email sequences** — multi-step drip campaigns with merge tags, scheduled
  send, and token-gated unsubscribe.
- **Dashboard** — KPIs, recent contacts, and upcoming tasks at a glance.
- **APIs** — personal API keys, outbound webhooks, and cron endpoints for
  reminders / sequence sending.
- Optional **AI** (deal summaries, next-step suggestions, email drafts) and
  **Resend** email, both feature-flagged by environment.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

No database or external service is required — data is seeded into `data/db.json`
on first run. Create an account at `/signup` (password required) and sign in.

## Scripts

| Command          | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Start the dev server                     |
| `npm run build`  | Production build                         |
| `npm run start`  | Serve the production build               |
| `npm run lint`   | ESLint                                   |
| `npm run test`   | Vitest unit / flow tests                 |

Type-check with `npx tsc --noEmit`. E2E spec lives in `e2e/` (Playwright).

## Environment

All optional — the app runs without them; features activate when set.

| Variable                        | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `APP_SECRET`                    | Signs session cookies **and** unsubscribe tokens. **Required in production** (the app fails closed otherwise). |
| `CRON_SECRET`                   | Bearer token for `/api/cron/*` and `/api/reminders/*`. |
| `RESEND_API_KEY`                | Enables real email sending (mocked otherwise). |
| `OPENAI_API_KEY`                | Enables AI assist features.                     |
| `NEXT_PUBLIC_APP_URL`           | Absolute base URL for links in emails.          |
| `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` | Only for the Supabase-backed API routes (see `supabase/`). |

## Architecture & security

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — stack, request/auth flow, directory
  map, data layer, and trade-offs.
- **[REVIEW_FINDINGS.md](./REVIEW_FINDINGS.md)** — security & quality review.
- **[AUDIT_LOG.md](./AUDIT_LOG.md)** — chronological audit record.

Highlights: per-request `requireUser()` authorization with ownership-scoped data
access, HMAC-signed opt-out tokens (no cross-tenant IDOR), Zod-validated API
boundaries, scrypt password hashing, rate-limited auth/opt-out, formula-injection-
safe CSV export, a full security-header set, and RLS default-deny on the
Supabase path.

## Testing

Vitest covers pipeline math, sequence scheduling, merge-tag rendering, the
end-to-end contact→deal→won flow, and a cross-tenant unsubscribe IDOR
regression. Current status: **32 passing**.
