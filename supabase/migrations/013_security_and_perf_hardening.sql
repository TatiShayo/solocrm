-- 013 — Security (default-deny RLS) and performance (index) hardening.
--
-- SECURITY: default-deny posture
-- Every application table already has RLS enabled with per-user policies. This
-- migration additionally FORCES row level security so that even the table owner
-- role is subject to the policies (defense against accidental privileged access
-- through a mis-scoped connection). Any table with RLS enabled and no matching
-- policy denies by default; the SELECT/INSERT/UPDATE/DELETE policies defined in
-- earlier migrations are the only allowed paths.

alter table public.contacts             force row level security;
alter table public.deals                force row level security;
alter table public.pipelines            force row level security;
alter table public.stages               force row level security;
alter table public.tasks                force row level security;
alter table public.activity             force row level security;
alter table public.sequences            force row level security;
alter table public.sequence_steps       force row level security;
alter table public.sequence_enrollments force row level security;
alter table public.scheduled_emails     force row level security;
alter table public.user_api_keys        force row level security;
alter table public.email_events         force row level security;
alter table public.webhooks             force row level security;

-- Ensure the anon/public roles cannot bypass RLS via direct table grants.
-- (Access is intended only through authenticated Supabase sessions or the
-- service role used by trusted server-side cron/webhook handlers.)
revoke all on public.user_api_keys from anon;
revoke all on public.email_events   from anon;
revoke all on public.scheduled_emails from anon;

-- PERFORMANCE: indexes for hot query paths that were previously unindexed.

-- Webhook handler looks up a scheduled email by its Resend message id.
create index if not exists scheduled_emails_resend_message_id_idx
  on public.scheduled_emails(resend_message_id);

-- Sequence engine fetches due, unsent emails and joins by contact/enrollment.
create index if not exists scheduled_emails_contact_id_idx
  on public.scheduled_emails(contact_id);
create index if not exists scheduled_emails_enrollment_id_idx
  on public.scheduled_emails(enrollment_id);
-- Partial index over the exact cron predicate (unsent, ordered by schedule).
create index if not exists scheduled_emails_due_idx
  on public.scheduled_emails(scheduled_at)
  where sent_at is null;

-- Deal list / analytics: filter by owner, often by status, sort by recency.
create index if not exists deals_user_status_idx
  on public.deals(user_id, status);
create index if not exists deals_user_created_idx
  on public.deals(user_id, created_at desc);

-- Contact list pagination: owner + name ordering.
create index if not exists contacts_user_name_idx
  on public.contacts(user_id, name);

-- Overdue/reminder cron scans incomplete tasks by due date.
create index if not exists tasks_incomplete_due_idx
  on public.tasks(due_date)
  where completed = false;
