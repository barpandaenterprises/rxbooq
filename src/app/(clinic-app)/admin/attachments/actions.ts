"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import {
  deleteClinicFile,
  getSignedClinicFileUrl,
  uploadClinicFile,
  type ClinicFileKind,
} from "@/lib/supabase/storage";

// =============================================================================
// Upload an attachment for a patient (optionally tied to an appointment).
// =============================================================================

const KIND = z.enum([
  "xray",
  "prescription_pdf",
  "treatment_plan",
  "receipt",
  "lab_report",
  "consent",
  "other",
]);

const uploadAttachmentSchema = z.object({
  patientId:     z.string().min(1, "patientId required"),
  appointmentId: z.string().optional(),
  kind:          KIND,
  fileName:      z.string().min(1),
  /** Data-URL-style or raw base64 of the file contents. */
  fileBase64:    z.string().min(1),
  mimeType:      z.string().min(1),
  notes:         z.string().optional(),
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;

export type UploadAttachmentResult =
  | { ok: true;  mock: true }
  | { ok: true;  mock: false; attachmentId: string; storagePath: string }
  | { ok: false; error: string };

export async function uploadAttachmentAction(
  rawInput: UploadAttachmentInput,
): Promise<UploadAttachmentResult> {
  const parsed = uploadAttachmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (useMockData()) return { ok: true, mock: true };

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cu } = await supabase
    .from("clinic_users")
    .select("id, clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cu?.clinic_id) {
    return { ok: false, error: "Your account is not linked to a clinic." };
  }

  // Decode base64 (accepts both raw and data-URL-prefixed).
  const stripped = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
  const buffer   = Buffer.from(stripped, "base64");

  const upload = await uploadClinicFile({
    clinicId:    cu.clinic_id,
    kind:        input.kind as ClinicFileKind,
    fileName:    input.fileName,
    contentType: input.mimeType,
    data:        buffer,
  });
  if (!upload.ok) return upload;

  const { data: row, error: rowErr } = await supabase
    .from("visit_attachments")
    .insert({
      clinic_id:        cu.clinic_id,
      patient_id:       input.patientId,
      appointment_id:   input.appointmentId ?? null,
      kind:             input.kind,
      file_name:        input.fileName,
      file_size_bytes:  buffer.byteLength,
      mime_type:        input.mimeType,
      storage_path:     upload.path,
      notes:            input.notes ?? null,
      created_by:       cu.id,
    })
    .select("id, storage_path")
    .single();

  if (rowErr || !row) {
    // Clean up the storage object so we don't leave orphans.
    await deleteClinicFile(upload.path);
    return { ok: false, error: rowErr?.message ?? "Failed to record attachment." };
  }

  revalidatePath(`/admin/patients/${input.patientId}`);

  return {
    ok:          true,
    mock:        false,
    attachmentId: row.id,
    storagePath:  row.storage_path,
  };
}

// =============================================================================
// Generate a short-lived signed URL for an attachment.
// RLS scopes the lookup to the user's clinic.
// =============================================================================

export async function getAttachmentSignedUrlAction(
  attachmentId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (useMockData()) {
    return { ok: true, url: "/samples/sample-rx.jpg" };
  }

  const supabase = await serverClient();
  const { data: row, error } = await supabase
    .from("visit_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();

  if (error || !row?.storage_path) {
    return { ok: false, error: "Attachment not found or not visible." };
  }

  const url = await getSignedClinicFileUrl(row.storage_path, 3600);
  if (!url) return { ok: false, error: "Failed to sign URL." };

  return { ok: true, url };
}

// =============================================================================
// Delete an attachment (DB row + storage file).
// =============================================================================

export async function deleteAttachmentAction(
  attachmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (useMockData()) return { ok: true };

  const supabase = await serverClient();
  const { data: row } = await supabase
    .from("visit_attachments")
    .select("id, patient_id, storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Attachment not found." };

  const { error } = await supabase
    .from("visit_attachments")
    .delete()
    .eq("id", attachmentId);
  if (error) return { ok: false, error: error.message };

  await deleteClinicFile(row.storage_path);

  revalidatePath(`/admin/patients/${row.patient_id}`);
  return { ok: true };
}
