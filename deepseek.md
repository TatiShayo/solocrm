# solocrm — DeepSeek Audit

**Date:** 2026-07-13
**Path:** `C:\Users\TATI\Desktop\DEV\solocrm\`
**Stack:** TypeScript / Next.js 16
**Tier:** 1 — Critical
**Dependencies:** Stale (`node_modules_old/`)

---

## 🔴 Security Vulnerabilities

### No Password Authentication — Critical

| Severity | File | Line(s) | Vulnerability | Exact Fix |
|----------|------|---------|---------------|-----------|
| 🔴 CRITICAL | `src/lib/auth.ts` | 1-157 | **Entire auth system has NO passwords.** `signInAction()` only checks if email exists — no password comparison, no OTP, no magic link, no OAuth. Anyone who knows an email can sign in. | Add password hashing with `scryptSync`: 1) Store `scrypt$<salt>$<hash>` in profiles table. 2) `signInAction` must accept and verify password. 3) Add signup password field. 4) Rate-limit login attempts per IP per email. |
| 🔴 CRITICAL | `src/lib/auth.ts` | 22-36 | **Demo user fallback gives full access.** If no session cookie exists, `getCurrentUser()` returns the demo user `solo@founder.com` — complete authentication bypass. | Remove fallback entirely. Return `null` and let protected routes redirect to login. Only seed demo user in dev mode behind a flag: `if (process.env.NODE_ENV === "development" && !process.env.DISABLE_DEMO)`. |
| 🟠 HIGH | `src/lib/auth.ts` | 13-14 | Cookie stores raw `profile.id` — no HMAC signing, no session token. If an attacker guesses or enumerates user IDs, they impersonate anyone. | Sign session with HMAC: `token = signSession(userId)` using `crypto.createHmac("sha256", APP_SECRET)`. Verify on every request. |
| 🟡 MEDIUM | All API routes | — | No CSRF protection for cookie-based auth. Relies on `sameSite: "lax"` which prevents most CSRF but not all (GET-based CSRF, form submissions from subdomains). | Add CSRF token middleware: generate token on login, require `X-CSRF-Token` header on state-changing requests. |
| 🟡 MEDIUM | `src/app/api/ai/write-email/route.ts` | — | No rate limiting on AI endpoints. | Add rate limiter per user ID, not just IP. |

### Other

| Severity | File | Line(s) | Vulnerability | Exact Fix |
|----------|------|---------|---------------|-----------|
| ✅ | API key routes | — | Zod validation on all API key endpoints. Good. | — |
| ✅ | CRON routes | — | CRON_SECRET protected. Good. | — |
| ⚠️ | `src/lib/db.ts` | — | Mock DB uses JSON file on disk — synchronous I/O. In serverless, data is ephemeral and lost. | Use Supabase as primary store even in dev. If mock is needed, use in-memory store with periodic async flush to disk. |

---

## 🟠 Performance Issues

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🔴 CRITICAL | `src/lib/sequence-engine.ts` | 100-180 | `processScheduledEmails()` iterates emails sequentially with `await` on each `sendEmail()`, 2 `supabase.update()`, and 1 `supabase.insert()` — 4 round-trips per email. For 50 emails = 200 sequential DB calls. | Batch updates: collect all updates into arrays, then `Promise.all([...updates])` + `Promise.all([...inserts])`. Parallelize independent email sends with `Promise.allSettled()`. |
| 🟠 HIGH | `src/lib/ai.ts` | 24, 112, 188 | OpenAI API calls have NO timeout, NO retry logic, NO circuit breaker. A hung API call blocks the serverless function until Vercel timeout (10-60s). | Add `signal: AbortSignal.timeout(15_000)` to all fetch calls. Add exponential backoff retry wrapper (max 2 retries). |
| 🟡 MEDIUM | `src/app/(app)/contacts/contacts-client.tsx` | 25 | Fetches ALL contacts with `.select("*")` — no `.limit()`, no pagination. | Add `.range(offset, offset + pageSize)` or cursor-based pagination. |
| 🟡 MEDIUM | `src/app/dashboard/tasks/page.tsx` | 18 | Same — all tasks fetched without limit. | Add pagination. |

---

## 🟡 UI/UX Improvements

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🟠 HIGH | Landing + auth pages | — | Hardcoded colors: `#09100f`, `#06b6d4`, `#1a2e30`, `#0f1a1c` repeated 30+ times in `page.tsx`, `signup/page.tsx`, `login/page.tsx`. | Move to CSS custom properties or Tailwind theme: `--color-bg: #09100f; --color-accent: #06b6d4; --color-surface: #1a2e30; --color-surface-alt: #0f1a1c;` |
| 🟡 MEDIUM | Dashboard sub-routes | — | Only catch-all error boundary exists. Sub-routes (contacts, pipeline, sequences) lack route-level `error.tsx`. | Add `error.tsx` to `src/app/dashboard/contacts/`, `pipeline/`, `sequences/`, etc. |
| 🟡 MEDIUM | Tool pages | — | No `loading.tsx` for unsubscribe page, auth pages. | Add loading skeletons. |
| ✅ | `src/app/dashboard/layout.tsx` | 98-138 | Sidebar navigation has `aria-label`. Sonner toasts in settings. Good. | — |

