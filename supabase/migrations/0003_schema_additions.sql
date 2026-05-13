-- =============================================================================
-- 0003_schema_additions.sql
-- Adds clinical-records tables, patient self-service identity, and OTP store.
-- Layered on top of 0001_initial_schema.sql.
-- =============================================================================

-- =============================================================================
-- 1. Patients: extend with demographics + tags
-- =============================================================================

alter table public.patients
  add column if not exists date_of_birth date,
  add column if not exists gender        text,
  add column if not exists tags          text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patients_gender_check'
  ) then
    alter table public.patients
      add constraint patients_gender_check check (gender in ('M','F','O'));
  end if;
end $$;

-- =============================================================================
-- 2. Clinical records
-- =============================================================================

-- ---- visit_notes -----------------------------------------------------------
create table public.visit_notes (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references public.clinics(id)      on delete cascade,
  appointment_id     uuid references public.appointments(id)          on delete set null,
  patient_id         uuid not null references public.patients(id)     on delete cascade,
  visit_date         date not null,
  chief_complaint    text,
  exam_findings      text,
  diagnosis          text,
  treatment_done     text,
  next_visit_advice  text,
  created_by         uuid references public.clinic_users(id)          on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index visit_notes_clinic_idx      on public.visit_notes (clinic_id);
create index visit_notes_patient_idx     on public.visit_notes (clinic_id, patient_id, visit_date desc);
create index visit_notes_appointment_idx on public.visit_notes (appointment_id);

-- ---- visit_attachments (created before prescriptions; prescriptions.source_photo_id FKs into it) ----
create table public.visit_attachments (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id)      on delete cascade,
  appointment_id    uuid references public.appointments(id)          on delete set null,
  patient_id        uuid not null references public.patients(id)     on delete cascade,
  kind              text not null
                       check (kind in ('xray','prescription_pdf','treatment_plan',
                                       'receipt','lab_report','consent','other')),
  file_name         text not null,
  file_size_bytes   bigint not null,
  mime_type         text not null,
  storage_path      text not null,
  notes             text,
  created_by        uuid references public.clinic_users(id)          on delete set null,
  created_at        timestamptz not null default now()
);

create index visit_attachments_clinic_idx      on public.visit_attachments (clinic_id);
create index visit_attachments_patient_idx     on public.visit_attachments (clinic_id, patient_id, created_at desc);
create index visit_attachments_appointment_idx on public.visit_attachments (appointment_id);
create index visit_attachments_kind_idx        on public.visit_attachments (clinic_id, kind);

-- ---- prescriptions ---------------------------------------------------------
create table public.prescriptions (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id)            on delete cascade,
  appointment_id    uuid references public.appointments(id)                on delete set null,
  patient_id        uuid not null references public.patients(id)           on delete cascade,
  doctor_id         uuid not null references public.doctors(id),
  source            text not null default 'manual'
                       check (source in ('handwritten','template','manual')),
  source_photo_id   uuid references public.visit_attachments(id)           on delete set null,
  template_id       text,
  ocr_confidence    numeric(3,2) check (ocr_confidence between 0 and 1),
  notes             text,
  created_by        uuid references public.clinic_users(id)                on delete set null,
  created_at        timestamptz not null default now()
);

create index prescriptions_clinic_idx      on public.prescriptions (clinic_id);
create index prescriptions_patient_idx     on public.prescriptions (clinic_id, patient_id, created_at desc);
create index prescriptions_appointment_idx on public.prescriptions (appointment_id);

-- ---- prescription_items ----------------------------------------------------
create table public.prescription_items (
  id                uuid primary key default gen_random_uuid(),
  prescription_id   uuid not null references public.prescriptions(id) on delete cascade,
  position          int not null,
  medication        text not null,
  dosage            text not null,
  frequency         text not null,
  duration          text not null,
  instructions      text,
  unique (prescription_id, position)
);

create index prescription_items_rx_idx on public.prescription_items (prescription_id, position);

-- ---- visit_tooth_treatments ------------------------------------------------
create table public.visit_tooth_treatments (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id)      on delete cascade,
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  patient_id      uuid not null references public.patients(id)     on delete cascade,
  tooth_fdi       int not null check (tooth_fdi between 11 and 48),
  surface         text,
  procedure       text not null,
  notes           text,
  created_at      timestamptz not null default now()
);

create index visit_tooth_clinic_idx      on public.visit_tooth_treatments (clinic_id);
create index visit_tooth_appointment_idx on public.visit_tooth_treatments (appointment_id);
create index visit_tooth_patient_idx     on public.visit_tooth_treatments (clinic_id, patient_id);

-- ---- medical_history (one row per patient) ---------------------------------
create table public.medical_history (
  patient_id            uuid primary key references public.patients(id) on delete cascade,
  clinic_id             uuid not null references public.clinics(id)      on delete cascade,
  blood_thinners        boolean not null default false,
  conditions            text[]  not null default '{}',
  current_medications   jsonb   not null default '[]'::jsonb, -- [{name, dosage}]
  allergies             jsonb   not null default '[]'::jsonb, -- [{name, severity, notes}]
  dental_history_notes  text,
  updated_at            timestamptz not null default now()
);

create index medical_history_clinic_idx on public.medical_history (clinic_id);

-- =============================================================================
-- 3. Patient self-service identity (used by JWT hook to inject patient_id claim)
-- =============================================================================

create table public.patient_users (
  auth_user_id   uuid primary key references auth.users(id)        on delete cascade,
  patient_id     uuid not null references public.patients(id)      on delete cascade,
  clinic_id      uuid not null references public.clinics(id)       on delete cascade,
  phone_e164     text not null,
  created_at     timestamptz not null default now(),
  unique (clinic_id, patient_id)
);

create index patient_users_patient_idx on public.patient_users (patient_id);
create index patient_users_clinic_idx  on public.patient_users (clinic_id);

-- =============================================================================
-- 4. OTP store (WhatsApp OTP custom flow)
-- =============================================================================

create table public.otp_codes (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  phone_e164    text not null,
  code_hash     text not null,                              -- sha-256 hex of the 6-digit code
  purpose       text not null default 'patient_signin',
  attempts      int  not null default 0,
  consumed_at   timestamptz,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index otp_codes_lookup_idx on public.otp_codes (clinic_id, phone_e164, created_at desc);

-- =============================================================================
-- 5. updated_at triggers for new tables that mutate
-- =============================================================================

create trigger visit_notes_updated_at      before update on public.visit_notes
  for each row execute function public.touch_updated_at();

create trigger medical_history_updated_at  before update on public.medical_history
  for each row execute function public.touch_updated_at();
