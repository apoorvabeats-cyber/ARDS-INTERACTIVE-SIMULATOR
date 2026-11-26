-- Critical Care Universe: beta_access checks and hardening.
-- Run in Supabase > SQL Editor. Safe to run more than once. It does NOT recreate your table, trigger or function.
-- Tip: run PART 2 one step at a time (2a, then 2b, 2c, 2d) so an error in one cannot hide the others.

-- PART 1. LOOK (read-only). Run these first and check the results.
-- 1a. Policies on beta_access: expect exactly ONE row, cmd = SELECT, qual = (auth.uid() = user_id).
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public' and tablename='beta_access';
-- 1b. RLS must be on (rowsecurity = true).
select relname, relrowsecurity from pg_class where oid = 'public.beta_access'::regclass;
-- 1c. Who can write to the table directly? After PART 2 the only grant for anon/authenticated should be SELECT (authenticated).
select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='beta_access' order by 1,2;
-- 1d. handle_new_user should be SECURITY DEFINER (prosecdef = true) with a fixed search_path in proconfig.
select proname, prosecdef, proconfig from pg_proc where proname='handle_new_user' and pronamespace='public'::regnamespace;
-- 1f. The signup trigger must exist and be enabled (tgenabled = 'O'). Expect one row named on_auth_user_created.
select tgname, tgenabled, pg_get_triggerdef(oid) as definition from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- 1g. Existing constraints on beta_access. If a CHECK on access_status is already listed (or access_status is an enum type), SKIP step 2d below.
select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'public.beta_access'::regclass;
-- 1e. People who signed up BEFORE the trigger existed and have no row (the app treats them as pending, but admins cannot see them):
select u.id, u.email from auth.users u left join public.beta_access b on b.user_id = u.id where b.user_id is null;

-- PART 2. FIX (idempotent).
-- 2a. Backfill missing rows as pending.
insert into public.beta_access (user_id, email, access_status)
select u.id, u.email, 'pending' from auth.users u
where not exists (select 1 from public.beta_access b where b.user_id = u.id)
on conflict (user_id) do nothing;

-- 2b. Keep RLS on.
alter table public.beta_access enable row level security;

-- 2c. Users can only READ (their own row, via the existing policy). Remove every write privilege from the API roles.
--     The Edge Function writes with the service role, which bypasses RLS and is not affected by this.
revoke all on table public.beta_access from anon;
revoke insert, update, delete, truncate, references, trigger on table public.beta_access from authenticated;
grant select on table public.beta_access to authenticated;

-- 2d. Only allow the three known values. SKIP if 1g already shows a CHECK on access_status or the column is an enum.
--     It will fail if any existing row holds another value; in that case fix those rows first.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'beta_access_status_check' and conrelid = 'public.beta_access'::regclass) then
    alter table public.beta_access add constraint beta_access_status_check check (access_status in ('pending','approved','rejected'));
  end if;
end $$;

-- PART 3. ONLY IF 1d showed prosecdef = false or proconfig empty (a genuine problem). Otherwise skip.
-- create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   insert into public.beta_access (user_id, email, access_status) values (new.id, new.email, 'pending') on conflict (user_id) do nothing;
--   return new;
-- end; $$;
