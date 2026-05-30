## SoloCRM Build Plan

## PHASE 1: STABILIZE
- [x] Build passes, auth works, protected routes

## PHASE 2: CONTACTS
- [x] Landing page: "Every lead. Every deal. No BS pricing." hero, vs HubSpot comparison table, $10/mo CTA
- [x] Contact list: searchable, filterable by source, sortable by name/date/company
- [x] Add/edit contact: name, email, phone, company, title, source (cold/referral/inbound), tags, notes
- [x] Contact detail: all info, activity timeline, linked deals, tasks, email history
- [x] Bulk import: CSV upload with column mapping → parse with papaparse → bulk insert
- [x] Duplicate detection: warn if email already exists before adding

## PHASE 3: PIPELINE
- [x] Create pipeline: user names stages (e.g. Lead → Qualified → Proposal → Won/Lost)
- [x] Kanban board: drag-and-drop deals between stages (use dnd-kit)
- [x] Deal card: contact name, value, probability, days in stage
- [x] Add/edit deal: title, contact, value, close date, probability, stage, notes
- [x] Deal detail: full info, activity timeline, notes
- [x] Won/Lost: mark deal outcome, reason for loss
- [x] Revenue forecast: sum of (deal value × probability) for all open deals

## PHASE 4: TASKS & FOLLOW-UPS
- [x] Task list: all tasks across all contacts, sorted by due date
- [x] Add task: title, contact, due date, type (call/email/meeting/follow-up)
- [x] Task completion: check off, logs to contact timeline
- [x] Overdue tasks: red badge on overdue, daily digest email
- [x] Reminders: email reminder 1 day before task due date via Resend

## PHASE 5: EMAIL SEQUENCES
- [x] Sequence builder: create multi-step email sequence (Step 1: Day 0, Step 2: Day 3, Step 3: Day 7)
- [x] Each step: subject, body (with {{firstName}}, {{company}} merge tags), delay days
- [x] Enroll contact: assign contact to sequence, system schedules emails automatically
- [x] Email sending: Resend sends scheduled emails, logs to contact timeline
- [ ] Unsubscribe: every email has unsubscribe link, marks contact as opted-out

## PHASE 6: AI ASSISTANT
- [ ] AI email writer: "Write a follow-up email for {{contactName}} who showed interest in {{product}}" → generates draft
- [ ] AI deal summary: "Summarize the status of my {{dealTitle}} deal" → reads timeline, writes summary
- [ ] AI next step suggester: given deal stage + days stuck → suggests best next action

## PHASE 7: TESTING & POLISH
- [ ] Unit tests: pipeline calculations, sequence scheduling logic, merge tag replacement
- [ ] E2e: add contact → create deal → move through pipeline → mark won
- [ ] Mobile: contact list and pipeline kanban must work at 375px
- [ ] Lighthouse ≥85

## PHASE 8: ADVANCED
- [ ] Chrome extension: capture LinkedIn profile → auto-add as contact in SoloCRM
- [ ] Email tracking: track opens and clicks on sent emails (pixel tracking via Resend webhooks)
- [ ] Meeting notes: text field per contact, AI generates action items from notes
- [ ] Zapier webhook: trigger automations when deal stage changes or contact added
