"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import {
  deletePublicAsset,
  getPublicAssetUrl,
  publicAssetPathFromUrl,
  uploadPublicAsset,
} from "@/lib/supabase/storage";

export type AddDoctorScheduleRow = {
  /** 0 = Sunday, 1 = Monday, … 6 = Saturday (Postgres convention). */
  weekday:    number;
  /** "HH:mm" */
  start_time: string;
  end_time:   string;
};

export type AddDoctorStatus = "active" | "on_leave" | "inactive";

export type AddDoctorInput = {
  displayName:        string;
  qualifications:     string[];   // comma-split + trimmed in the client
  registrationNumber: string;
  yearsExperience:    number | null;
  trainedAt:          string | null;
  /** E.164 phone, e.g. "+919876543210" */
  phone:              string | null;
  email:              string | null;
  primarySpecialty:   string | null;
  /** FK to public.departments (migration 0010). Optional for backwards-compat. */
  departmentId?:      string | null;
  visiting:           boolean;
  visitingNote:       string | null;
  status:             AddDoctorStatus;
  /** Lowercase locale codes: "en" | "hi" | "or" */
  languages:          string[];
  bio?:               string;
  schedule:           AddDoctorScheduleRow[];
  /** Optional profile photo. Raw base64 or data-URL. */
  photoBase64?:       string;
  photoMime?:         string;
  photoFileName?:     string;
};

export type AddDoctorResult =
  | { ok: true;  doctorId: string }
  | { ok: false; error: string };

/**
 * Inserts a doctor + their weekly availability into the live DB.
 *
 * Note: MOCK_DATA controls READS (so the UI can demo without a seeded DB), but
 * writes always go to the real database. Otherwise the dialog would appear to
 * succeed and the new row would vanish on the next refresh.
 */
export async function addDoctorAction(input: AddDoctorInput): Promise<AddDoctorResult> {
  const supabase = await serverClient();

  // Resolve the current user's clinic via clinic_users (RLS lets a staff user
  // read their own row). We need clinic_id for the NOT NULL FK on doctors.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: cu, error: cuErr } = await supabase
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (cuErr || !cu?.clinic_id) {
    return {
      ok: false,
      error: "Your account is not linked to a clinic. Ask an admin to add a clinic_users row for you.",
    };
  }

  // Insert the doctor with every captured field.
  const { data: doctor, error: dErr } = await supabase
    .from("doctors")
    .insert({
      clinic_id:         cu.clinic_id,
      display_name:      input.displayName,
      qualifications:    input.qualifications.join(", ") || null,
      registration_no:   input.registrationNumber || null,
      bio:               input.bio ?? null,
      years_experience:  input.yearsExperience,
      trained_at:        input.trainedAt,
      phone:             input.phone,
      email:             input.email,
      primary_specialty: input.primarySpecialty,
      department_id:     input.departmentId ?? null,
      visiting:          input.visiting,
      visiting_note:     input.visitingNote,
      status:            input.status,
      languages:         input.languages.length > 0 ? input.languages : ["en"],
      is_active:         input.status === "active",   // keep legacy flag in sync
    })
    .select("id")
    .single();

  if (dErr || !doctor) {
    return { ok: false, error: dErr?.message ?? "Failed to insert doctor." };
  }

  // Optional photo upload — best-effort. We don't fail the whole insert if the
  // upload fails; the doctor row exists and the admin can retry from Edit.
  if (input.photoBase64 && input.photoMime && input.photoFileName) {
    const photoUrl = await uploadDoctorPhoto(cu.clinic_id, input.photoBase64, input.photoMime, input.photoFileName);
    if (photoUrl) {
      await supabase.from("doctors").update({ photo_url: photoUrl }).eq("id", doctor.id);
    }
  }

  // Insert availability rows (best-effort — log but don't fail the action).
  if (input.schedule.length > 0) {
    const rows = input.schedule.map((s) => ({
      clinic_id:    cu.clinic_id,
      doctor_id:    doctor.id,
      weekday:      s.weekday,
      start_time:   s.start_time,
      end_time:     s.end_time,
      slot_minutes: 15,
    }));

    const { error: aErr } = await supabase.from("doctor_availability").insert(rows);
    if (aErr) {
      console.error("[addDoctor] availability insert failed:", aErr.message);
    }
  }

  revalidatePath("/admin/doctors");

  return { ok: true, doctorId: doctor.id };
}

