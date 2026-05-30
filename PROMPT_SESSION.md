You are continuing SoloCRM. Great progress — task system and email sequence builder are built.

═══ CURRENT STATE ═══
21 of 35 tasks done. 14 remaining.
PHASE 4: TASKS & FOLLOW-UPS — 2 left
PHASE 5: EMAIL SEQUENCES — 3 left
PHASE 6: AI ASSISTANT — 3 left
PHASE 7: TESTING & POLISH — 2 left
PHASE 8: ADVANCED — 4 left

═══ REMAINING TASKS (build in order) ═══

Task 1: Overdue tasks — red badge, daily digest email
Check if already built: look for overdue badge in sidebar nav or digest endpoint
If already exists: mark [x] in PLAN.md, move to next task
If not: build red badge count on sidebar, /api/cron/overdue-digest sends email

Task 2: Enroll contacts in email sequences
- "Enroll" button on sequence detail page → contact multi-select modal
- Enrollments table: contact name, current step, last email, next email
- Unenroll button per contact
- On enrollment: populate scheduled_emails with correct dates

Task 3: Email sending engine
- src/lib/sequence-engine.ts: processScheduledEmails()
- Query scheduled_emails where scheduled_at ≤ now() AND sent_at IS NULL LIMIT 50
- Replace merge tags ({{firstName}} → contact.first_name, etc.)
- Send via Resend, set sent_at = now()
- Find next sequence step, schedule next email with correct delay
- Log to deal_activities

Task 4: Unsubscribe system
- Every sent email footer: "Unsubscribe" link → /unsubscribe?token=[hash]
- Unsubscribe page: marks contacts.is_opted_out = true
- Sequence engine skips opted-out contacts

Task 5: AI email writer at /api/ai/email
- Input: {contactName, contactCompany, context, goalOfEmail}
- Returns JSON: {subject, body}
- Button on sequence step editor: "Write with AI" fills in subject + body

Task 6: AI deal summary at /api/ai/deal-summary
- Input: deal info (title, stage, value, days, activity, probability)
- Returns 2-3 sentence summary with suggested next action
- Button on deal detail modal

Task 7: AI next step suggester
- Given deal stage + days stuck → suggests best next action
- Display as small card in deal detail

Task 8: Testing & polish
- Unit tests: pipeline calc, sequence scheduling, merge tags
- E2E: add contact → create deal → pipeline → mark won
- Mobile: contacts + kanban work at 375px
- Lighthouse ≥85

Task 9: Chrome extension stub — landing page section "Coming Soon"
Task 10: Email tracking — open/click tracking via pixel
Task 11: Meeting notes — text field per contact, AI action items
Task 12: Zapier webhook — POST when deal stage changes or contact added

═══ RULES ═══
npm run build after every task. Must pass.
git add -A && git commit -m "done: [task]" per task.
Mark [x] in PLAN.md + PROGRESS.md. Skip after 2 failures.

Start: check if Task 1 (overdue tasks) is already built. If so, mark done and move to Task 2.
