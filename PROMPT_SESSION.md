You are continuing SoloCRM. Tasks page was rebuilt with tabs and quick-add.

═══ CURRENT STATE ═══
14 of 35 tasks done. 21 remaining.
Currently in PHASE 4: TASKS & FOLLOW-UPS.

═══ FIRST: COMMIT EXISTING WORK ═══
Run: git status --short
If there are uncommitted files: git add -A && git commit -m "done: Task list with tabs, modals, quick-add"

Then read PLAN.md and mark as done any tasks that are actually built:
- [ ] Task list: all tasks across all contacts, sorted by due date
- [ ] Add task: title, contact, due date, type (call/email/meeting/follow-up)
Check if these were built. If so, mark [x] in PLAN.md.

═══ REMAINING TASKS (build in order) ═══

Task 1: Task completion & logging
- Completing task: update tasks.is_complete = true, set completed_at
- Log to deal_activities: {deal_id, event_type: 'task_completed', description}
- Overdue badge count in sidebar
- Overdue email digest endpoint: /api/cron/overdue-digest

Task 2: Reminder system
- When task created with due_date, schedule Resend email 1 day before
- /api/reminders/send-reminders: query tasks due tomorrow, send emails
- Template: "Reminder: [task title] for [contact] is due tomorrow"

Task 3: Email sequence builder at /dashboard/sequences
- List: name, steps count, enrolled count, active toggle
- Create/edit: name + step builder (delay_days, subject, body, merge tag buttons)
- Reorder/remove steps

Task 4: Enroll contacts in sequences
- Multi-select modal, enrollment table, unenroll
- schedule_emails auto-populated on enrollment

Task 5: Email sending engine
- src/lib/sequence-engine.ts: processScheduledEmails()
- Find scheduled_emails where scheduled_at ≤ now() and sent IS NULL
- Replace merge tags ({{firstName}}, {{company}}, etc.)
- Send via Resend
- Schedule next step

Task 6: Unsubscribe system
- /unsubscribe/[token] page, update contacts.is_opted_out
- Footer in all sent emails with unsubscribe link

═══ RULES ═══
npm run build after every task. Must pass.
git add -A && git commit -m "done: [task]" per task.
Mark [x] in PLAN.md + append to PROGRESS.md
After 2 failures: write BLOCKED to LEARNINGS.md, skip task.

Start: git status → commit any uncommitted work → mark built tasks done → start Task 1.
