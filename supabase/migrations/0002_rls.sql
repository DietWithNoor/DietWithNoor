-- Row Level Security policies for Diet With Noor Client Portal

-- Helper: is the current auth user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.weight_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.mood_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.achievements enable row level security;
alter table public.streaks enable row level security;
alter table public.admin_activity enable row level security;
alter table public.announcements enable row level security;

-- ===== users =====
create policy "users_select_own_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy "users_update_own_or_admin" on public.users
  for update using (id = auth.uid() or public.is_admin());

create policy "users_insert_self" on public.users
  for insert with check (id = auth.uid());

-- ===== profiles =====
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy "profiles_modify_own_or_admin" on public.profiles
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== weight_logs =====
create policy "weight_logs_select_own_or_admin" on public.weight_logs
  for select using (user_id = auth.uid() or public.is_admin());

create policy "weight_logs_modify_own_or_admin" on public.weight_logs
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== water_logs =====
create policy "water_logs_select_own_or_admin" on public.water_logs
  for select using (user_id = auth.uid() or public.is_admin());

create policy "water_logs_modify_own_or_admin" on public.water_logs
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== sleep_logs =====
create policy "sleep_logs_select_own_or_admin" on public.sleep_logs
  for select using (user_id = auth.uid() or public.is_admin());

create policy "sleep_logs_modify_own_or_admin" on public.sleep_logs
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== mood_logs =====
create policy "mood_logs_select_own_or_admin" on public.mood_logs
  for select using (user_id = auth.uid() or public.is_admin());

create policy "mood_logs_modify_own_or_admin" on public.mood_logs
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== activity_logs =====
create policy "activity_logs_select_own_or_admin" on public.activity_logs
  for select using (user_id = auth.uid() or public.is_admin());

create policy "activity_logs_modify_own_or_admin" on public.activity_logs
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== achievements =====
create policy "achievements_select_own_or_admin" on public.achievements
  for select using (user_id = auth.uid() or public.is_admin());

create policy "achievements_modify_own_or_admin" on public.achievements
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== streaks =====
create policy "streaks_select_own_or_admin" on public.streaks
  for select using (user_id = auth.uid() or public.is_admin());

create policy "streaks_modify_own_or_admin" on public.streaks
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===== admin_activity (admin-only) =====
create policy "admin_activity_admin_only_select" on public.admin_activity
  for select using (public.is_admin());

create policy "admin_activity_admin_only_modify" on public.admin_activity
  for all using (public.is_admin())
  with check (public.is_admin());

-- ===== announcements (admin-only write, admin-only read for now) =====
create policy "announcements_admin_only_select" on public.announcements
  for select using (public.is_admin());

create policy "announcements_admin_only_modify" on public.announcements
  for all using (public.is_admin())
  with check (public.is_admin());
