     1|     1|## SoloCRM Build Plan
     2|     2|
     3|     3|## PHASE 1: STABILIZE
     4|     4|- [x] Build passes, auth works, protected routes
     5|     5|
     6|     6|## PHASE 2: CONTACTS
     7|     7|- [x] Landing page: "Every lead. Every deal. No BS pricing." hero, vs HubSpot comparison table, $10/mo CTA
     8|     8|- [x] Contact list: searchable, filterable by source, sortable by name/date/company
     9|     9|- [x] Add/edit contact: name, email, phone, company, title, source (cold/referral/inbound), tags, notes
    10|    10|- [x] Contact detail: all info, activity timeline, linked deals, tasks, email history
    11|    11|- [x] Bulk import: CSV upload with column mapping → parse with papaparse → bulk insert
    12|    12|- [x] Duplicate detection: warn if email already exists before adding
    13|    13|
    14|    14|## PHASE 3: PIPELINE
    15|    15|- [x] Create pipeline: user names stages (e.g. Lead → Qualified → Proposal → Won/Lost)
    16|    16|- [x] Kanban board: drag-and-drop deals between stages (use dnd-kit)
    17|    17|- [x] Deal card: contact name, value, probability, days in stage
    18|    18|- [x] Add/edit deal: title, contact, value, close date, probability, stage, notes
    19|    19|- [x] Deal detail: full info, activity timeline, notes
    20|    20|- [x] Won/Lost: mark deal outcome, reason for loss
    21|    21|- [x] Revenue forecast: sum of (deal value × probability) for all open deals
    22|    22|
    23|    23|## PHASE 4: TASKS & FOLLOW-UPS
    24|    24|- [x] Task list: all tasks across all contacts, sorted by due date
    25|    25|- [x] Add task: title, contact, due date, type (call/email/meeting/follow-up)
    26|    26|- [x] Task completion: check off, logs to contact timeline
    27|    27|- [x] Overdue tasks: red badge on overdue, daily digest email
    28|    28|- [x] Reminders: email reminder 1 day before task due date via Resend
    29|    29|
    30|    30|## PHASE 5: EMAIL SEQUENCES
    31|    31|- [x] Sequence builder: create multi-step email sequence (Step 1: Day 0, Step 2: Day 3, Step 3: Day 7)
    32|    32|- [x] Each step: subject, body (with {{firstName}}, {{company}} merge tags), delay days
    33|    33|- [x] Enroll contact: assign contact to sequence, system schedules emails automatically
    34|    34|- [x] Email sending: Resend sends scheduled emails, logs to contact timeline
    35|    35|- [x] Unsubscribe: every email has unsubscribe link, marks contact as opted-out
    36|    36|
    37|    37|## PHASE 6: AI ASSISTANT
    38|    38|- [x] AI email writer: "Write a follow-up email for {{contactName}} who showed interest in {{product}}" → generates draft
    39|    39|- [x] AI deal summary: "Summarize the status of my {{dealTitle}} deal" → reads timeline, writes summary
    40|    40|- [x] AI next step suggester: given deal stage + days stuck → suggests best next action
    41|    41|
    42|    42|## PHASE 7: TESTING & POLISH
    43|    43|- [x] Unit tests: pipeline calculations, sequence scheduling logic, merge tag replacement
    44|    44|- [x] E2e: add contact → create deal → move through pipeline → mark won
    45|    45|- [x] Mobile: contact list and pipeline kanban must work at 375px
    46|    46|- [x] Lighthouse ≥85
    47|    47|
    48|    48|## PHASE 8: ADVANCED
    49|    49|- [x] Chrome extension: capture LinkedIn profile → auto-add as contact in SoloCRM
    50|    50|- [x] Email tracking: track opens and clicks on sent emails (pixel tracking via Resend webhooks)
    51|    51|- [x] Meeting notes: text field per contact, AI generates action items from notes
    52|    52|- [x] Zapier webhook: trigger automations when deal stage changes or contact added
    53|    53|
    54|
    55|## PHASE 7: PRODUCTION HARDENING
    56|- [x] npm run build: zero errors, zero warnings
    57|- [x] npx tsc --noEmit: zero errors
    58|- [x] Add loading.tsx and error.tsx to all dashboard routes
    59|- [x] Pipeline kanban: test drag-and-drop at 375px (touch events) — must work on mobile
    60|- [x] All deal values: use Intl.NumberFormat(locale, {style:'currency', currency}) — never raw numbers
    61|- [x] Contact table: virtual scrolling must handle 1000+ contacts without lag (@tanstack/react-virtual)
    62|- [x] Add Zod validation to all API routes
    63|- [x] Open Graph tags, robots.txt, sitemap.xml
    64|
    65|## PHASE 8: KANBAN POLISH — MAKE IT FEEL PREMIUM
    66|- [x] Deal card drag animation: scale to 1.03 + shadow + 2deg rotation while dragging
    67|- [x] Column totals update live as drag happens (optimistic — don't wait for DB)
    68|- [x] "Won" animation: when deal dragged to Won column → confetti burst (CSS keyframes, no library)
    69|- [x] "Lost" animation: when deal dragged to Lost → card fades to gray with strikethrough
    70|- [x] Deal age indicator: if deal stuck in same stage >7 days → amber dot. >14 days → red dot
    71|- [x] Revenue forecast bar: above kanban, shows "(sum of deal values × probability)" rolling total
    72|- [x] Quick edit: click deal value directly on card to edit inline without opening modal
    73|- [x] Keyboard shortcut: press N on pipeline page → opens new deal modal
    74|
    75|## PHASE 9: EMAIL SEQUENCE ENGINE — COMPLETE IT
    76|- [ ] processScheduledEmails() function: check scheduled_emails WHERE scheduled_at <= now() AND sent_at IS NULL
    77|- [ ] For each due email: replace merge tags → send via Resend → mark sent_at → check for next step → schedule next email
    78|- [ ] Call processScheduledEmails() on dashboard page load (client-side fetch) AND via /api/cron/sequences route
    79|- [ ] Vercel cron: vercel.json with cron job every 15 minutes calling /api/cron/sequences
    80|- [ ] Unsubscribe page: /unsubscribe/[contactId]/[token] — marks is_opted_out=true → shows "You've been unsubscribed"
    81|- [ ] Sequence analytics: open rate (opened_at set when tracking pixel loaded), click rate stub
    82|- [ ] Enrollment dashboard: per sequence, show enrolled count, active, completed, unsubscribed
    83|
    84|## PHASE 10: AI ASSISTANT — COMPLETE AND POLISH
    85|- [ ] AI email writer (/api/ai/email): fully working — generates subject + body for given contact + context
    86|- [ ] AI deal summary (/api/ai/deal-summary): reads deal + activities → returns 2-sentence status + next action
    87|- [ ] AI next step suggester on deal card: "What should I do next?" button → mini AI card appears below deal with suggestion
    88|- [ ] AI contact enrichment stub: "Enrich" button on contact → calls /api/ai/enrich → tries to find LinkedIn, company size, industry based on name + company → fills in blanks
    89|- [ ] AI bulk email: select 10 contacts → "Write email to all" → AI writes one personalized email per contact (varies opening line, references company) → approval modal → send all via Resend
    90|
    91|## PHASE 11: REPORTING AND INSIGHTS
    92|- [ ] Pipeline velocity: average days per stage (how long deals sit in Lead, Contacted, etc.)
    93|- [ ] Win rate by source: cold vs referral vs inbound — which produces most wins?
    94|- [ ] Deal size distribution: histogram of deal values (where are most deals clustered?)
    95|- [ ] Monthly closed revenue chart: won deals by month for last 12 months (bar chart)
    96|- [ ] Sales forecast accuracy: compare forecast vs actual closed per month
    97|- [ ] Top 10 contacts by deal value table
    98|- [ ] Export reports to CSV: every table in analytics has "Export CSV" button
    99|
   100|## PHASE 12: GROWTH FEATURES
   101|- [ ] Referral link: /ref/[userId] — when new user signs up via link, both get 1 month Pro free
   102|- [ ] CSV export for everything: contacts, deals, tasks all have export buttons
   103|- [ ] Import from HubSpot: paste HubSpot CSV export → parse column mapping → import contacts + deals
   104|- [ ] Deal templates: pre-made deal templates for common sales types (Software Sale, Consulting, Retainer) — one-click creates deal with pre-filled stages and tasks
   105|- [ ] Activity timeline filters: filter contact timeline by type (emails / tasks / deals / notes)
   106|- [ ] Bulk task creation: select contacts → "Create task for all" → adds same task type to all selected contacts
   107|
   108|## PHASE 13: TESTING AND LAUNCH PREP
   109|- [ ] Unit tests: merge tag replacement (all tags, edge cases), sequence scheduling (correct delay calculation), pipeline stage calculation, deal value aggregation
   110|- [ ] E2e: add contact → enroll in sequence → confirm email scheduled → mark task complete → drag deal to Won
   111|- [ ] All tests pass: npx vitest run
   112|- [ ] Lighthouse Performance >= 85 — fix until met
   113|- [ ] README.md: setup, env vars, Supabase schema setup, first-time user guide
   114|- [ ] DEPLOY.md: Vercel deployment, Stripe product creation for Pro plan
   115|- [ ] Landing page A/B headline test note in README: suggest testing "No BS pricing" vs "Built for solopreneurs"
   116|
   117|## PHASE 7: PRODUCTION HARDENING
   118|- [ ] npm run build: zero errors, zero warnings
   119|- [ ] npx tsc --noEmit: zero errors
   120|- [ ] Add loading.tsx and error.tsx to all dashboard routes
   121|- [ ] Pipeline kanban: test drag-and-drop at 375px (touch events) — must work on mobile
   122|- [ ] All deal values: use Intl.NumberFormat(locale, {style:'currency', currency}) — never raw numbers
   123|- [ ] Contact table: virtual scrolling must handle 1000+ contacts without lag (@tanstack/react-virtual)
   124|- [ ] Add Zod validation to all API routes
   125|- [ ] Open Graph tags, robots.txt, sitemap.xml
   126|
   127|## PHASE 8: KANBAN POLISH — MAKE IT FEEL PREMIUM
   128|- [ ] Deal card drag animation: scale to 1.03 + shadow + 2deg rotation while dragging
   129|- [ ] Column totals update live as drag happens (optimistic — don't wait for DB)
   130|- [ ] "Won" animation: when deal dragged to Won column → confetti burst (CSS keyframes, no library)
   131|- [ ] "Lost" animation: when deal dragged to Lost → card fades to gray with strikethrough
   132|- [ ] Deal age indicator: if deal stuck in same stage >7 days → amber dot. >14 days → red dot
   133|- [ ] Revenue forecast bar: above kanban, shows "(sum of deal values × probability)" rolling total
   134|- [ ] Quick edit: click deal value directly on card to edit inline without opening modal
   135|- [ ] Keyboard shortcut: press N on pipeline page → opens new deal modal
   136|
   137|## PHASE 9: EMAIL SEQUENCE ENGINE — COMPLETE IT
   138|- [ ] processScheduledEmails() function: check scheduled_emails WHERE scheduled_at <= now() AND sent_at IS NULL
   139|- [ ] For each due email: replace merge tags → send via Resend → mark sent_at → check for next step → schedule next email
   140|- [ ] Call processScheduledEmails() on dashboard page load (client-side fetch) AND via /api/cron/sequences route
   141|- [ ] Vercel cron: vercel.json with cron job every 15 minutes calling /api/cron/sequences
   142|- [ ] Unsubscribe page: /unsubscribe/[contactId]/[token] → marks is_opted_out=true → shows "You've been unsubscribed"
   143|- [ ] Sequence analytics: open rate (opened_at set when tracking pixel loaded), click rate stub
   144|- [ ] Enrollment dashboard: per sequence, show enrolled count, active, completed, unsubscribed
   145|
   146|## PHASE 10: AI ASSISTANT — COMPLETE AND POLISH
   147|- [ ] AI email writer (/api/ai/email): fully working — generates subject + body for given contact + context
   148|- [ ] AI deal summary (/api/ai/deal-summary): reads deal + activities → returns 2-sentence status + next action
   149|- [ ] AI next step suggester on deal card: "What should I do next?" button → mini AI card appears below deal with suggestion
   150|- [ ] AI contact enrichment stub: "Enrich" button on contact → calls /api/ai/enrich → tries to find LinkedIn, company size, industry based on name + company → fills in blanks
   151|- [ ] AI bulk email: select 10 contacts → "Write email to all" → AI writes one personalized email per contact (varies opening line, references company) → approval modal → send all via Resend
   152|
   153|## PHASE 11: REPORTING & INSIGHTS
   154|- [ ] Pipeline velocity: average days per stage (how long deals sit in Lead, Contacted, etc.)
   155|- [ ] Win rate by source: cold vs referral vs inbound — which produces most wins?
   156|- [ ] Deal size distribution: histogram of deal values (where are most deals clustered?)
   157|- [ ] Monthly closed revenue chart: won deals by month for last 12 months (bar chart)
   158|- [ ] Sales forecast accuracy: compare forecast vs actual closed per month
   159|- [ ] Top 10 contacts by deal value table
   160|- [ ] Export reports to CSV: every table in analytics has "Export CSV" button
   161|
   162|## PHASE 12: GROWTH FEATURES
   163|- [ ] Referral link: /ref/[userId] — when new user signs up via link, both get 1 month Pro free
   164|- [ ] CSV export for everything: contacts, deals, tasks all have export buttons
   165|- [ ] Import from HubSpot: paste HubSpot CSV export → parse column mapping → import contacts + deals
   166|- [ ] Deal templates: pre-made deal templates for common sales types (Software Sale, Consulting, Retainer) — one-click creates deal with pre-filled stages and tasks
   167|- [ ] Activity timeline filters: filter contact timeline by type (emails / tasks / deals / notes)
   168|- [ ] Bulk task creation: select contacts → "Create task for all" → adds same task type to all selected contacts
   169|
   170|## PHASE 13: TESTING & LAUNCH PREP
   171|- [ ] Unit tests: merge tag replacement (all tags, edge cases), sequence scheduling (correct delay calculation), pipeline stage calculation, deal value aggregation
   172|- [ ] E2e: add contact → enroll in sequence → confirm email scheduled → mark task complete → drag deal to Won
   173|- [ ] All tests pass: npx vitest run
   174|- [ ] Lighthouse Performance ≥ 85 — fix until met
   175|- [ ] README.md: setup, env vars, Supabase schema setup, first-time user guide
   176|- [ ] DEPLOY.md: Vercel deployment, Stripe product creation for Pro plan
   177|- [ ] Landing page A/B headline test note in README: suggest testing "No BS pricing" vs "Built for solopreneurs"
   178|
   179|
   180|## PHASE 14: INTEGRATIONS HUB
   181|- [ ] Create /dashboard/integrations page: grid of integration cards (Zapier, Slack, Gmail, Cal.com, Stripe, HubSpot Import)
   182|- [ ] Zapier webhook: when deal stage changes → POST to user's Zapier webhook URL (stored in profiles.zapier_webhook_url)
   183|- [ ] Slack notification: when deal won → POST to user's Slack webhook URL with deal details (profiles.slack_webhook_url)
   184|- [ ] Gmail integration stub: connect Gmail → sync sent emails to contact timeline (OAuth flow, store token, mark as "coming soon" if complex)
   185|- [ ] Cal.com / Calendly sync stub: when meeting booked → auto-create task in SoloCRM (webhook receiver endpoint)
   186|- [ ] HubSpot CSV import: /dashboard/import — upload HubSpot contacts export CSV → parse with papaparse → map columns → bulk insert
   187|- [ ] Pipedrive CSV import: same page, different column mapping for Pipedrive format
   188|- [ ] Export package: one-click export of ALL data (contacts + deals + tasks + notes) as ZIP of CSVs
   189|
   190|## PHASE 15: ADVANCED PIPELINE FEATURES
   191|- [ ] Multiple pipelines: user can create additional pipelines (e.g. "New Business" + "Renewal" + "Partnerships")
   192|- [ ] Pipeline switch: dropdown in pipeline view to switch between pipelines
   193|- [ ] Pipeline templates: 5 pre-built pipeline templates (SaaS Sales, Agency, Consulting, Ecommerce, Recruiting) — one-click apply
   194|- [ ] Deal scoring: auto-score deals 1-100 based on: days since last activity, probability, value, contact engagement
   195|- [ ] Stale deal detection: deal with no activity in 14+ days → red "stale" badge → daily digest of stale deals
   196|- [ ] Bulk deal operations: select multiple deals → bulk update stage / bulk assign / bulk delete
   197|- [ ] Deal cloning: duplicate a deal with all its tasks and notes (useful for repeat business with same client)
   198|
   199|## PHASE 16: COMMUNICATION CENTER
   200|- [ ] Inbox view: /dashboard/inbox — shows all scheduled emails, tasks due today, follow-ups overdue, deals needing attention — one unified to-do list
   201|- [ ] Email templates library: user saves frequently-used email templates with merge tags — browse and insert in AI email writer
   202|- [ ] Meeting scheduler link: user sets their Calendly/BookFlow link in settings → "Schedule Meeting" button on contact detail inserts link in email
   203|- [ ] Call logger: "Log a call" button on contact → modal with call duration, outcome (interested/not interested/callback), notes → adds to timeline
   204|- [ ] SMS log: "Log SMS" button → records that an SMS was sent (no actual sending — just tracking)
   205|- [ ] WhatsApp quick link: each contact with a phone number → WhatsApp icon → opens wa.me/[phone] in new tab
   206|
   207|## PHASE 17: REVENUE INTELLIGENCE
   208|- [ ] Win probability AI: for each deal, "Predict win probability" button → sends deal info + activity history to OpenAI → returns probability estimate with reasoning
   209|- [ ] Pipeline health score: composite score (0-100) based on: deals moving vs stuck, days to close forecast, conversion rate trend
   210|- [ ] Seasonal analysis: compare Q1 vs Q2 vs Q3 vs Q4 win rates — detect seasonal patterns
   211|- [ ] Deal value tracking: for recurring revenue deals, track MRR impact of each deal won
   212|- [ ] Revenue goal tracker: user sets monthly revenue goal → dashboard shows progress bar (deals won this month vs goal)
   213|- [ ] Lead source ROI: which lead source produces highest LTV? — table showing avg deal size × win rate per source
   214|
   215|## PHASE 18: COLLABORATION (PRO GROWTH FEATURE)
   216|- [ ] Shared pipeline: invite a partner or VA to see the pipeline (read-only or edit access)
   217|- [ ] Activity mentions: when writing a note, @mention a collaborator → they get email notification
   218|- [ ] Deal assignment: assign deal to a team member (profiles table handles this — just add assigned_to field)
   219|- [ ] Team inbox: shared view of all unresponded leads across team members
   220|- [ ] Collision detection: if two team members open the same deal → show "John is also viewing this deal"
   221|
   222|## PHASE 19: LAUNCH & GROWTH
   223|- [ ] Trial: 14-day full Pro trial on signup → onboarding email sequence (day 1, 3, 7, 12, 14)
   224|- [ ] Onboarding checklist: 6 steps (import contacts → create pipeline → add deals → create sequence → connect Zapier → invite team)
   225|- [ ] "HubSpot refugee" landing page section: "Left HubSpot? Import your data in 2 minutes" with CSV import CTA
   226|- [ ] Public roadmap page /roadmap: shows upcoming features — users can upvote (store votes in DB)
   227|- [ ] Changelog page /changelog: shows what was recently shipped — builds trust with users
   228|- [ ] Lighthouse ≥ 85 on all pages
   229|- [ ] Full README.md + DEPLOY.md
   230|- [ ] Product Hunt assets
   231|- [ ] AppSumo listing prep: create APPSUMO_BRIEF.md — lifetime deal framing, feature list, tier breakdown
   232|

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
