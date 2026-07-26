-- Diet With Noor — onboarding fields, meal logging, and missing table grants
-- Run this in the Supabase SQL editor after 0001_init.sql and 0002_rls.sql.

-- ========== Onboarding fields on profiles ==========
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists height_cm numeric,
  add column if not exists starting_weight numeric,
  add column if not exists goal_weight numeric,
  add column if not exists goal_target_date date,
  add column if not exists onboarding_completed boolean not null default false;

-- ========== meal_logs ==========
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists meal_logs_user_idx on public.meal_logs(user_id, logged_at desc);

-- ========== meal_items ==========
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  food_name text not null,
  quantity numeric not null default 1,
  unit text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  created_at timestamptz not null default now()
);

create index if not exists meal_items_meal_idx on public.meal_items(meal_log_id);

-- ========== foods (shared reference table for quick-add) ==========
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  serving_desc text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric
);

create index if not exists foods_name_idx on public.foods (lower(name));

-- ========== RLS ==========
alter table public.meal_logs enable row level security;
alter table public.meal_items enable row level security;
alter table public.foods enable row level security;

drop policy if exists "meal_logs_select_own_or_admin" on public.meal_logs;
create policy "meal_logs_select_own_or_admin" on public.meal_logs
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "meal_logs_modify_own_or_admin" on public.meal_logs;
create policy "meal_logs_modify_own_or_admin" on public.meal_logs
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- meal_items inherit access from their parent meal_log
drop policy if exists "meal_items_select_own_or_admin" on public.meal_items;
create policy "meal_items_select_own_or_admin" on public.meal_items
  for select using (
    exists (
      select 1 from public.meal_logs m
      where m.id = meal_items.meal_log_id
        and (m.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "meal_items_modify_own_or_admin" on public.meal_items;
create policy "meal_items_modify_own_or_admin" on public.meal_items
  for all using (
    exists (
      select 1 from public.meal_logs m
      where m.id = meal_items.meal_log_id
        and (m.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.meal_logs m
      where m.id = meal_items.meal_log_id
        and (m.user_id = auth.uid() or public.is_admin())
    )
  );

-- foods is a shared read-only lookup for all signed-in users; admins can edit
drop policy if exists "foods_select_all_authenticated" on public.foods;
create policy "foods_select_all_authenticated" on public.foods
  for select using (auth.uid() is not null);

drop policy if exists "foods_modify_admin_only" on public.foods;
create policy "foods_modify_admin_only" on public.foods
  for all using (public.is_admin())
  with check (public.is_admin());

-- ========== Grants ==========
-- RLS policies alone are not enough: Postgres also requires table-level privileges.
grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on
  public.users,
  public.profiles,
  public.weight_logs,
  public.water_logs,
  public.sleep_logs,
  public.mood_logs,
  public.activity_logs,
  public.achievements,
  public.streaks,
  public.admin_activity,
  public.announcements,
  public.meal_logs,
  public.meal_items
to authenticated;

grant select on public.foods to authenticated;
grant all on public.foods to service_role;
grant select on public.users to anon;

-- Future tables in public get the same treatment automatically
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ========== Seed common foods (per-serving values) ==========
insert into public.foods (name, serving_desc, calories, protein_g, carbs_g, fat_g) values
  ('Roti (whole wheat)', '1 medium (40g)', 120, 3.5, 25, 0.7),
  ('Naan', '1 piece (90g)', 260, 8, 48, 3.5),
  ('Paratha', '1 piece (60g)', 260, 5, 30, 13),
  ('Boiled Rice (white)', '1 cup cooked (150g)', 200, 4, 45, 0.4),
  ('Biryani (chicken)', '1 cup (200g)', 350, 18, 45, 12),
  ('Pulao', '1 cup (180g)', 280, 6, 45, 8),
  ('Chicken Karahi', '1 cup (200g)', 320, 28, 8, 20),
  ('Chicken Curry', '1 cup (200g)', 290, 26, 9, 17),
  ('Daal (lentils)', '1 cup (200g)', 180, 12, 28, 2),
  ('Chana Chaat', '1 cup (180g)', 210, 10, 32, 5),
  ('Haleem', '1 cup (220g)', 320, 18, 35, 12),
  ('Nihari', '1 cup (200g)', 400, 30, 10, 27),
  ('Seekh Kebab', '1 skewer (70g)', 180, 15, 2, 12),
  ('Chicken Tikka', '1 piece (100g)', 200, 26, 2, 10),
  ('Fish (grilled)', '1 fillet (120g)', 180, 30, 0, 6),
  ('Egg (boiled)', '1 large', 78, 6, 0.6, 5),
  ('Omelette (2 eggs)', '1 serving', 220, 13, 2, 17),
  ('Yogurt (plain)', '1 cup (245g)', 150, 8, 11, 8),
  ('Raita', '1 cup (240g)', 110, 6, 10, 5),
  ('Milk (full fat)', '1 cup (240ml)', 150, 8, 12, 8),
  ('Milk (skim)', '1 cup (240ml)', 85, 8, 12, 0.2),
  ('Tea with milk & sugar', '1 cup (200ml)', 90, 2, 13, 3),
  ('Green Tea', '1 cup', 2, 0, 0, 0),
  ('Black Coffee', '1 cup', 5, 0.3, 0, 0),
  ('Banana', '1 medium (118g)', 105, 1.3, 27, 0.4),
  ('Apple', '1 medium (182g)', 95, 0.5, 25, 0.3),
  ('Orange', '1 medium (131g)', 62, 1.2, 15, 0.2),
  ('Mango', '1 cup sliced (165g)', 99, 1.4, 25, 0.6),
  ('Grapes', '1 cup (92g)', 62, 0.6, 16, 0.3),
  ('Watermelon', '1 cup (152g)', 46, 0.9, 12, 0.2),
  ('Dates', '3 pieces (24g)', 66, 0.4, 18, 0.1),
  ('Almonds', '10 pieces (12g)', 70, 2.6, 2.4, 6),
  ('Walnuts', '5 halves (10g)', 65, 1.5, 1.4, 6.5),
  ('Peanuts', '1 handful (28g)', 160, 7, 5, 14),
  ('Salad (mixed veg)', '1 bowl (150g)', 45, 2, 9, 0.3),
  ('Cucumber', '1 medium (200g)', 30, 1.3, 7, 0.2),
  ('Tomato', '1 medium (123g)', 22, 1.1, 5, 0.2),
  ('Spinach (cooked)', '1 cup (180g)', 41, 5, 7, 0.5),
  ('Mixed Vegetables (cooked)', '1 cup (180g)', 120, 4, 18, 4),
  ('Aloo Gosht', '1 cup (220g)', 340, 22, 18, 20),
  ('Palak Paneer', '1 cup (200g)', 280, 14, 12, 20),
  ('Chicken Breast (grilled)', '1 piece (120g)', 195, 36, 0, 4),
  ('Beef (lean, cooked)', '100g', 250, 26, 0, 15),
  ('Mutton (cooked)', '100g', 290, 25, 0, 21),
  ('Bread (white)', '1 slice (28g)', 75, 2.5, 14, 1),
  ('Bread (brown)', '1 slice (28g)', 70, 3.5, 12, 1),
  ('Oats (cooked)', '1 cup (234g)', 165, 6, 28, 3.5),
  ('Cornflakes with milk', '1 bowl', 200, 7, 38, 3),
  ('Samosa', '1 piece (60g)', 260, 4, 24, 17),
  ('Pakora', '4 pieces (60g)', 220, 5, 20, 14),
  ('French Fries', '1 medium serving (117g)', 365, 4, 48, 17),
  ('Pizza Slice', '1 slice (107g)', 285, 12, 36, 10),
  ('Burger (beef)', '1 regular', 350, 17, 33, 17),
  ('Shawarma', '1 roll (250g)', 480, 28, 45, 21),
  ('Soft Drink (cola)', '1 can (330ml)', 139, 0, 35, 0),
  ('Fresh Juice (orange)', '1 glass (250ml)', 112, 1.7, 26, 0.5),
  ('Lassi (sweet)', '1 glass (250ml)', 210, 7, 30, 6),
  ('Gulab Jamun', '1 piece (40g)', 150, 2, 21, 7),
  ('Kheer', '1 cup (200g)', 250, 6, 40, 8),
  ('Ice Cream', '1 scoop (66g)', 137, 2.3, 16, 7),
  ('Chocolate Bar', '1 bar (45g)', 235, 3, 26, 13),
  ('Biscuits (tea)', '3 pieces (24g)', 110, 1.5, 17, 4),
  ('Honey', '1 tbsp (21g)', 64, 0.1, 17, 0),
  ('Olive Oil', '1 tbsp (14g)', 119, 0, 0, 14),
  ('Ghee', '1 tbsp (14g)', 123, 0, 0, 14),
  ('Butter', '1 tbsp (14g)', 102, 0.1, 0, 12)
on conflict (name) do nothing;
