-- =============================================================================
-- 0010_departments.sql
-- Per-clinic departments + doctor → department FK.
--
-- This is the additive half of the larger Department-first booking redesign.
-- The destructive change (drop appointments.service_id) ships in 0011 once the
-- admin dialog, public booking flow, and WhatsApp templates all stop relying on
-- service.
-- =============================================================================

-- =============================================================================
-- 1. departments table
-- =============================================================================

create table if not exists public.departments (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  name          text not null,
  slug          text not null,
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (clinic_id, slug),
  check (length(slug) between 2 and 60),
  check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

create index if not exists departments_clinic_idx on public.departments (clinic_id, display_order);

-- =============================================================================
-- 2. RLS — generic clinic-scoped (same shape as 0002)
-- =============================================================================

alter table public.departments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'departments_tenant_select') then
    create policy departments_tenant_select on public.departments
      for select using (
        clinic_id = public.current_clinic_id() or public.is_super_admin()
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'departments_tenant_insert') then
    create policy departments_tenant_insert on public.departments
      for insert with check (
        clinic_id = public.current_clinic_id() or public.is_super_admin()
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'departments_tenant_update') then
    create policy departments_tenant_update on public.departments
      for update using (
        clinic_id = public.current_clinic_id() or public.is_super_admin()
      ) with check (
        clinic_id = public.current_clinic_id() or public.is_super_admin()
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'departments_tenant_delete') then
    create policy departments_tenant_delete on public.departments
      for delete using (
        clinic_id = public.current_clinic_id() or public.is_super_admin()
      );
  end if;
end $$;

-- =============================================================================
-- 3. doctors → department FK (nullable; ON DELETE SET NULL preserves the doctor)
-- =============================================================================

alter table public.doctors
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists doctors_department_idx on public.doctors (department_id);

-- =============================================================================
-- 4. Seed default departments for every existing clinic
--    (idempotent — `unique (clinic_id, slug)` + on-conflict-do-nothing)
-- =============================================================================

insert into public.departments (clinic_id, name, slug, display_order)
select id, 'Dental',      'dental',      1 from public.clinics
union all
select id, 'Psychiatry',  'psychiatry',  2 from public.clinics
union all
select id, 'Neurology',   'neurology',   3 from public.clinics
union all
select id, 'Gynecology',  'gynecology',  4 from public.clinics
on conflict (clinic_id, slug) do nothing;

-- =============================================================================
-- 5. Backfill existing doctors → their clinic's Dental department
--    (v1 single-clinic dental practice; tweak per-clinic later via the
--    /admin/settings/departments UI.)
-- =============================================================================

update public.doctors d
   set department_id = (
     select id from public.departments
      where clinic_id = d.clinic_id and slug = 'dental'
      limit 1
   )
 where department_id is null;
