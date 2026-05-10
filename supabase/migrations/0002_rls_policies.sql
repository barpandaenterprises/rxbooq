-- =============================================================================
-- 0002_rls_policies.sql
-- Row-Level Security policies. Tenant isolation lives at the database layer.
-- =============================================================================

-- Helper: read clinic_id from the JWT claim. Clinic staff have this set by an
-- Auth Hook that joins clinic_users on login. Patients use a separate set of
-- policies that join through their patients row.
create or replace function public.current_clinic_id() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.clinic_id', true), '')::uuid,
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'clinic_id'), '')::uuid
  )
$$;

create or replace function public.current_role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '')
  )
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable as $$ select public.current_role() = 'superadmin' $$;

-- =============================================================================
-- Enable RLS on every clinic-scoped table
-- =============================================================================

alter table public.clinics                enable row level security;
alter table public.clinic_users           enable row level security;
alter table public.doctors                enable row level security;
alter table public.patients               enable row level security;
alter table public.services               enable row level security;
alter table public.doctor_availability    enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.appointments           enable row level security;
alter table public.clinic_slot_locks      enable row level security;
alter table public.wa_templates           enable row level security;
alter table public.wa_messages            enable row level security;
alter table public.audit_logs             enable row level security;

-- =============================================================================
-- Generic policy generator for clinic-scoped tables
-- =============================================================================

do $$
declare
  t text;
  scoped_tables text[] := array[
    'clinic_users', 'doctors', 'patients', 'services',
    'doctor_availability', 'availability_overrides',
    'appointments', 'clinic_slot_locks',
    'wa_messages', 'audit_logs'
  ];
begin
  foreach t in array scoped_tables loop
    execute format($f$
      create policy %I_tenant_select on public.%I
        for select using (
          clinic_id = public.current_clinic_id() or public.is_super_admin()
        );

      create policy %I_tenant_insert on public.%I
        for insert with check (
          clinic_id = public.current_clinic_id() or public.is_super_admin()
        );

      create policy %I_tenant_update on public.%I
        for update using (
          clinic_id = public.current_clinic_id() or public.is_super_admin()
        ) with check (
          clinic_id = public.current_clinic_id() or public.is_super_admin()
        );

      create policy %I_tenant_delete on public.%I
        for delete using (
          clinic_id = public.current_clinic_id() or public.is_super_admin()
        );
    $f$, t, t, t, t, t, t, t, t);
  end loop;
end $$;

-- =============================================================================
-- clinics: super-admin all, clinic staff read-only their own
-- =============================================================================

create policy clinics_select on public.clinics
  for select using (
    id = public.current_clinic_id() or public.is_super_admin()
  );

create policy clinics_super_admin_all on public.clinics
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- =============================================================================
-- wa_templates: global read, super-admin write
-- =============================================================================

create policy wa_templates_select on public.wa_templates
  for select using (true);

create policy wa_templates_super_admin_write on public.wa_templates
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
