-- Schema for SoloCRM database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan text check (plan in ('free', 'pro')) not null default 'free',
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contacts table
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  title text,
  source text,
  tags text[] default '{}'::text[] not null,
  notes text,
  is_opted_out boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pipelines table
create table if not exists public.pipelines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  is_default boolean default false not null
);

-- Pipeline Stages table
create table if not exists public.pipeline_stages (
  id uuid default gen_random_uuid() primary key,
  pipeline_id uuid references public.pipelines(id) on delete cascade not null,
  name text not null,
  order_index integer not null,
  probability integer check (probability >= 0 and probability <= 100) not null,
  color text
);

-- Deals table
create table if not exists public.deals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete set null,
  pipeline_id uuid references public.pipelines(id) on delete cascade not null,
  stage_id uuid references public.pipeline_stages(id) on delete cascade not null,
  title text not null,
  value numeric(12, 2) default 0.00 not null,
  close_date date,
  probability integer check (probability >= 0 and probability <= 100),
  notes text,
  won_at timestamp with time zone,
  lost_at timestamp with time zone,
  lost_reason text
);

-- Deal Timeline table
create table if not exists public.deal_timeline (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  event_type text not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  title text not null,
  due_date timestamp with time zone,
  type text not null, -- e.g., 'call', 'email', 'meeting', 'todo'
  is_complete boolean default false not null,
  completed_at timestamp with time zone
);

-- Email Sequences table
create table if not exists public.email_sequences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  is_active boolean default true not null
);

-- Sequence Steps table
create table if not exists public.sequence_steps (
  id uuid default gen_random_uuid() primary key,
  sequence_id uuid references public.email_sequences(id) on delete cascade not null,
  step_number integer not null,
  delay_days integer not null,
  subject text not null,
  body text not null
);

-- Sequence Enrollments table
create table if not exists public.sequence_enrollments (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  sequence_id uuid references public.email_sequences(id) on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  current_step integer default 1 not null,
  is_active boolean default true not null
);

-- Scheduled Emails table
create table if not exists public.scheduled_emails (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  sequence_id uuid references public.email_sequences(id) on delete cascade,
  step_id uuid references public.sequence_steps(id) on delete cascade,
  scheduled_at timestamp with time zone not null,
  sent_at timestamp with time zone,
  subject text not null,
  body text not null
);
