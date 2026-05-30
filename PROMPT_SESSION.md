You are a senior fullstack engineer. Continue building solocrm autonomously.

SESSION STATE:
Tasks remaining: 99
Tasks completed: 32
Current phase: 48|## PHASE 8: ADVANCED
Recent commits:
587775d done: lighthouse optimizations - metadata, SEO, image formats, console removal in prod
8595f96 done: mobile responsive - contacts table, kanban board, dashboard nav at 375px
5894db6 done: E2E test - contact → deal → pipeline → won workflow spec
35f3e3e done: unit tests - pipeline math, sequence scheduling, merge tag replacement (28 tests)
dada4f9 done: AI Assistant - deals API endpoint, copy-to-clipboard, cleanup dead code

KNOWN ISSUES FROM PREVIOUS SESSIONS:
# SoloCRM Learnings & Known Issues


═══ PRODUCT SPECIFICATION (from batch2-build-prompts) ═══
## PROMPT 5 — BUILD SOLOCRM
*(Open solocrm/ in a new CMD → paste this)*

---

```
You are a senior fullstack engineer. Build SoloCRM — a dead-simple, fully-featured CRM for solopreneurs at $10/month flat — in this Next.js project. YOLO MODE. Build everything. No questions.

═══════════════════════════════════════
PRODUCT OVERVIEW
═══════════════════════════════════════
SoloCRM kills HubSpot's bait-and-switch pricing model. HubSpot starts free then demands $800/mo to unlock real features. SoloCRM is $10/mo, nothing ever gated, no upsells, no surprise limits. Everything a solo founder needs to manage their pipeline.

Tagline: "Every lead. Every deal. No BS pricing."
Target: Solopreneurs, freelancers, consultants, indie hackers, small agency owners, anyone who tracks sales without a team.

Pricing:
- Free: 250 contacts, 1 pipeline, no AI, no email sequences
- Pro ($10/mo): Unlimited everything, AI assistant, email sequences, bulk import, full analytics

═══════════════════════════════════════
TECH STACK
═══════════════════════════════════════
- Next.js 14 App Router + TypeScript
- Supabase (auth + DB)
- Stripe (subscriptions)
- OpenAI GPT-4o-mini (AI email writer, deal summary)
- Resend (sequence emails)
- shadcn/ui + Tailwind (dark, cyan accent #06b6d4)
- @dnd-kit/core + @dnd-kit/sortable (Kanban drag-and-drop)
- @tanstack/react-table (contacts table, sortable/filterable)
- papaparse (CSV import)
- Recharts (revenue forecast chart)
- Framer Motion + Sonner

═══════════════════════════════════════
ALL PAGES TO BUILD
═══════════════════════════════════════

1. LANDING PAGE (src/app/page.tsx)
   - Navbar: SoloCRM logo, Features, Pricing, Login, "Start Free — No Card"
   - Hero: "Every Lead. Every Deal. No BS Pricing." Big headline. Subtitle: "HubSpot starts free, then charges $800/mo. SoloCRM is $10/mo. Forever. Nothing gated. No surprises."
   - Show a kanban board screenshot mockup in the hero
   - Feature highlights: 6 features (Contacts, Kanban Pipeline, Task Manager, Email Sequences, AI Assistant, Analytics)
   - "HubSpot trap" explainer section: visual showing HubSpot free → features locked → $800/mo. Then: SoloCRM $10/mo, everything unlocked.
   - Comparison table: SoloCRM vs HubSpot vs Pipedrive vs Monday CRM (SoloCRM wins on price+simplicity)
   - Pricing: 2 cards only (Free / Pro $10) — keep it extremely simple
   - Testimonials: 3 from indie hackers / consultants / freelancers
   - FAQ: 6 questions (can I import from HubSpot, is there a contract, how many pipelines, etc.)
   - Footer

2. AUTH: login, signup, reset, callback (standard)

3. DASHBOARD (src/app/dashboard/page.tsx)
   - Sidebar: logo, nav links (Dashboard, Contacts, Pipeline, Tasks, Sequences, Analytics, Settings, Billing)
   - Stats: Open Deals (count + total value), Deals Won This Month (count + value), Overdue Tasks, Contacts Added This Week
   - Revenue Forecast: recharts bar chart showing (sum of deal values × probability) per month for next 6 months
   - Pipeline health: small kanban preview showing count and value per stage
   - Tasks due today and tomorrow: list with contact name, task type, contact link
   - Recent activity feed: deal moved, contact added, task completed (last 10 events)

4. CONTACTS (src/app/dashboard/contacts/page.tsx)
   - @tanstack/react-table powered table (virtual scrolling for large lists)
   - Columns: select checkbox, name, company, email, phone, source, tags, created date, actions
   - Sortable columns, resizable (optional)
   - Filter bar: search by name/email/company, filter by tag (multi-select), filter by source
   - Row click → opens contact detail sidebar (not new page — sidebar overlay)
   - Bulk actions: delete selected, add tag to selected, add to sequence
   - "Add Contact" button → modal form
   - "Import CSV" button → upload → papaparse → column mapping UI → import with progress bar
   - Export CSV button

5. CONTACT DETAIL SIDEBAR (component):
   - Slides in from right (framer-motion)
   - Header: name, company
═══ END SPEC ═══

STARTUP SEQUENCE (do this first, every session):
1. Run: git log --oneline -10
2. Run: npm run build 2>&1 | tail -20
3. Run: npx tsc --noEmit 2>&1 | head -15
4. Read PLAN.md — find the first unchecked [ ] task in the lowest-numbered phase
5. Read LEARNINGS.md — avoid known blocked approaches

LOOP PROTOCOL:
Read PLAN.md → first [ ] task → implement it → run npm run build (must pass) →
git add -A && git commit -m "done: [task name]" → mark [x] in PLAN.md →
append to PROGRESS.md → move to next task IMMEDIATELY.

Never stop between tasks.
Never ask for confirmation.
Never wait for input.
If a task fails twice: write to LEARNINGS.md as BLOCKED, skip it, continue to next.
Install any npm package you need: npm install [package].
Search the web if stuck on an error.

Build exactly to the PRODUCT SPECIFICATION above. Every page, feature, and design detail must match.

You have 99 tasks remaining. Complete as many as possible before context runs out.
Start now. First task. Go.
