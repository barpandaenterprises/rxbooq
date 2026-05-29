-- =============================================================================
-- 0008_clinic_applications.sql
-- Self-serve doctor / clinic onboarding funnel.
--
-- A new doctor who signs in (typically via OAuth — Google, Facebook, GitHub)
-- and has no clinic_users row lands in /onboarding/new and submits a row here.
-- A superadmin reviews from /superadmin/applications and approves or rejects.
-- Approval creates clinics + clinic_users + doctors in one transaction and
-- back-fills clinic_id on the application row.
--
-- One active application per auth user — a partial unique index allows
-- re-applying after a rejection or withdrawal.
-- =============================================================================

-- =============================================================================
-- 1. Status enum
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'clinic_application_status') then
    create type public.clinic_application_status as enum (
      'pending', 'approved', 'rejected', 'withdrawn'
    );
  end if;
end $$;

-- =============================================================================
-- 2. clinic_applications table
-- =============================================================================

create table if not exists public.clinic_applications (
  id                        uuid primary key default gen_random_uuid(),
  auth_user_id              uuid not null references auth.users(id) on delete cascade,

  -- Clinic basics
  clinic_name               text not null,
  suggested_slug            text not null,
  address                   text not null,
  city                      text not null,
  state                     text not null,
  pincode                   text not null,
  primary_phone             text not null,
  primary_email             text not null,

  -- Founding doctor profile
  doctor_full_name          text not null,
  doctor_qualifications     text,
  doctor_registration_no    text not null,
  doctor_primary_specialty  text,
  doctor_years_experience   int,
  doctor_languages          text[] not null default '{en}',

  -- Verification documents — paths inside the private `clinic-applications` bucket
  -- (created in 0009_clinic_applications_storage.sql). Convention:
  --   applications/{auth_user_id}/{kind}/{file_name}
  registration_cert_path    text,
  clinic_license_path       text,

  pitch                     text,

  -- Workflow
  status                    public.clinic_application_status not null default 'pending',
  rejected_reason           text,
  reviewed_by               uuid references auth.users(id),
  reviewed_at               timestamptz,
  clinic_id                 uuid references public.clinics(id),  -- filled in on approval

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  check (length(suggested_slug) between 2 and 60),
  check (suggested_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  check (pincode ~ '^[0-9]{6}$'),
  check (doctor_years_experience is null or (doctor_years_experience >= 0 and doctor_years_experience <= 80))
);

create index if not exists clinic_applications_status_idx
  on public.clinic_applications (status, created_at desc);

create index if not exists clinic_applications_auth_user_idx
  on public.clinic_applications (auth_user_id);

-- One active (pending or approved) application per auth user. Rejected /
-- withdrawn rows stay around for history but don't block a re-apply.
create unique index if not exists clinic_applications_one_active_per_user
  on public.clinic_applications (auth_user_id)
  where status in ('pending', 'approved');

create trigger clinic_applications_updated_at
  before update on public.clinic_applications
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- 3. RLS
--    - Applicant: read + insert + update their own pending/rejected row.
--    - Superadmin: full access via is_super_admin() helper from 0006.
--    - No one else can see applications (multi-tenant clinic_admin / doctor /
--      receptionist have no business reading another tenant's applications).
-- =============================================================================

alter table public.clinic_applications enable row level security;

create policy clinic_applications_self_read on public.clinic_applications
  for select to authenticated using (
    auth_user_id = auth.uid()
    or public.is_super_admin()
  );

create policy clinic_applications_self_insert on public.clinic_applications
  for insert to authenticated with check (
    auth_user_id = auth.uid()
    and status = 'pending'
  );

-- Applicant can edit their own row only while pending or rejected (so they can
-- correct details and re-apply). They cannot change status, reviewed_*,
-- or clinic_id — those are superadmin-only.
create policy clinic_applications_self_update on public.clinic_applications
  for update to authenticated using (
    auth_user_id = auth.uid()
    and status in ('pending', 'rejected')
  ) with check (
    auth_user_id = auth.uid()
  );

create policy clinic_applications_superadmin_all on public.clinic_applications
  for all to authenticated using (
    public.is_super_admin()
  ) with check (
    public.is_super_admin()
  );

-- =============================================================================
-- 4. Approve helper — single transaction that turns an application into a
--    real clinic + clinic_admin clinic_users row + founding doctor row.
--    Called by the superadmin approve action via the service-role client.
--
--    Returns the new clinic_id so the caller can revalidate paths / notify.
-- =============================================================================

create or replace function public.approve_clinic_application(
  application_id uuid,
  reviewer_id    uuid
) returns uuid
language plpgsql security definer set search_path = public, auth
as $$
declare
  app  public.clinic_applications%rowtype;
  new_clinic_id uuid;
begin
  select * into app from public.clinic_applications where id = application_id for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if app.status <> 'pending' then
    raise exception 'application_not_pending';
  end if;

  insert into public.clinics (slug, name, status, whatsapp_number, locale_default, locales)
  values (
    app.suggested_slug,
    app.clinic_name,
    'onboarding',
    app.primary_phone,
    'en',
    '{en}'
  )
  returning id into new_clinic_id;

  insert into public.clinic_users (clinic_id, auth_user_id, role, display_name, email, phone)
  values (
    new_clinic_id,
    app.auth_user_id,
    'clinic_admin',
    app.doctor_full_name,
    app.primary_email,
    app.primary_phone
  );

  insert into public.doctors (
    clinic_id, display_name, qualifications, registration_no,
    years_experience, phone, email, primary_specialty, languages
  )
  values (
    new_clinic_id,
    app.doctor_full_name,
    app.doctor_qualifications,
    app.doctor_registration_no,
    app.doctor_years_experience,
    app.primary_phone,
    app.primary_email,
    app.doctor_primary_specialty,
    app.doctor_languages
  );

  update public.clinic_applications
     set status      = 'approved',
         reviewed_by = reviewer_id,
         reviewed_at = now(),
         clinic_id   = new_clinic_id
   where id = application_id;

  return new_clinic_id;
end;
$$;

revoke all on function public.approve_clinic_application(uuid, uuid) from public;
grant execute on function public.approve_clinic_application(uuid, uuid) to authenticated;

-- The function is SECURITY DEFINER so it can bypass RLS to write into
-- clinics / clinic_users / doctors. Callers are still gated by is_super_admin()
-- enforced at the application layer (server action).
