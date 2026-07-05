create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  events text[] not null,
  created_at timestamptz not null default now()
);

create index webhooks_user_id_idx on public.webhooks(user_id);

alter table public.webhooks enable row level security;

create policy "Users can view their own webhooks"
  on public.webhooks
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own webhooks"
  on public.webhooks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own webhooks"
  on public.webhooks
  for delete
  using (auth.uid() = user_id);