---

## 🔧 Session: 2026-07-14 — Multi-Agent Deep Audit Sweep (Round 1)

### Security fixes applied

| Severity | Issue | Fix | Files |
|----------|-------|-----|-------|
| 🟠 HIGH | No security headers configured | Added HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy | `next.config.ts` |

### Deferred
- 12 instances of `error.message` leaked to clients across 8 API route files
- `node_modules_old/` still present in tree (flagged July 5, still not removed)

### Artifacts created
- `AUDIT_LOG.md` — full audit trail

---

## 🔧 Session: 2026-07-14 — Round 2: Adversarial, Reduction & Cross-Angle Sweep

### Infrastructure
- Created `src/middleware.ts` — orphaned `proxy.ts` now wired
- Added missing `@supabase/ssr` + `@supabase/supabase-js` to package.json

| Category | Package | Issue | Fix |
|----------|---------|-------|-----|
| 🟡 MEDIUM | `next 16.2.6`, `react 19.0.0` | Pinned — good. | — |
| 🟡 MEDIUM | `dnd-kit`, `lucide-react`, `papaparse` | Good — minimal deps. | — |
| 🟡 MEDIUM | Dev deps | `^4` on tailwindcss, `^9` on eslint, `^5` on typescript — loose pinning. | Pin to exact: `tailwindcss: 4.1.4`, `typescript: 5.7.3`. |

### Missing Dev Tooling
- No `typecheck` script in package.json
- No `vitest` or test framework
- No `.nvmrc`
- No `verify` script

---

## 📋 Priority Fix Queue

1. **[CRITICAL — No Password]** `src/lib/auth.ts` — Add `scryptSync` password hashing. Store `scrypt$<salt>$<hash>` in profile. Require password in `signInAction()`, `signUpAction()`. Rate-limit login attempts.
2. **[CRITICAL — Auth Bypass]** `src/lib/auth.ts:22-36` — Remove demo user fallback from `getCurrentUser()`. Return `null` on unauthenticated. Add `DEMO_USER_ENABLED` flag for dev mode only.
3. **[CRITICAL — No Session Signing]** `src/lib/auth.ts:13-14` — Replace raw user ID in cookie with HMAC-signed session token. Add `signSession(userId)` / `verifySession(token)` helpers.
4. **[HIGH — N+1 Sequence Engine]** `src/lib/sequence-engine.ts:100-180` — Batch updates/inserts with `Promise.all()`. Parallelize sends with `Promise.allSettled()`.
5. **[HIGH — No Timeout]** `src/lib/ai.ts:24,112,188` — Add `AbortSignal.timeout(15_000)` + retry wrapper to all OpenAI fetch calls.
6. **[MEDIUM — CSRF]** All API routes — Add CSRF token generation on login, require `X-CSRF-Token` header.
7. **[MEDIUM — Dependencies]** Add `.nvmrc`, `typecheck` script, `verify` script, `vitest`.
