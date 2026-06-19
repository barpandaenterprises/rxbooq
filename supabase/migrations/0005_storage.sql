-- =============================================================================
-- 0005_storage.sql
-- Supabase Storage: two buckets + RLS on storage.objects.
--
-- Buckets:
--   clinic-files   private — medical files (xray, rx photos, plans, receipts,
--                  lab reports, consent). Path: clinics/{clinic_id}/{kind}/{file}
--   public-assets  public  — clinic logos, doctor photos for marketing pages.
--                  Path: clinics/{clinic_id}/{kind}/{file}
-- =============================================================================

-- =============================================================================
-- 1. Buckets (idempotent)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clinic-files',  'clinic-files',  false, 26214400,            -- 25 MiB
     array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('public-assets', 'public-assets', true,  5242880,             -- 5  MiB
     array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 2. Path-extraction helper
--    Convention: clinics/{clinic_id}/{kind}/{file_name}
--    storage.foldername(name) returns text[] of path segments excluding file.
--    [1] is the literal 'clinics', [2] is the clinic_id.
-- =============================================================================

create or replace function public.storage_clinic_id_from_path(object_name text)
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
  -- Guard against non-UUID segments so a bad path returns null instead of error.
  if raw !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return null;
  end if;
  return raw::uuid;
end;
$$;

-- =============================================================================
-- 3. RLS on storage.objects — clinic-files (private)
-- =============================================================================

-- Staff read their own clinic's files
drop policy if exists clinic_files_staff_select on storage.objects;
create policy clinic_files_staff_select on storage.objects
  for select to authenticated using (
    bucket_id = 'clinic-files'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );

-- Staff insert: enforce path starts with clinics/{their clinic_id}/
drop policy if exists clinic_files_staff_insert on storage.objects;
create policy clinic_files_staff_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'clinic-files'
    and (storage.foldername(name))[1] = 'clinics'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );

drop policy if exists clinic_files_staff_update on storage.objects;
create policy clinic_files_staff_update on storage.objects
  for update to authenticated using (
    bucket_id = 'clinic-files'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  ) with check (
    bucket_id = 'clinic-files'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );

drop policy if exists clinic_files_staff_delete on storage.objects;
create policy clinic_files_staff_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'clinic-files'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );

-- Patient self-access: read only files attached to their own visit_attachments row
drop policy if exists clinic_files_patient_self_select on storage.objects;
create policy clinic_files_patient_self_select on storage.objects
  for select to authenticated using (
    bucket_id = 'clinic-files'
    and public.current_patient_id() is not null
    and exists (
      select 1 from public.visit_attachments va
      where va.storage_path = storage.objects.name
        and va.patient_id  = public.current_patient_id()
    )
  );

-- =============================================================================
-- 4. RLS on storage.objects — public-assets (public read, staff write)
-- =============================================================================

-- Anyone (including anon) can read public assets
drop policy if exists public_assets_anon_select on storage.objects;
create policy public_assets_anon_select on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'public-assets'
  );

drop policy if exists public_assets_staff_insert on storage.objects;
create policy public_assets_staff_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = 'clinics'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );

drop policy if exists public_assets_staff_update on storage.objects;
create policy public_assets_staff_update on storage.objects
  for update to authenticated using (
    bucket_id = 'public-assets'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  ) with check (
    bucket_id = 'public-assets'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );

drop policy if exists public_assets_staff_delete on storage.objects;
create policy public_assets_staff_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'public-assets'
    and (
      public.storage_clinic_id_from_path(name) = public.current_clinic_id()
      or public.is_super_admin()
    )
  );
