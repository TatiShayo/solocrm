-- Contacts table
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  title text,
  source text check (source in ('cold', 'referral', 'inbound')),
  tags text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_email_idx on public.contacts(email);
create index if not exists contacts_name_idx on public.contacts(name);
create unique index if not exists contacts_user_email_idx on public.contacts(user_id, lower(email));

-- RLS
alter table public.contacts enable row level security;

create policy "Users can view own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();
