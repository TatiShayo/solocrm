alter table public.scheduled_emails add column if not exists resend_message_id text;

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  scheduled_email_id uuid references public.scheduled_emails(id) on delete set null,
  resend_message_id text,
  contact_id uuid references public.contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, -- opened, clicked, delivered, bounced, complained
  payload jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists email_events_resend_message_id_idx on public.email_events(resend_message_id);
create index if not exists email_events_contact_id_idx on public.email_events(contact_id);
create index if not exists email_events_user_id_idx on public.email_events(user_id);

alter table public.email_events enable row level security;

create policy "Users can view own email events" on public.email_events
  for select using (auth.uid() = user_id);
