You are continuing SoloCRM. 22 of 35 tasks done. 13 remaining.

═══ CURRENT STATE ═══
PHASE 4: TASKS & FOLLOW-UPS — complete
PHASE 5: EMAIL SEQUENCES — 2 left (email sending engine, unsubscribe)
PHASE 6: AI ASSISTANT — 3 left (AI email writer, AI deal summary, AI next step)
PHASE 7: TESTING & POLISH — 2 left (unit tests, mobile responsive)
PHASE 8: ADVANCED — 4 left (chrome ext stub, email tracking, meeting notes, Zapier webhook)

═══ REMAINING TASKS (build in order) ═══

Task 1: Email sending engine
- Create src/lib/sequence-engine.ts: processScheduledEmails()
  - Query scheduled_emails WHERE scheduled_at <= now() AND sent_at IS NULL LIMIT 50
  - For each: replace merge tags ({{firstName}} → contact.first_name, {{company}}, {{dealTitle}})
  - Send via Resend, set sent_at = now()
  - Find next sequence step, schedule next email with correct delay (current_step++)
  - Log to deal_activities: event_type='email_sent', description='Sent [subject] to [contact]'
- Create /api/cron/send-emails endpoint to trigger this
- If RESEND_API_KEY not set in .env, guard: process.env.RESEND_API_KEY ? actually send : console.warn('Resend not configured')

Task 2: Unsubscribe system
- Every sent email HTML footer: "Unsubscribe" link → /unsubscribe?token=[hashed contact id + salt]
- Unsubscribe page: "You've been unsubscribed" confirmation, updates contacts.is_opted_out = true
- Sequence engine skips opted-out contacts

Task 3: AI email writer at /api/ai/email
- Input: {contactName, contactCompany, context, goalOfEmail}
- Prompt: "Write a short personalized sales email to {contactName} at {contactCompany}. Context: {context}. Goal: {goalOfEmail}. Conversational, under 150 words. Return JSON: {subject, body}"
- Button on sequence step editor: "Write with AI" → fills in subject + body

Task 4: AI deal summary at /api/ai/deal-summary
- Input: deal info (title, stage, value, days, last activity, probability)
- Returns 2-3 sentence summary with suggested next action
- Button on deal detail modal

Task 5: AI next step suggester
- Given deal stage + days in stage + recent activity → suggests best next action
- Small card in deal detail: "Suggested: [action]"

Task 6: Testing & polish
- E2E test: add contact → create deal → move through pipeline → mark won
- Mobile: contacts table + kanban work at 375px with horizontal scroll
- Lighthouse ≥85

═══ RULES ═══
npm run build after every task. Must pass.
git add -A && git commit -m "done: [task]" per task.
Mark [x] in PLAN.md + PROGRESS.md. Skip after 2 failures.

Start with Task 1: Email sending engine (sequence-engine.ts + /api/cron/send-emails).
