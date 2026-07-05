-- Deals (pipeline stages managed via user-defined pipelines)
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null,
  value numeric(12,2) default 0,
  probability integer default 20 check (probability between 0 and 100),
  stage_id uuid not null,
  close_date date,
  notes text,
  status text default 'open' check (status in ('open', 'won', 'lost')),
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_user_id_idx on public.deals(user_id);
create index if not exists deals_contact_id_idx on public.deals(contact_id);
create index if not exists deals_stage_id_idx on public.deals(stage_id);

alter table public.deals enable row level security;

create policy "Users can view own deals"
  on public.deals for select
  using (auth.uid() = user_id);

create policy "Users can insert own deals"
  on public.deals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own deals"
  on public.deals for update
  using (auth.uid() = user_id);

create policy "Users can delete own deals"
  on public.deals for delete
  using (auth.uid() = user_id);

create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();
