-- =============================================================================
-- 0001_initial_schema.sql
-- Doctor Kart v1 schema: tenant + identity, scheduling, messaging, audit.
-- Designed for multi-tenant Postgres with Row-Level Security.
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. Tenant & identity
-- =============================================================================

create table if not exists public.clinics (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  custom_domain   text unique,
  name            text not null,
  plan            text not null default 'silver' check (plan in ('silver','gold')),
  status          text not null default 'onboarding' check (status in ('active','suspended','onboarding')),
  theme           jsonb,
  locale_default  text not null default 'en',
  locales         text[] not null default '{en}',
  whatsapp_number text,
  whatsapp_provider_account_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists clinics_slug_idx          on public.clinics (slug);
create index if not exists clinics_custom_domain_idx on public.clinics (custom_domain);

create table if not exists public.clinic_users (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  role          text not null check (role in ('doctor','receptionist','clinic_admin')),
  display_name  text,
  email         text,
  phone         text,
  created_at    timestamptz not null default now()
);

create index if not exists clinic_users_clinic_idx on public.clinic_users (clinic_id);

create table if not exists public.doctors (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  display_name    text not null,
  qualifications  text,
  bio             text,
  photo_url       text,
  registration_no text,
  display_order   int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists doctors_clinic_idx on public.doctors (clinic_id);

create table if not exists public.patients (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  full_name       text not null,
  phone_e164      text not null,
  phone_verified  boolean not null default false,
  language        text not null default 'en',
  whatsapp_opt_in boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (clinic_id, phone_e164)
);

create index if not exists patients_clinic_idx on public.patients (clinic_id);
create index if not exists patients_phone_idx  on public.patients (clinic_id, phone_e164);

-- =============================================================================
-- 2. Scheduling
-- =============================================================================

create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes int not null default 30,
  price_inr        int,
  is_active        boolean not null default true,
  display_order    int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists services_clinic_idx on public.services (clinic_id);

create table if not exists public.doctor_availability (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  doctor_id       uuid not null references public.doctors(id) on delete cascade,
  weekday         int not null check (weekday between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  slot_minutes    int not null default 15,
  effective_from  date not null default current_date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists doctor_availability_clinic_idx on public.doctor_availability (clinic_id);
create index if not exists doctor_availability_doctor_idx on public.doctor_availability (doctor_id);

create table if not exists public.availability_overrides (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  doctor_id   uuid not null references public.doctors(id) on delete cascade,
  date        date not null,
  is_blocked  boolean not null default true,
  start_time  time,
  end_time    time,
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists availability_overrides_clinic_idx on public.availability_overrides (clinic_id, date);

create table if not exists public.appointments (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id) on delete cascade,
  patient_id   uuid not null references public.patients(id),
  doctor_id    uuid not null references public.doctors(id),
  service_id   uuid not null references public.services(id),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'booked'
                 check (status in ('booked','confirmed','completed','cancelled','no_show')),
  source       text not null default 'site'
                 check (source in ('site','whatsapp','phone','walkin')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists appointments_clinic_idx       on public.appointments (clinic_id);
create index if not exists appointments_doctor_time_idx  on public.appointments (clinic_id, doctor_id, starts_at);
create index if not exists appointments_patient_idx      on public.appointments (clinic_id, patient_id);
create index if not exists appointments_status_idx       on public.appointments (clinic_id, status);

-- Slot lock table: prevents two patients from booking the same slot in the
-- same second. Booking server action does `select … for update` on this row.
create table if not exists public.clinic_slot_locks (
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  doctor_id  uuid not null references public.doctors(id) on delete cascade,
  starts_at  timestamptz not null,
  primary key (clinic_id, doctor_id, starts_at)
);

-- =============================================================================
-- 3. Messaging + audit
-- =============================================================================

create table if not exists public.wa_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  language   text not null,
  variables  text[] not null default '{}',
  status     text not null default 'pending' check (status in ('approved','pending','rejected')),
  created_at timestamptz not null default now(),
  unique (name, language)
);

create table if not exists public.wa_messages (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics(id) on delete cascade,
  patient_id          uuid not null references public.patients(id),
  appointment_id      uuid references public.appointments(id),
  template_name       text,
  direction           text not null check (direction in ('out','in')),
  payload             jsonb,
  status              text not null default 'queued',
  provider_message_id text,
  error               text,
  created_at          timestamptz not null default now()
);

create index if not exists wa_messages_clinic_idx       on public.wa_messages (clinic_id, created_at desc);
create index if not exists wa_messages_patient_idx      on public.wa_messages (clinic_id, patient_id);
create index if not exists wa_messages_appointment_idx  on public.wa_messages (appointment_id);

create table if not exists public.audit_logs (
  id             bigserial primary key,
  clinic_id      uuid references public.clinics(id) on delete set null,
  actor_user_id  uuid,
  action         text not null,
  entity         text not null,
  entity_id      uuid,
  diff           jsonb,
  ip             inet,
  created_at     timestamptz not null default now()
);

create index if not exists audit_logs_clinic_idx on public.audit_logs (clinic_id, created_at desc);

-- =============================================================================
-- 4. updated_at triggers
-- =============================================================================

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clinics_updated_at on public.clinics;
create trigger clinics_updated_at      before update on public.clinics      for each row execute function public.touch_updated_at();
drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments for each row execute function public.touch_updated_at();
