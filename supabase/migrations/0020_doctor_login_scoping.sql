-- =============================================================================
-- 0020_doctor_login_scoping.sql
-- Link a staff login to a doctor profile, and give patients an explicit
-- assigned/primary doctor. Both columns power the "a doctor sees only their
-- own data" feature, enforced at the app layer (loaders + action gates + UI).
--
-- No RLS policy changes: tenant isolation stays generic per-clinic. The doctor
-- restriction is additive in application code, not the database.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. clinic_users → doctors link
-- ----------------------------------------------------------------------------
-- Nullable: only role='doctor' rows set it; admins/receptionists leave it null.
-- on delete set null so removing a doctor profile never deletes the login.
alter table public.clinic_users
  add column if not exists doctor_id uuid references public.doctors(id) on delete set null;

create index if not exists clinic_users_doctor_idx on public.clinic_users (doctor_id);

-- At most one login per doctor profile per clinic.
create unique index if not exists clinic_users_doctor_uniq
  on public.clinic_users (clinic_id, doctor_id)
  where doctor_id is not null;

-- ----------------------------------------------------------------------------
-- 2. patients → assigned/primary doctor
-- ----------------------------------------------------------------------------
-- Nullable: unassigned patients stay visible to a doctor via the appointment
-- union (assigned OR has an appointment with the doctor).
alter table public.patients
  add column if not exists assigned_doctor_id uuid references public.doctors(id) on delete set null;

create index if not exists patients_assigned_doctor_idx
  on public.patients (clinic_id, assigned_doctor_id);
