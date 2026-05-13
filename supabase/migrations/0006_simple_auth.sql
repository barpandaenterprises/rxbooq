-- =============================================================================
-- 0006_simple_auth.sql
-- Replaces the JWT custom-claims hook approach with security-definer helpers
-- that look up clinic_id, role, and patient_id directly from the database.
--
-- Why:
--   - No dashboard step (no hook registration)
--   - Role changes take effect on the next query, not the next token refresh
--   - No beta API surface (Custom Access Token hook is still beta)
--
-- Trade-off: each RLS check runs a small index lookup against clinic_users /
-- patient_users. Cheap (PK by auth_user_id, cached by Postgres per-statement).
--
-- Layered on top of 0002_rls_policies.sql and 0004_rls_additions.sql.
-- =============================================================================

-- =============================================================================
-- current_clinic_id
--   Patient sessions (rows in patient_users) take precedence over staff
--   sessions (rows in clinic_users). Same user can't be both in practice;
--   the precedence is just a tie-breaker.
-- =============================================================================

create or replace function public.current_clinic_id() returns uuid
language sql stable security definer set search_path = public, auth
as $$
  select clinic_id from (
    select clinic_id, 1 as priority
      from public.patient_users
     where auth_user_id = auth.uid()
    union all
    select clinic_id, 2 as priority
      from public.clinic_users
     where auth_user_id = auth.uid()
  ) x
  order by priority
  limit 1
$$;

-- =============================================================================
-- current_role
--   Resolution order: patient > clinic staff > superadmin (via auth.users meta)
-- =============================================================================

create or replace function public.current_role() returns text
language sql stable security definer set search_path = public, auth
as $$
  select role from (
    select 'patient'::text as role, 1 as priority
      from public.patient_users
     where auth_user_id = auth.uid()
    union all
    select cu.role, 2 as priority
      from public.clinic_users cu
     where cu.auth_user_id = auth.uid()
    union all
    select 'superadmin'::text as role, 3 as priority
      from auth.users u
     where u.id = auth.uid()
       and coalesce(u.raw_app_meta_data ->> 'role', '') = 'superadmin'
  ) x
  order by priority
  limit 1
$$;

-- =============================================================================
-- is_super_admin
--   Reads auth.users.raw_app_meta_data.role. Set it manually in Supabase
--   Dashboard or with:
--     update auth.users
--        set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data,'{}'),
--                                          '{role}', '"superadmin"')
--      where id = '<uuid>';
-- =============================================================================

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
     where id = auth.uid()
       and coalesce(raw_app_meta_data ->> 'role', '') = 'superadmin'
  )
$$;

-- =============================================================================
-- current_patient_id
-- =============================================================================

create or replace function public.current_patient_id() returns uuid
language sql stable security definer set search_path = public, auth
as $$
  select patient_id
    from public.patient_users
   where auth_user_id = auth.uid()
   limit 1
$$;

-- =============================================================================
-- Grants for the runtime roles
--   security definer functions run as their OWNER (postgres in Supabase, which
--   has BYPASSRLS), so they can read clinic_users / patient_users / auth.users
--   even though those tables have RLS. We just need authenticated/anon to be
--   allowed to CALL them.
-- =============================================================================

grant execute on function public.current_clinic_id()    to authenticated, anon;
grant execute on function public.current_role()         to authenticated, anon;
grant execute on function public.is_super_admin()       to authenticated, anon;
grant execute on function public.current_patient_id()   to authenticated, anon;
