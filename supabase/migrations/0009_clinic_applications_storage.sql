-- =============================================================================
-- 0009_clinic_applications_storage.sql
-- Private Storage bucket for verification documents uploaded during the
-- self-serve clinic onboarding flow (0008).
--
-- Path convention:
--   applications/{auth_user_id}/{kind}/{file_name}
--
-- where kind is one of: 'registration_cert', 'clinic_license'.
-- =============================================================================

-- =============================================================================
-- 1. Bucket (idempotent)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinic-applications',
  'clinic-applications',
  false,
  10485760,  -- 10 MiB per file
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 2. Path-extraction helper
--    [1] = 'applications', [2] = auth_user_id, [3] = kind
-- =============================================================================

create or replace function public.storage_applicant_id_from_path(object_name text)
returns uuid
language plpgsql immutable as $$
declare
  parts text[];
  raw   text;
begin
  parts := storage.foldername(object_name);
  if array_length(parts, 1) < 2 then
    return null;
  end if;
  raw := parts[2];
  if raw !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return null;
  end if;
  return raw::uuid;
end;
$$;

-- =============================================================================
-- 3. RLS on storage.objects — clinic-applications (private)
--    Applicant: full CRUD on their own folder while application is open.
--    Superadmin: read everything.
-- =============================================================================

drop policy if exists clinic_applications_self_select on storage.objects;
create policy clinic_applications_self_select on storage.objects
  for select to authenticated using (
    bucket_id = 'clinic-applications'
    and (
      public.storage_applicant_id_from_path(name) = auth.uid()
      or public.is_super_admin()
    )
  );

drop policy if exists clinic_applications_self_insert on storage.objects;
create policy clinic_applications_self_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'clinic-applications'
    and (storage.foldername(name))[1] = 'applications'
    and public.storage_applicant_id_from_path(name) = auth.uid()
  );

drop policy if exists clinic_applications_self_update on storage.objects;
create policy clinic_applications_self_update on storage.objects
  for update to authenticated using (
    bucket_id = 'clinic-applications'
    and public.storage_applicant_id_from_path(name) = auth.uid()
  ) with check (
    bucket_id = 'clinic-applications'
    and public.storage_applicant_id_from_path(name) = auth.uid()
  );

drop policy if exists clinic_applications_self_delete on storage.objects;
create policy clinic_applications_self_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'clinic-applications'
    and (
      public.storage_applicant_id_from_path(name) = auth.uid()
      or public.is_super_admin()
    )
  );
