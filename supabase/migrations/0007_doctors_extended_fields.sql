-- =============================================================================
-- 0007_doctors_extended_fields.sql
-- Extends public.doctors with the fields the AddDoctorDialog already captures
-- so the form stops silently dropping data.
--
-- Status semantics: the existing is_active boolean stays for backward compat;
-- new code reads `status` ('active' | 'on_leave' | 'inactive') and write paths
-- keep is_active in sync (is_active = status = 'active').
-- =============================================================================

alter table public.doctors
  add column if not exists years_experience  int,
  add column if not exists trained_at        text,
  add column if not exists phone             text,
  add column if not exists email             text,
  add column if not exists primary_specialty text,
  add column if not exists visiting          boolean not null default false,
  add column if not exists visiting_note     text,
  add column if not exists status            text    not null default 'active',
  add column if not exists languages         text[]  not null default '{en}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_status_check'
  ) then
    alter table public.doctors
      add constraint doctors_status_check
      check (status in ('active', 'on_leave', 'inactive'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_years_experience_check'
  ) then
    alter table public.doctors
      add constraint doctors_years_experience_check
      check (years_experience is null or (years_experience >= 0 and years_experience <= 80));
  end if;
end $$;

-- Backfill: existing rows should have a status matching their is_active flag.
update public.doctors
   set status = case when is_active then 'active' else 'inactive' end
 where status = 'active' and is_active = false;
