-- Tasks and follow-ups
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  title text not null,
  type text default 'follow-up' check (type in ('call', 'email', 'meeting', 'follow-up')),
  due_date date not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_contact_id_idx on public.tasks(contact_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
