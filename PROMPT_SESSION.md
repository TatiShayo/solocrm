You are continuing SoloCRM. Email sending engine is built and committed. Unsubscribe migration exists but uncommitted.

═══ FIRST: COMMIT ═══
Run: git status --short
If there are uncommitted files: git add -A && git commit -m "done: unsubscribe migration and remaining tweaks"
Then recount: grep -c '\[x\]' PLAN.md — should be 24.

═══ CURRENT STATE ═══
23 of 35 done. 12 remaining.
PHASE 5: EMAIL SEQUENCES — 1 left (unsubscribe)
PHASE 6: AI ASSISTANT — 3 left
PHASE 7: TESTING & POLISH — 2 left
PHASE 8: ADVANCED — 4 left

═══ REMAINING TASKS (build in order) ═══

Task 1: Unsubscribe system
- If migration exists but uncommitted: commit it, build the page
- /unsubscribe?token=[hash]: marks contacts.is_opted_out = true
- Email footer in sequence-engine.ts: unsubscribe link in every sent email
- Sequence engine skips opted-out contacts

Task 2: AI email writer at /api/ai/email
- Input: {contactName, contactCompany, context, goalOfEmail}
- Prompt: write short personalized sales email, return JSON {subject, body}
- Button on sequence step editor: "Write with AI" fills in subject + body
- Guard: if !process.env.OPENAI_API_KEY, return error message

Task 3: AI deal summary at /api/ai/deal-summary
- Input: deal info (title, stage, value, days, activity, probability)
- Returns 2-3 sentence summary with suggested next action
- Button on deal detail modal

Task 4: AI next step suggester
- Given deal stage + days in stage → suggests best next action
- Card in deal detail: "Suggested: [action]"

Task 5: E2E test — add contact → create deal → pipeline → mark won
Task 6: Mobile responsive — contacts table + kanban at 375px
Task 7: Chrome extension stub on landing page
Task 8: Email tracking — pixel tracking via Resend webhooks
Task 9: Meeting notes — text field per contact, AI action items
Task 10: Zapier webhook — POST when deal stage changes or contact added

═══ RULES ═══
npm run build after every task. git add -A && git commit -m "done: [task]".
Mark [x] in PLAN.md + PROGRESS.md. Skip after 2 failures.

Start: git status → commit → Task 1: unsubscribe system.
