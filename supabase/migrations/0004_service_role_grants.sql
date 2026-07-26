-- Diet With Noor — service_role grants + nullable mood
--
-- Two fixes:
--  1. service_role had NO table privileges, so anything using the service key
--     (the admin export API route) failed with "permission denied for table".
--  2. mood_logs.mood was NOT NULL, but the wellness page stores mood and energy
--     in the same row. Logging energy alone had to write a placeholder mood,
--     which then showed up as a real mood the user never picked.

-- ========== 1. service_role grants ==========
grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Cover tables added later too.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;

-- authenticated needs the user_number sequence to insert its own users row.
grant usage, select on all sequences in schema public to authenticated;

-- ========== 2. mood nullable ==========
alter table public.mood_logs alter column mood drop not null;
