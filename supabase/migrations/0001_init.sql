-- Diet With Noor Client Portal — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.

-- ========== Extensions ==========
create extension if not exists "pgcrypto";

-- ========== users (extends auth.users) ==========
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  user_number bigint not null unique,
  full_name text not null,
  phone_number text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.user_number_seq start with 77001 increment by 1;

alter table public.users
  alter column user_number set default nextval('public.user_number_seq');

-- Auto-create a `users` row (and profile) whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, phone_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'phone_number'
  );

  insert into public.profiles (user_id, weight_unit)
  values (new.id, 'kg');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== profiles ==========
create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_weight numeric,
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lbs')),
  first_weight_entry_date date,
  tracking_streak int not null default 0,
  last_tracked_date date
);

-- ========== weight_logs ==========
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  weight numeric not null,
  unit text not null default 'kg' check (unit in ('kg', 'lbs')),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_id_idx on public.weight_logs(user_id, logged_at desc);

-- Set first_weight_entry_date on a user's very first entry
create or replace function public.handle_first_weight_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set first_weight_entry_date = coalesce(first_weight_entry_date, new.logged_at::date)
  where user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_weight_log_insert on public.weight_logs;
create trigger on_weight_log_insert
  after insert on public.weight_logs
  for each row execute function public.handle_first_weight_entry();

-- ========== water_logs ==========
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  glasses int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ========== sleep_logs ==========
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  hours numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ========== mood_logs ==========
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  mood varchar(8) not null,
  energy_level int not null check (energy_level between 1 and 10),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ========== activity_logs ==========
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  activity_level text not null check (activity_level in ('low', 'moderate', 'high')),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ========== achievements ==========
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_type text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_type)
);

-- ========== streaks ==========
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  streak_type text not null,
  current_count int not null default 0,
  best_count int not null default 0,
  last_completed_date date,
  unique (user_id, streak_type)
);

-- ========== admin_activity ==========
create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  target_user_id uuid references public.users(id) on delete set null,
  metadata jsonb,
  timestamp timestamptz not null default now()
);

-- ========== announcements ==========
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);
