     1|## SoloCRM Build Plan
     2|
     3|## PHASE 1: STABILIZE
     4|- [x] Build passes, auth works, protected routes
     5|
     6|## PHASE 2: CONTACTS
     7|- [x] Landing page: "Every lead. Every deal. No BS pricing." hero, vs HubSpot comparison table, $10/mo CTA
     8|- [x] Contact list: searchable, filterable by source, sortable by name/date/company
     9|- [x] Add/edit contact: name, email, phone, company, title, source (cold/referral/inbound), tags, notes
    10|- [x] Contact detail: all info, activity timeline, linked deals, tasks, email history
    11|- [x] Bulk import: CSV upload with column mapping → parse with papaparse → bulk insert
    12|- [x] Duplicate detection: warn if email already exists before adding
    13|
    14|## PHASE 3: PIPELINE
    15|- [x] Create pipeline: user names stages (e.g. Lead → Qualified → Proposal → Won/Lost)
    16|- [x] Kanban board: drag-and-drop deals between stages (use dnd-kit)
    17|- [x] Deal card: contact name, value, probability, days in stage
    18|- [x] Add/edit deal: title, contact, value, close date, probability, stage, notes
    19|- [x] Deal detail: full info, activity timeline, notes
    20|- [x] Won/Lost: mark deal outcome, reason for loss
    21|- [x] Revenue forecast: sum of (deal value × probability) for all open deals
    22|
    23|## PHASE 4: TASKS & FOLLOW-UPS
    24|- [x] Task list: all tasks across all contacts, sorted by due date
    25|- [x] Add task: title, contact, due date, type (call/email/meeting/follow-up)
    26|- [x] Task completion: check off, logs to contact timeline
    27|- [x] Overdue tasks: red badge on overdue, daily digest email
    28|- [x] Reminders: email reminder 1 day before task due date via Resend
    29|
    30|## PHASE 5: EMAIL SEQUENCES
    31|- [x] Sequence builder: create multi-step email sequence (Step 1: Day 0, Step 2: Day 3, Step 3: Day 7)
    32|- [x] Each step: subject, body (with {{firstName}}, {{company}} merge tags), delay days
    33|- [x] Enroll contact: assign contact to sequence, system schedules emails automatically
    34|- [x] Email sending: Resend sends scheduled emails, logs to contact timeline
    35|- [x] Unsubscribe: every email has unsubscribe link, marks contact as opted-out
    36|
    37|## PHASE 6: AI ASSISTANT
    38|- [x] AI email writer: "Write a follow-up email for {{contactName}} who showed interest in {{product}}" → generates draft
    39|- [x] AI deal summary: "Summarize the status of my {{dealTitle}} deal" → reads timeline, writes summary
    40|- [x] AI next step suggester: given deal stage + days stuck → suggests best next action
    41|
    42|## PHASE 7: TESTING & POLISH
    43|- [x] Unit tests: pipeline calculations, sequence scheduling logic, merge tag replacement
    44|- [x] E2e: add contact → create deal → move through pipeline → mark won
    45|- [x] Mobile: contact list and pipeline kanban must work at 375px
    46|- [x] Lighthouse ≥85
    47|
    48|## PHASE 8: ADVANCED
    49|- [x] Chrome extension: capture LinkedIn profile → auto-add as contact in SoloCRM
    50|- [x] Email tracking: track opens and clicks on sent emails (pixel tracking via Resend webhooks)
    51|- [x] Meeting notes: text field per contact, AI generates action items from notes
    52|- [x] Zapier webhook: trigger automations when deal stage changes or contact added
    53|

## PHASE 7: PRODUCTION HARDENING
- [x] npm run build: zero errors, zero warnings
- [x] npx tsc --noEmit: zero errors
- [x] Add loading.tsx and error.tsx to all dashboard routes
- [x] Pipeline kanban: test drag-and-drop at 375px (touch events) — must work on mobile
- [x] All deal values: use Intl.NumberFormat(locale, {style:'currency', currency}) — never raw numbers
- [x] Contact table: virtual scrolling must handle 1000+ contacts without lag (@tanstack/react-virtual)
- [x] Add Zod validation to all API routes
- [x] Open Graph tags, robots.txt, sitemap.xml

