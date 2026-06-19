-- =============================================================================
-- 0019_multi_clinic_membership.sql
-- Drop the one-clinic-per-user constraint so a single auth user can be a
-- member of multiple clinics (e.g. a visiting doctor at two practices, or a
-- founder who runs more than one clinic).
--
-- The DB used to enforce `unique (auth_user_id)` on clinic_users. After this
-- migration the natural key is the pair (clinic_id, auth_user_id) — you can
-- only be in a given clinic once, but you can be in many clinics.
--
-- Pairs with the URL-driven active-clinic refactor: every /admin/* page now
-- lives under /[clinicSlug]/admin/*, and the layout-level membership gate
-- enforces that the signed-in user belongs to the URL's clinic.
-- =============================================================================

-- 1. Drop the legacy single-membership constraint.
--    Some Postgres versions report this constraint under different generated
--    names depending on which Supabase release created the table — DROP IF
--    EXISTS handles both `clinic_users_auth_user_id_key` (column-name style)
--    and the explicit `unique` name from 0001.
alter table public.clinic_users
  drop constraint if exists clinic_users_auth_user_id_key;

-- Some installs may have it via an inline `unique` instead — try both shapes.
do $$
declare
  con record;
begin
  for con in
    select conname
      from pg_constraint
     where conrelid = 'public.clinic_users'::regclass
       and contype  = 'u'
       and conkey   = (
         select array_agg(attnum order by attnum)
           from pg_attribute
          where attrelid = 'public.clinic_users'::regclass
            and attname  = 'auth_user_id'
       )
  loop
    execute format('alter table public.clinic_users drop constraint %I', con.conname);
  end loop;
end $$;

-- 2. New composite-uniqueness key: (clinic_id, auth_user_id).
--    "You can only be in a given clinic once" stays true; cross-clinic
--    membership is now allowed.
alter table public.clinic_users
  drop constraint if exists clinic_users_clinic_user_uniq;

alter table public.clinic_users
  add constraint clinic_users_clinic_user_uniq
  unique (clinic_id, auth_user_id);

-- 3. Speed-up index for the new active-clinic-resolver lookup pattern:
--    "given this auth_user, what clinics am I in?" — used by the sidebar
--    switcher and the URL membership gate.
create index if not exists clinic_users_auth_user_idx
  on public.clinic_users (auth_user_id);

comment on constraint clinic_users_clinic_user_uniq on public.clinic_users is
  'Pair-uniqueness replaces the old single-row-per-user constraint. Users can belong to multiple clinics; the URL segment /[clinicSlug] decides which clinic they are acting in.';
