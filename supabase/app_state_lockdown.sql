-- Lock the app_state table so only signed-in users can read or write it.
--
-- Why: the anon key is public (it ships in the browser bundle as
-- NEXT_PUBLIC_SUPABASE_ANON_KEY). Without this, anyone with that key can read and
-- overwrite the whole portal state straight from Supabase, bypassing /api/state.
--
-- ORDER MATTERS: run this only AFTER the version of the portal that sends the
-- login token (src/lib/serverAuth.ts) is running everywhere you use it
-- (localhost and any Vercel deployment). Older versions talk to the database as
-- anon and will stop loading once this runs.
--
-- Run in Supabase Dashboard → SQL Editor.

-- 0. (Optional) See what is there now.
-- select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'app_state';

-- 1. Turn on Row Level Security.
alter table public.app_state enable row level security;

-- 2. Take all table access away from the public anon role.
revoke all on table public.app_state from anon;

-- 3. Allow signed-in users only.
drop policy if exists "app_state signed-in read" on public.app_state;
drop policy if exists "app_state signed-in insert" on public.app_state;
drop policy if exists "app_state signed-in update" on public.app_state;

create policy "app_state signed-in read"   on public.app_state for select to authenticated using (true);
create policy "app_state signed-in insert" on public.app_state for insert to authenticated with check (true);
create policy "app_state signed-in update" on public.app_state for update to authenticated using (true) with check (true);

-- 4. Any other policy on this table that targets `anon` or `public` would still let
--    anon in through RLS (the revoke above already blocks it at the grant level).
--    Drop those if step 0 lists any.

-- Stricter (optional): allow only specific accounts instead of any signed-in user.
-- Replace `using (true)` / `with check (true)` above with:
--   (auth.jwt() ->> 'email') in ('you@example.com')

-- Check afterwards: this should return 401/permission errors or an empty list
-- when called with only the anon key:
--   GET  <SUPABASE_URL>/rest/v1/app_state?select=id   (apikey + Bearer = anon key)