## PHASE 8: KANBAN POLISH — MAKE IT FEEL PREMIUM
- [x] Deal card drag animation: scale to 1.03 + shadow + 2deg rotation while dragging
- [x] Column totals update live as drag happens (optimistic — don't wait for DB)
- [x] "Won" animation: when deal dragged to Won column → confetti burst (CSS keyframes, no library)
- [x] "Lost" animation: when deal dragged to Lost → card fades to gray with strikethrough
- [x] Deal age indicator: if deal stuck in same stage >7 days → amber dot. >14 days → red dot
- [ ] Revenue forecast bar: above kanban, shows "(sum of deal values × probability)" rolling total
- [x] Quick edit: click deal value directly on card to edit inline without opening modal
- [ ] Keyboard shortcut: press N on pipeline page → opens new deal modal

## PHASE 9: EMAIL SEQUENCE ENGINE — COMPLETE IT
- [ ] processScheduledEmails() function: check scheduled_emails WHERE scheduled_at <= now() AND sent_at IS NULL
- [ ] For each due email: replace merge tags → send via Resend → mark sent_at → check for next step → schedule next email
- [ ] Call processScheduledEmails() on dashboard page load (client-side fetch) AND via /api/cron/sequences route
- [ ] Vercel cron: vercel.json with cron job every 15 minutes calling /api/cron/sequences
- [ ] Unsubscribe page: /unsubscribe/[contactId]/[token] — marks is_opted_out=true → shows "You've been unsubscribed"
- [ ] Sequence analytics: open rate (opened_at set when tracking pixel loaded), click rate stub
- [ ] Enrollment dashboard: per sequence, show enrolled count, active, completed, unsubscribed

## PHASE 10: AI ASSISTANT — COMPLETE AND POLISH
- [ ] AI email writer (/api/ai/email): fully working — generates subject + body for given contact + context
- [ ] AI deal summary (/api/ai/deal-summary): reads deal + activities → returns 2-sentence status + next action
- [ ] AI next step suggester on deal card: "What should I do next?" button → mini AI card appears below deal with suggestion
- [ ] AI contact enrichment stub: "Enrich" button on contact → calls /api/ai/enrich → tries to find LinkedIn, company size, industry based on name + company → fills in blanks
- [ ] AI bulk email: select 10 contacts → "Write email to all" → AI writes one personalized email per contact (varies opening line, references company) → approval modal → send all via Resend

## PHASE 11: REPORTING AND INSIGHTS
- [ ] Pipeline velocity: average days per stage (how long deals sit in Lead, Contacted, etc.)
- [ ] Win rate by source: cold vs referral vs inbound — which produces most wins?
- [ ] Deal size distribution: histogram of deal values (where are most deals clustered?)
- [ ] Monthly closed revenue chart: won deals by month for last 12 months (bar chart)
- [ ] Sales forecast accuracy: compare forecast vs actual closed per month
- [ ] Top 10 contacts by deal value table
- [ ] Export reports to CSV: every table in analytics has "Export CSV" button

## PHASE 12: GROWTH FEATURES
- [ ] Referral link: /ref/[userId] — when new user signs up via link, both get 1 month Pro free
- [ ] CSV export for everything: contacts, deals, tasks all have export buttons
- [ ] Import from HubSpot: paste HubSpot CSV export → parse column mapping → import contacts + deals
- [ ] Deal templates: pre-made deal templates for common sales types (Software Sale, Consulting, Retainer) — one-click creates deal with pre-filled stages and tasks
- [ ] Activity timeline filters: filter contact timeline by type (emails / tasks / deals / notes)
- [ ] Bulk task creation: select contacts → "Create task for all" → adds same task type to all selected contacts

## PHASE 13: TESTING AND LAUNCH PREP
- [ ] Unit tests: merge tag replacement (all tags, edge cases), sequence scheduling (correct delay calculation), pipeline stage calculation, deal value aggregation
- [ ] E2e: add contact → enroll in sequence → confirm email scheduled → mark task complete → drag deal to Won
- [ ] All tests pass: npx vitest run
- [ ] Lighthouse Performance >= 85 — fix until met
- [ ] README.md: setup, env vars, Supabase schema setup, first-time user guide
- [ ] DEPLOY.md: Vercel deployment, Stripe product creation for Pro plan
- [ ] Landing page A/B headline test note in README: suggest testing "No BS pricing" vs "Built for solopreneurs"

## PHASE 7: PRODUCTION HARDENING
- [ ] npm run build: zero errors, zero warnings
- [ ] npx tsc --noEmit: zero errors
- [ ] Add loading.tsx and error.tsx to all dashboard routes
- [ ] Pipeline kanban: test drag-and-drop at 375px (touch events) — must work on mobile
- [ ] All deal values: use Intl.NumberFormat(locale, {style:'currency', currency}) — never raw numbers
- [ ] Contact table: virtual scrolling must handle 1000+ contacts without lag (@tanstack/react-virtual)
- [ ] Add Zod validation to all API routes
- [ ] Open Graph tags, robots.txt, sitemap.xml

## PHASE 8: KANBAN POLISH — MAKE IT FEEL PREMIUM
- [ ] Deal card drag animation: scale to 1.03 + shadow + 2deg rotation while dragging
- [ ] Column totals update live as drag happens (optimistic — don't wait for DB)
- [ ] "Won" animation: when deal dragged to Won column → confetti burst (CSS keyframes, no library)
- [ ] "Lost" animation: when deal dragged to Lost → card fades to gray with strikethrough
- [ ] Deal age indicator: if deal stuck in same stage >7 days → amber dot. >14 days → red dot
- [ ] Revenue forecast bar: above kanban, shows "(sum of deal values × probability)" rolling total
- [ ] Quick edit: click deal value directly on card to edit inline without opening modal
- [ ] Keyboard shortcut: press N on pipeline page → opens new deal modal

## PHASE 9: EMAIL SEQUENCE ENGINE — COMPLETE IT
- [ ] processScheduledEmails() function: check scheduled_emails WHERE scheduled_at <= now() AND sent_at IS NULL
- [ ] For each due email: replace merge tags → send via Resend → mark sent_at → check for next step → schedule next email
- [ ] Call processScheduledEmails() on dashboard page load (client-side fetch) AND via /api/cron/sequences route
- [ ] Vercel cron: vercel.json with cron job every 15 minutes calling /api/cron/sequences
- [ ] Unsubscribe page: /unsubscribe/[contactId]/[token] → marks is_opted_out=true → shows "You've been unsubscribed"
- [ ] Sequence analytics: open rate (opened_at set when tracking pixel loaded), click rate stub
- [ ] Enrollment dashboard: per sequence, show enrolled count, active, completed, unsubscribed

## PHASE 10: AI ASSISTANT — COMPLETE AND POLISH
- [ ] AI email writer (/api/ai/email): fully working — generates subject + body for given contact + context
- [ ] AI deal summary (/api/ai/deal-summary): reads deal + activities → returns 2-sentence status + next action
- [ ] AI next step suggester on deal card: "What should I do next?" button → mini AI card appears below deal with suggestion
- [ ] AI contact enrichment stub: "Enrich" button on contact → calls /api/ai/enrich → tries to find LinkedIn, company size, industry based on name + company → fills in blanks
- [ ] AI bulk email: select 10 contacts → "Write email to all" → AI writes one personalized email per contact (varies opening line, references company) → approval modal → send all via Resend

## PHASE 11: REPORTING & INSIGHTS
- [ ] Pipeline velocity: average days per stage (how long deals sit in Lead, Contacted, etc.)
- [ ] Win rate by source: cold vs referral vs inbound — which produces most wins?
- [ ] Deal size distribution: histogram of deal values (where are most deals clustered?)
- [ ] Monthly closed revenue chart: won deals by month for last 12 months (bar chart)
- [ ] Sales forecast accuracy: compare forecast vs actual closed per month
- [ ] Top 10 contacts by deal value table
- [ ] Export reports to CSV: every table in analytics has "Export CSV" button

## PHASE 12: GROWTH FEATURES
- [ ] Referral link: /ref/[userId] — when new user signs up via link, both get 1 month Pro free
- [ ] CSV export for everything: contacts, deals, tasks all have export buttons
- [ ] Import from HubSpot: paste HubSpot CSV export → parse column mapping → import contacts + deals
- [ ] Deal templates: pre-made deal templates for common sales types (Software Sale, Consulting, Retainer) — one-click creates deal with pre-filled stages and tasks
- [ ] Activity timeline filters: filter contact timeline by type (emails / tasks / deals / notes)
- [ ] Bulk task creation: select contacts → "Create task for all" → adds same task type to all selected contacts

## PHASE 13: TESTING & LAUNCH PREP
- [ ] Unit tests: merge tag replacement (all tags, edge cases), sequence scheduling (correct delay calculation), pipeline stage calculation, deal value aggregation
- [ ] E2e: add contact → enroll in sequence → confirm email scheduled → mark task complete → drag deal to Won
- [ ] All tests pass: npx vitest run
- [ ] Lighthouse Performance ≥ 85 — fix until met
- [ ] README.md: setup, env vars, Supabase schema setup, first-time user guide
- [ ] DEPLOY.md: Vercel deployment, Stripe product creation for Pro plan
- [ ] Landing page A/B headline test note in README: suggest testing "No BS pricing" vs "Built for solopreneurs"


## PHASE 14: INTEGRATIONS HUB
- [ ] Create /dashboard/integrations page: grid of integration cards (Zapier, Slack, Gmail, Cal.com, Stripe, HubSpot Import)
- [ ] Zapier webhook: when deal stage changes → POST to user's Zapier webhook URL (stored in profiles.zapier_webhook_url)
- [ ] Slack notification: when deal won → POST to user's Slack webhook URL with deal details (profiles.slack_webhook_url)
- [ ] Gmail integration stub: connect Gmail → sync sent emails to contact timeline (OAuth flow, store token, mark as "coming soon" if complex)
- [ ] Cal.com / Calendly sync stub: when meeting booked → auto-create task in SoloCRM (webhook receiver endpoint)
- [ ] HubSpot CSV import: /dashboard/import — upload HubSpot contacts export CSV → parse with papaparse → map columns → bulk insert
- [ ] Pipedrive CSV import: same page, different column mapping for Pipedrive format
- [ ] Export package: one-click export of ALL data (contacts + deals + tasks + notes) as ZIP of CSVs

## PHASE 15: ADVANCED PIPELINE FEATURES
- [ ] Multiple pipelines: user can create additional pipelines (e.g. "New Business" + "Renewal" + "Partnerships")
- [ ] Pipeline switch: dropdown in pipeline view to switch between pipelines
- [ ] Pipeline templates: 5 pre-built pipeline templates (SaaS Sales, Agency, Consulting, Ecommerce, Recruiting) — one-click apply
- [ ] Deal scoring: auto-score deals 1-100 based on: days since last activity, probability, value, contact engagement
- [ ] Stale deal detection: deal with no activity in 14+ days → red "stale" badge → daily digest of stale deals
- [ ] Bulk deal operations: select multiple deals → bulk update stage / bulk assign / bulk delete
- [ ] Deal cloning: duplicate a deal with all its tasks and notes (useful for repeat business with same client)

## PHASE 16: COMMUNICATION CENTER
- [ ] Inbox view: /dashboard/inbox — shows all scheduled emails, tasks due today, follow-ups overdue, deals needing attention — one unified to-do list
- [ ] Email templates library: user saves frequently-used email templates with merge tags — browse and insert in AI email writer
- [ ] Meeting scheduler link: user sets their Calendly/BookFlow link in settings → "Schedule Meeting" button on contact detail inserts link in email
- [ ] Call logger: "Log a call" button on contact → modal with call duration, outcome (interested/not interested/callback), notes → adds to timeline
- [ ] SMS log: "Log SMS" button → records that an SMS was sent (no actual sending — just tracking)
- [ ] WhatsApp quick link: each contact with a phone number → WhatsApp icon → opens wa.me/[phone] in new tab

## PHASE 17: REVENUE INTELLIGENCE
- [ ] Win probability AI: for each deal, "Predict win probability" button → sends deal info + activity history to OpenAI → returns probability estimate with reasoning
- [ ] Pipeline health score: composite score (0-100) based on: deals moving vs stuck, days to close forecast, conversion rate trend
- [ ] Seasonal analysis: compare Q1 vs Q2 vs Q3 vs Q4 win rates — detect seasonal patterns
- [ ] Deal value tracking: for recurring revenue deals, track MRR impact of each deal won
- [ ] Revenue goal tracker: user sets monthly revenue goal → dashboard shows progress bar (deals won this month vs goal)
- [ ] Lead source ROI: which lead source produces highest LTV? — table showing avg deal size × win rate per source

## PHASE 18: COLLABORATION (PRO GROWTH FEATURE)
- [ ] Shared pipeline: invite a partner or VA to see the pipeline (read-only or edit access)
- [ ] Activity mentions: when writing a note, @mention a collaborator → they get email notification
- [ ] Deal assignment: assign deal to a team member (profiles table handles this — just add assigned_to field)
- [ ] Team inbox: shared view of all unresponded leads across team members
- [ ] Collision detection: if two team members open the same deal → show "John is also viewing this deal"

## PHASE 19: LAUNCH & GROWTH
- [ ] Trial: 14-day full Pro trial on signup → onboarding email sequence (day 1, 3, 7, 12, 14)
- [ ] Onboarding checklist: 6 steps (import contacts → create pipeline → add deals → create sequence → connect Zapier → invite team)
- [ ] "HubSpot refugee" landing page section: "Left HubSpot? Import your data in 2 minutes" with CSV import CTA
- [ ] Public roadmap page /roadmap: shows upcoming features — users can upvote (store votes in DB)
- [ ] Changelog page /changelog: shows what was recently shipped — builds trust with users
- [ ] Lighthouse ≥ 85 on all pages
- [ ] Full README.md + DEPLOY.md
- [ ] Product Hunt assets
- [ ] AppSumo listing prep: create APPSUMO_BRIEF.md — lifetime deal framing, feature list, tier breakdown
