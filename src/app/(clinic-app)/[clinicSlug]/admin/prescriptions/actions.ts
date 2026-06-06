"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { deleteClinicFile, uploadClinicFile } from "@/lib/supabase/storage";

const itemSchema = z.object({
  medication:   z.string().trim().min(1, "Medication name required"),
  dosage:       z.string().trim().min(1, "Dosage required"),
  frequency:    z.string().trim().min(1, "Frequency required"),
  duration:     z.string().trim().min(1, "Duration required"),
  instructions: z.string().optional(),
});

const createPrescriptionSchema = z.object({
  patientId:      z.string().min(1),
  doctorId:       z.string().min(1),
  appointmentId:  z.string().optional(),
  items:          z.array(itemSchema).min(1, "Add at least one medication"),
  notes:          z.string().optional(),
  source:         z.enum(["handwritten", "template", "manual"]).default("manual"),
  templateId:    z.string().optional(),
  ocrConfidence:  z.number().min(0).max(1).optional(),
  /** Optional photo to attach for a handwritten Rx. Raw base64 or data URL. */
  photoBase64:    z.string().optional(),
  photoMime:      z.string().optional(),
  photoFileName:  z.string().optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export type CreatePrescriptionResult =
  | { ok: true;  prescriptionId: string }
  | { ok: false; error: string };

export async function createPrescriptionAction(
  rawInput: CreatePrescriptionInput,
): Promise<CreatePrescriptionResult> {
  const parsed = createPrescriptionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

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

  // ---- 1. Optional photo upload + attachment row (for handwritten Rx) -----
  let sourcePhotoId: string | null = null;
  let uploadedPath:  string | null = null;
  if (input.photoBase64 && input.photoMime && input.photoFileName) {
    const stripped = input.photoBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer   = Buffer.from(stripped, "base64");

    const upload = await uploadClinicFile({
      clinicId:    cu.clinic_id,
      kind:        "prescription_pdf",
      fileName:    input.photoFileName,
      contentType: input.photoMime,
      data:        buffer,
    });

    if (upload.ok) {
      uploadedPath = upload.path;
      const { data: att } = await supabase
        .from("visit_attachments")
        .insert({
          clinic_id:       cu.clinic_id,
          patient_id:      input.patientId,
          appointment_id:  input.appointmentId ?? null,
          kind:            "prescription_pdf",
          file_name:       input.photoFileName,
          file_size_bytes: buffer.byteLength,
          mime_type:       input.photoMime,
          storage_path:    upload.path,
          created_by:      cu.id,
        })
        .select("id")
        .single();
      sourcePhotoId = att?.id ?? null;
    }
  }

  // ---- 2. Insert prescription row -----------------------------------------
  const { data: rx, error: rxErr } = await supabase
    .from("prescriptions")
    .insert({
      clinic_id:        cu.clinic_id,
      patient_id:       input.patientId,
      doctor_id:        input.doctorId,
      appointment_id:   input.appointmentId ?? null,
      source:           input.source,
      source_photo_id:  sourcePhotoId,
      template_id:      input.templateId ?? null,
      ocr_confidence:   input.ocrConfidence ?? null,
      notes:            input.notes ?? null,
      created_by:       cu.id,
    })
    .select("id")
    .single();

  if (rxErr || !rx) {
    // Rollback uploaded photo if the Rx couldn't be saved.
    if (uploadedPath) await deleteClinicFile(uploadedPath);
    return { ok: false, error: rxErr?.message ?? "Failed to save prescription." };
  }

  // ---- 3. Insert items ----------------------------------------------------
  const itemRows = input.items.map((it, idx) => ({
    prescription_id: rx.id,
    position:        idx,
    medication:      it.medication,
    dosage:          it.dosage,
    frequency:       it.frequency,
    duration:        it.duration,
    instructions:    it.instructions ?? null,
  }));

  const { error: itemsErr } = await supabase.from("prescription_items").insert(itemRows);
  if (itemsErr) {
    // Items failed — Rx row exists but is empty. Log; UI can edit later.
    console.error("[createPrescription] items insert failed:", itemsErr.message);
  }

  await revalidateActiveClinicPath(`/admin/patients/${input.patientId}`);

  return { ok: true, prescriptionId: rx.id };
}
