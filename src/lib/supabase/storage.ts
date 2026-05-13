/**
 * Storage helpers — uploads and signed URLs for the two clinic buckets.
 *
 * Path convention (enforced by storage RLS in 0005):
 *   clinics/{clinic_id}/{kind}/{uuid}-{safe-file-name}
 *
 * Both buckets use the same prefix shape. The first segment ("clinics") is
 * verified by RLS at insert time, the second segment is the clinic_id RLS
 * scopes uploads to. Writes use serviceClient (server-only) because the
 * upload path runs through trusted server code that already knows the clinic.
 */

import { randomUUID } from "node:crypto";
import { serviceClient } from "./server";

export const CLINIC_FILES_BUCKET  = "clinic-files";
export const PUBLIC_ASSETS_BUCKET = "public-assets";

export type ClinicFileKind =
  | "xray"
  | "prescription_pdf"
  | "treatment_plan"
  | "receipt"
  | "lab_report"
  | "consent"
  | "other";

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export function buildClinicFilePath(
  clinicId: string,
  kind: ClinicFileKind,
  fileName: string,
): string {
  return `clinics/${clinicId}/${kind}/${randomUUID()}-${safeFileName(fileName)}`;
}

export function buildPublicAssetPath(
  clinicId: string,
  kind: string,
  fileName: string,
): string {
  return `clinics/${clinicId}/${kind}/${randomUUID()}-${safeFileName(fileName)}`;
}

// =============================================================================
// Private clinic-files bucket
// =============================================================================

export type UploadClinicFileResult =
  | { ok: true;  path: string }
  | { ok: false; error: string };

export async function uploadClinicFile(opts: {
  clinicId:    string;
  kind:        ClinicFileKind;
  fileName:    string;
  contentType: string;
  data:        ArrayBuffer | Uint8Array | Buffer;
}): Promise<UploadClinicFileResult> {
  const supabase = serviceClient();
  const path     = buildClinicFilePath(opts.clinicId, opts.kind, opts.fileName);

  const { error } = await supabase.storage
    .from(CLINIC_FILES_BUCKET)
    .upload(path, opts.data, {
      contentType: opts.contentType,
      upsert:      false,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function getSignedClinicFileUrl(
  path: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const supabase = serviceClient();
  const { data, error } = await supabase.storage
    .from(CLINIC_FILES_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteClinicFile(path: string): Promise<boolean> {
  const supabase = serviceClient();
  const { error } = await supabase.storage.from(CLINIC_FILES_BUCKET).remove([path]);
  return !error;
}

// =============================================================================
// Public-assets bucket (clinic logos, doctor photos)
// =============================================================================

export async function uploadPublicAsset(opts: {
  clinicId:    string;
  kind:        "logo" | "doctor-photo" | "hero";
  fileName:    string;
  contentType: string;
  data:        ArrayBuffer | Uint8Array | Buffer;
}): Promise<UploadClinicFileResult> {
  const supabase = serviceClient();
  const path     = buildPublicAssetPath(opts.clinicId, opts.kind, opts.fileName);

  const { error } = await supabase.storage
    .from(PUBLIC_ASSETS_BUCKET)
    .upload(path, opts.data, {
      contentType: opts.contentType,
      upsert:      false,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export function getPublicAssetUrl(path: string): string {
  const supabase = serviceClient();
  return supabase.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
}