// =============================================================================
// Update / deactivate
// =============================================================================

export type UpdateDoctorInput = {
  id:                 string;
  displayName?:       string;
  qualifications?:    string[];
  registrationNumber?: string;
  yearsExperience?:   number | null;
  trainedAt?:         string | null;
  phone?:             string | null;
  email?:             string | null;
  primarySpecialty?:  string | null;
  visiting?:          boolean;
  visitingNote?:      string | null;
  status?:            AddDoctorStatus;
  languages?:         string[];
  /**
   * Photo handling:
   *   - photoBase64 + photoMime + photoFileName → upload + replace photo_url
   *   - photoAction === 'remove' → null out photo_url, delete the storage object
   *   - omit all → leave existing photo alone
   */
  photoBase64?:       string;
  photoMime?:         string;
  photoFileName?:     string;
  photoAction?:       "keep" | "remove";
};

export async function updateDoctorAction(
  input: UpdateDoctorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await serverClient();

  // Resolve the doctor's current clinic + photo (so we know which bucket the
  // upload lands in and so we can clean up the previous photo on replace).
  const { data: current, error: curErr } = await supabase
    .from("doctors")
    .select("clinic_id, photo_url")
    .eq("id", input.id)
    .maybeSingle();
  if (curErr || !current) {
    return { ok: false, error: "Doctor not found." };
  }

  const patch: Record<string, unknown> = {};

  if (input.displayName        !== undefined) patch.display_name      = input.displayName;
  if (input.qualifications     !== undefined) patch.qualifications    = input.qualifications.join(", ") || null;
  if (input.registrationNumber !== undefined) patch.registration_no   = input.registrationNumber || null;
  if (input.yearsExperience    !== undefined) patch.years_experience  = input.yearsExperience;
  if (input.trainedAt          !== undefined) patch.trained_at        = input.trainedAt;
  if (input.phone              !== undefined) patch.phone             = input.phone;
  if (input.email              !== undefined) patch.email             = input.email;
  if (input.primarySpecialty   !== undefined) patch.primary_specialty = input.primarySpecialty;
  if (input.visiting           !== undefined) patch.visiting          = input.visiting;
  if (input.visitingNote       !== undefined) patch.visiting_note     = input.visitingNote;
  if (input.status             !== undefined) {
    patch.status    = input.status;
    patch.is_active = input.status === "active";
  }
  if (input.languages          !== undefined) patch.languages = input.languages;

  // Photo handling — upload-and-replace, or remove.
  let oldPhotoUrl: string | null = null;
  if (input.photoBase64 && input.photoMime && input.photoFileName) {
    const newUrl = await uploadDoctorPhoto(
      current.clinic_id,
      input.photoBase64,
      input.photoMime,
      input.photoFileName,
    );
    if (!newUrl) {
      return { ok: false, error: "Failed to upload photo." };
    }
    patch.photo_url = newUrl;
    oldPhotoUrl     = current.photo_url;
  } else if (input.photoAction === "remove") {
    patch.photo_url = null;
    oldPhotoUrl     = current.photo_url;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from("doctors").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  // Best-effort cleanup of the previous photo so the bucket doesn't accumulate
  // orphans. Failure here is not user-facing.
  if (oldPhotoUrl) {
    const oldPath = publicAssetPathFromUrl(oldPhotoUrl);
    if (oldPath) await deletePublicAsset(oldPath);
  }

  revalidatePath("/admin/doctors");
  revalidatePath(`/admin/doctors/${input.id}`);
  return { ok: true };
}

// =============================================================================
// Internal — shared photo upload routine for add + update flows.
// =============================================================================

async function uploadDoctorPhoto(
  clinicId:      string,
  base64:        string,
  contentType:   string,
  fileName:      string,
): Promise<string | null> {
  const stripped = base64.replace(/^data:[^;]+;base64,/, "");
  const buffer   = Buffer.from(stripped, "base64");
  const upload   = await uploadPublicAsset({
    clinicId,
    kind: "doctor-photo",
    fileName,
    contentType,
    data: buffer,
  });
  if (!upload.ok) {
    console.error("[uploadDoctorPhoto] failed:", upload.error);
    return null;
  }
  return getPublicAssetUrl(upload.path);
}

export async function deactivateDoctorAction(
  doctorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await serverClient();
  const { error } = await supabase
    .from("doctors")
    .update({ status: "inactive", is_active: false })
    .eq("id", doctorId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/doctors");
  revalidatePath(`/admin/doctors/${doctorId}`);
  return { ok: true };
}

// =============================================================================
// Block dates — write availability_overrides rows so the slot picker hides
// these dates / time-windows for the doctor.
// =============================================================================

const blockDatesSchema = z
  .object({
    doctorId:  z.string().uuid(),
    dates:     z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"))
                 .min(1, "Pick at least one date"),
    /** "HH:mm" — when set, only blocks within the window; otherwise blocks the whole day. */
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reason:    z.string().trim().max(200).optional(),
  })
  .refine(
    (v) => (v.startTime && v.endTime) ? v.endTime > v.startTime : true,
    { message: "End time must be after start time", path: ["endTime"] },
  )
  .refine(
    (v) => Boolean(v.startTime) === Boolean(v.endTime),
    { message: "Set both start and end time, or leave both blank for a full day", path: ["startTime"] },
  );

export type BlockDatesInput = z.infer<typeof blockDatesSchema>;

export async function blockDoctorDatesAction(
  rawInput: BlockDatesInput,
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const parsed = blockDatesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const supabase = await serverClient();

  // Resolve the caller's clinic so we can stamp clinic_id (NOT NULL FK).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cu?.clinic_id) {
    return { ok: false, error: "Your account is not linked to a clinic." };
  }

  // Dedupe in case the caller sent the same date twice.
  const uniqueDates = Array.from(new Set(input.dates));

  const rows = uniqueDates.map((date) => ({
    clinic_id:  cu.clinic_id,
    doctor_id:  input.doctorId,
    date,
    is_blocked: true,
    start_time: input.startTime ?? null,
    end_time:   input.endTime ?? null,
    reason:     input.reason ?? null,
  }));

  const { error, data } = await supabase
    .from("availability_overrides")
    .insert(rows)
    .select("id");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/doctors/${input.doctorId}`);
  revalidatePath("/admin/calendar");

  return { ok: true, inserted: data?.length ?? 0 };
}

// =============================================================================
// Reorder doctors — drag-and-drop on the list flips display_order for each
// affected row. Accepts the full sequence so partial drags don't leave stale
// ranks in the middle of the list.
// =============================================================================

const reorderSchema = z.object({
  /** Doctor IDs in the new visual order (top → bottom). */
  doctorIds: z.array(z.string().uuid()).min(1),
});

export async function reorderDoctorsAction(
  rawInput: z.infer<typeof reorderSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reorderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await serverClient();

  // Issue the updates in parallel. RLS scopes each update to the caller's
  // clinic — if someone crafts an ID for another clinic, the WHERE clause
  // simply matches zero rows.
  const results = await Promise.all(
    parsed.data.doctorIds.map((id, idx) =>
      supabase.from("doctors").update({ display_order: idx + 1 }).eq("id", id),
    ),
  );
  const firstErr = results.find((r) => r.error)?.error;
  if (firstErr) return { ok: false, error: firstErr.message };

  revalidatePath("/admin/doctors");
  return { ok: true };
}
