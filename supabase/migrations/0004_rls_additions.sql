-- =============================================================================
-- 0004_rls_additions.sql
-- RLS for the new clinical-records, patient identity, and OTP tables.
-- Layered on top of 0002_rls_policies.sql.
-- =============================================================================

-- =============================================================================
-- 1. Helper: read patient_id claim from the JWT
--    Set by the custom-access-token hook when a patient_users row exists.
-- =============================================================================

create or replace function public.current_patient_id() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.patient_id', true), '')::uuid,
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'patient_id'), '')::uuid
  )
$$;

-- =============================================================================
-- 2. Enable RLS on every new table
-- =============================================================================

alter table public.visit_notes            enable row level security;
alter table public.visit_attachments      enable row level security;
alter table public.prescriptions          enable row level security;
alter table public.prescription_items     enable row level security;
alter table public.visit_tooth_treatments enable row level security;
alter table public.medical_history        enable row level security;
alter table public.patient_users          enable row level security;

-- otp_codes: RLS on with NO policies — service-role-only access (anon/auth blocked).
alter table public.otp_codes              enable row level security;

-- =============================================================================
-- 3. Generic clinic-scoped policies for the new tables
--    Mirrors the policy generator in 0002_rls_policies.sql so super-admin and
--    clinic staff inherit the same select/insert/update/delete shape.
-- =============================================================================

do $$
declare
  t text;
  scoped_tables text[] := array[
    'visit_notes', 'visit_attachments', 'prescriptions',
    'visit_tooth_treatments', 'medical_history', 'patient_users'
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
-- 4. prescription_items: no clinic_id column — gate via join through prescriptions
-- =============================================================================

create policy prescription_items_tenant_select on public.prescription_items
  for select using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  );

create policy prescription_items_tenant_insert on public.prescription_items
  for insert with check (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  );

create policy prescription_items_tenant_update on public.prescription_items
  for update using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  ) with check (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  );

create policy prescription_items_tenant_delete on public.prescription_items
  for delete using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  );

-- =============================================================================
-- 5. Patient self-access (additive — OR'd with the tenant policies above)
--    These unlock /me/* reads once the JWT carries a patient_id claim.
--    Write access stays staff-only for now.
-- =============================================================================

-- Patient sees their own row
create policy patients_self_select on public.patients
  for select using (
    public.current_patient_id() is not null
      and id = public.current_patient_id()
  );

-- Patient sees their own appointments
create policy appointments_patient_self_select on public.appointments
  for select using (
    public.current_patient_id() is not null
      and patient_id = public.current_patient_id()
  );

-- Patient sees their own visit notes
create policy visit_notes_patient_self_select on public.visit_notes
  for select using (
    public.current_patient_id() is not null
      and patient_id = public.current_patient_id()
  );

-- Patient sees their own prescriptions
create policy prescriptions_patient_self_select on public.prescriptions
  for select using (
    public.current_patient_id() is not null
      and patient_id = public.current_patient_id()
  );

-- Patient sees the items of their own prescriptions (join)
create policy prescription_items_patient_self_select on public.prescription_items
  for select using (
    public.current_patient_id() is not null
      and exists (
        select 1 from public.prescriptions p
        where p.id = prescription_items.prescription_id
          and p.patient_id = public.current_patient_id()
      )
  );

-- Patient sees their own attachments
create policy visit_attachments_patient_self_select on public.visit_attachments
  for select using (
    public.current_patient_id() is not null
      and patient_id = public.current_patient_id()
  );

-- Patient sees their own medical history
create policy medical_history_patient_self_select on public.medical_history
  for select using (
    public.current_patient_id() is not null
      and patient_id = public.current_patient_id()
  );

-- patient_users: a patient sees only their own mapping row (by auth.uid)
create policy patient_users_self_select on public.patient_users
  for select using (auth_user_id = auth.uid());
