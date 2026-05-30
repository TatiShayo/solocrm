create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Chrome Extension',
  key text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists user_api_keys_user_id_idx on public.user_api_keys(user_id);
create unique index if not exists user_api_keys_key_idx on public.user_api_keys(key);

alter table public.user_api_keys enable row level security;

create policy "Users can view own api keys"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert own api keys"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own api keys"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);
