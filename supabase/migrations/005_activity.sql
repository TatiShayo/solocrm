-- Activity timeline for contacts, deals, and tasks
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  type text not null default 'note' check (type in ('note', 'email', 'call', 'task_completed', 'deal_change', 'contact_created', 'contact_updated')),
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_contact_id_idx on public.activity(contact_id);
create index if not exists activity_deal_id_idx on public.activity(deal_id);
create index if not exists activity_user_id_idx on public.activity(user_id);

alter table public.activity enable row level security;

create policy "Users can view own activity"
  on public.activity for select
  using (auth.uid() = user_id);

create policy "Users can insert own activity"
  on public.activity for insert
  with check (auth.uid() = user_id);
