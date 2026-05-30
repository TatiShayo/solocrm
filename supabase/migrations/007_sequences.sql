create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  sort_order int not null default 0,
  delay_days int not null default 0,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_step int not null default 0,
  active boolean default true,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(sequence_id, contact_id)
);

create table if not exists public.scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  enrollment_id uuid not null references public.sequence_enrollments(id) on delete cascade,
  step_id uuid not null references public.sequence_steps(id) on delete cascade,
  subject text not null,
  body text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sequences_user_id_idx on public.sequences(user_id);
create index if not exists sequence_steps_sequence_id_idx on public.sequence_steps(sequence_id);
create index if not exists sequence_enrollments_sequence_id_idx on public.sequence_enrollments(sequence_id);
create index if not exists sequence_enrollments_contact_id_idx on public.sequence_enrollments(contact_id);
create index if not exists scheduled_emails_scheduled_at_idx on public.scheduled_emails(scheduled_at);

alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_enrollments enable row level security;
alter table public.scheduled_emails enable row level security;

create policy "Users can manage own sequences" on public.sequences for all using (auth.uid() = user_id);
create policy "Users can manage own sequence steps" on public.sequence_steps for all using (
  exists (select 1 from public.sequences where id = sequence_steps.sequence_id and user_id = auth.uid())
);
create policy "Users can manage own enrollments" on public.sequence_enrollments for all using (auth.uid() = user_id);
create policy "Users can manage own scheduled emails" on public.scheduled_emails for all using (auth.uid() = user_id);

create trigger sequences_updated_at before update on public.sequences for each row execute function public.set_updated_at();
