-- Pipelines and stages
create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pipelines_user_id_idx on public.pipelines(user_id);
create index if not exists stages_pipeline_id_idx on public.stages(pipeline_id);

alter table public.pipelines enable row level security;
alter table public.stages enable row level security;

create policy "Users can view own pipelines"
  on public.pipelines for select
  using (auth.uid() = user_id);

create policy "Users can insert own pipelines"
  on public.pipelines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pipelines"
  on public.pipelines for update
  using (auth.uid() = user_id);

create policy "Users can delete own pipelines"
  on public.pipelines for delete
  using (auth.uid() = user_id);

create policy "Users can view own stages"
  on public.stages for select
  using (exists (select 1 from public.pipelines where id = stages.pipeline_id and user_id = auth.uid()));

create policy "Users can insert own stages"
  on public.stages for insert
  with check (exists (select 1 from public.pipelines where id = stages.pipeline_id and user_id = auth.uid()));

create policy "Users can update own stages"
  on public.stages for update
  using (exists (select 1 from public.pipelines where id = stages.pipeline_id and user_id = auth.uid()));

create policy "Users can delete own stages"
  on public.stages for delete
  using (exists (select 1 from public.pipelines where id = stages.pipeline_id and user_id = auth.uid()));
