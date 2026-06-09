"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { requireRole, requireClinicAdmin } from "@/lib/auth/require-role";
import { linkAuthUserToClinic } from "@/lib/auth/link-clinic-user";
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
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  // Insert the doctor with every captured field.
  const { data: doctor, error: dErr } = await supabase
    .from("doctors")
    .insert({
      clinic_id:         gate.ctx.clinicId,
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
    const photoUrl = await uploadDoctorPhoto(gate.ctx.clinicId, input.photoBase64, input.photoMime, input.photoFileName);
    if (photoUrl) {
      await supabase.from("doctors").update({ photo_url: photoUrl }).eq("id", doctor.id);
    }
  }

  // Insert availability rows (best-effort — log but don't fail the action).
  if (input.schedule.length > 0) {
    const rows = input.schedule.map((s) => ({
      clinic_id:    gate.ctx.clinicId,
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

  await revalidateActiveClinicPath("/admin/doctors");

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
  /** FK to public.departments. "" / null clears the assignment (unassigned). */
  departmentId?:      string | null;
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
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  // Resolve the doctor's current clinic + photo (so we know which bucket the
  // upload lands in and so we can clean up the previous photo on replace).
  // Scoped to the admin's clinic so a crafted id can't touch another tenant.
  const { data: current, error: curErr } = await supabase
    .from("doctors")
    .select("clinic_id, photo_url")
    .eq("id", input.id)
    .eq("clinic_id", gate.ctx.clinicId)
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
  if (input.departmentId       !== undefined) patch.department_id     = input.departmentId || null;
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

  const { error } = await supabase
    .from("doctors")
    .update(patch)
    .eq("id", input.id)
    .eq("clinic_id", gate.ctx.clinicId);
  if (error) return { ok: false, error: error.message };

  // Best-effort cleanup of the previous photo so the bucket doesn't accumulate
  // orphans. Failure here is not user-facing.
  if (oldPhotoUrl) {
    const oldPath = publicAssetPathFromUrl(oldPhotoUrl);
    if (oldPath) await deletePublicAsset(oldPath);
  }

  await revalidateActiveClinicPath("/admin/doctors");
  await revalidateActiveClinicPath(`/admin/doctors/${input.id}`);
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
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;
  const supabase = await serverClient();
  const { error } = await supabase
    .from("doctors")
    .update({ status: "inactive", is_active: false })
    .eq("id", doctorId)
    .eq("clinic_id", gate.ctx.clinicId);
  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/doctors");
  await revalidateActiveClinicPath(`/admin/doctors/${doctorId}`);
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

  // Admins block any doctor; a doctor may only block their own dates.
  const gate = await requireRole(["clinic_admin", "doctor"]);
  if (!gate.ok) return gate;
  if (gate.ctx.role === "doctor" && input.doctorId !== gate.ctx.doctorId) {
    return { ok: false, error: "You can only block dates on your own calendar." };
  }

  const supabase = await serverClient();

  // Dedupe in case the caller sent the same date twice.
  const uniqueDates = Array.from(new Set(input.dates));

  const rows = uniqueDates.map((date) => ({
    clinic_id:  gate.ctx.clinicId,
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

  await revalidateActiveClinicPath(`/admin/doctors/${input.doctorId}`);
  await revalidateActiveClinicPath("/admin/calendar");

  return { ok: true, inserted: data?.length ?? 0 };
}

// =============================================================================
// Update weekly hours — replace all doctor_availability rows for this doctor.
//
// The booking-slot picker derives working windows from `doctor_availability`,
// so until at least one row exists for a doctor every date shows "no slots".
// This action lets the admin edit the weekly grid from the Schedule tab.
//
// Pattern: delete-then-insert in a single round trip. Cleaner than diffing
// and the table is tiny (≤ 14 rows per doctor in the common case).
// =============================================================================

const scheduleRowSchema = z.object({
  weekday:    z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  end_time:   z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
});

const updateScheduleSchema = z.object({
  doctorId: z.string().uuid(),
  /** Replaces ALL existing rows for this doctor. Empty array = clear schedule. */
  rows:     z.array(scheduleRowSchema).max(50),
}).refine(
  (v) => v.rows.every((r) => r.end_time > r.start_time),
  { message: "Each window's end time must be after its start time", path: ["rows"] },
);

export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

export async function updateDoctorScheduleAction(
  rawInput: UpdateScheduleInput,
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const parsed = updateScheduleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  // Verify the target doctor belongs to the admin's clinic (clear error; RLS
  // would also stop a cross-tenant write).
  const { data: doc } = await supabase
    .from("doctors")
    .select("id, clinic_id")
    .eq("id", input.doctorId)
    .eq("clinic_id", gate.ctx.clinicId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Doctor not found in this clinic." };

  // 1. Delete all existing rows for this doctor.
  const { error: delErr } = await supabase
    .from("doctor_availability")
    .delete()
    .eq("doctor_id", input.doctorId);
  if (delErr) return { ok: false, error: delErr.message };

  // 2. Insert the new set. Empty input = doctor has no hours (a valid "off
  //    indefinitely" state — booking will show no slots for any date).
  let inserted = 0;
  if (input.rows.length > 0) {
    const rows = input.rows.map((r) => ({
      clinic_id:    gate.ctx.clinicId,
      doctor_id:    input.doctorId,
      weekday:      r.weekday,
      start_time:   r.start_time,
      end_time:     r.end_time,
      slot_minutes: 15,
    }));
    const { data, error: insErr } = await supabase
      .from("doctor_availability")
      .insert(rows)
      .select("id");
    if (insErr) return { ok: false, error: insErr.message };
    inserted = data?.length ?? 0;
  }

  await revalidateActiveClinicPath(`/admin/doctors/${input.doctorId}`);
  await revalidateActiveClinicPath("/admin/calendar");
  await revalidateActiveClinicPath("/admin/today");

  return { ok: true, inserted };
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
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  // Issue the updates in parallel, double-scoped to the admin's clinic — a
  // crafted ID for another clinic simply matches zero rows.
  const results = await Promise.all(
    parsed.data.doctorIds.map((id, idx) =>
      supabase
        .from("doctors")
        .update({ display_order: idx + 1 })
        .eq("id", id)
        .eq("clinic_id", gate.ctx.clinicId),
    ),
  );
  const firstErr = results.find((r) => r.error)?.error;
  if (firstErr) return { ok: false, error: firstErr.message };

  await revalidateActiveClinicPath("/admin/doctors");
  return { ok: true };
}

// =============================================================================
// Create / invite a login for a doctor profile.
//
// Creates (or reuses) an auth user and links it to this clinic with role
// 'doctor' and doctor_id pointing at the profile. The doctor can then sign in
// and will see only their own data. Admins only.
// =============================================================================

const createLoginSchema = z.object({
  doctorId:    z.string().uuid(),
  email:       z.string().trim().email("Enter a valid email"),
  displayName: z.string().trim().min(2, "Display name is required"),
  phone:       z.string().trim().optional(),
});

export type CreateDoctorLoginInput = z.infer<typeof createLoginSchema>;

export async function createDoctorLoginAction(
  rawInput: CreateDoctorLoginInput,
): Promise<{ ok: true; alreadyHadLogin: boolean } | { ok: false; error: string }> {
  const parsed = createLoginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const admin = serviceClient();

  // The profile must belong to the admin's clinic.
  const { data: doc } = await admin
    .from("doctors")
    .select("id")
    .eq("id", input.doctorId)
    .eq("clinic_id", gate.ctx.clinicId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Doctor profile not found in this clinic." };

  // Create the auth user (or reuse an existing one with this email).
  let authUserId: string;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    input.email,
    { data: { display_name: input.displayName } },
  );
  if (invited?.user) {
    authUserId = invited.user.id;
  } else if (inviteErr?.message?.toLowerCase().includes("already")) {
    const { data: users } = await admin.auth.admin.listUsers();
    const existing = users?.users?.find((u) => u.email?.toLowerCase() === input.email.toLowerCase());
    if (!existing) return { ok: false, error: inviteErr?.message ?? "Failed to invite user." };
    authUserId = existing.id;
  } else {
    return { ok: false, error: inviteErr?.message ?? "Failed to invite user." };
  }

  // Is this auth user already a member of this clinic? This is common when the
  // founder/admin uses their own email as a doctor's login — they already have
  // a clinic_users row, so a plain insert would trip the (clinic_id,
  // auth_user_id) unique constraint. In that case just link the doctor profile
  // onto their existing row (keeping their current role — don't demote an admin).
  const { data: existingMember } = await admin
    .from("clinic_users")
    .select("id, doctor_id")
    .eq("clinic_id", gate.ctx.clinicId)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingMember) {
    if (existingMember.doctor_id && existingMember.doctor_id !== input.doctorId) {
      return { ok: false, error: "This login is already linked to a different doctor profile." };
    }
    if (existingMember.doctor_id !== input.doctorId) {
      const { error: updErr } = await admin
        .from("clinic_users")
        .update({ doctor_id: input.doctorId })
        .eq("id", existingMember.id)
        .eq("clinic_id", gate.ctx.clinicId);
      if (updErr) {
        if ((updErr as { code?: string }).code === "23505") {
          return { ok: false, error: "That doctor profile already has a login linked." };
        }
        return { ok: false, error: updErr.message };
      }
    }
    await revalidateActiveClinicPath("/admin/doctors");
    await revalidateActiveClinicPath("/admin/settings/team");
    return { ok: true, alreadyHadLogin: true };
  }

  const linked = await linkAuthUserToClinic({
    authUserId,
    email:       input.email,
    clinicId:    gate.ctx.clinicId,
    role:        "doctor",
    displayName: input.displayName,
    phone:       input.phone,
    doctorId:    input.doctorId,
  });
  if (!linked.ok) return linked;

  await revalidateActiveClinicPath("/admin/doctors");
  await revalidateActiveClinicPath("/admin/settings/team");
  return { ok: true, alreadyHadLogin: false };
}

// =============================================================================
// Resend the set-password / sign-in link for a doctor whose login already
// exists. Emails a password-reset link via Supabase Auth (the same channel
// used for the original invite). Admins only.
// =============================================================================

const resendLoginSchema = z.object({
  doctorId: z.string().uuid(),
});

export async function resendDoctorLoginAction(
  rawInput: z.infer<typeof resendLoginSchema>,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const parsed = resendLoginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const admin = serviceClient();

  // Find the doctor-role login linked to this profile, scoped to the clinic.
  const { data: link } = await admin
    .from("clinic_users")
    .select("email")
    .eq("clinic_id", gate.ctx.clinicId)
    .eq("role", "doctor")
    .eq("doctor_id", parsed.data.doctorId)
    .maybeSingle();
  if (!link?.email) {
    return { ok: false, error: "No login is linked to this doctor yet." };
  }

  // resetPasswordForEmail emails a link the doctor can use to set/reset their
  // password — works whether or not they completed the original invite.
  const supabase = await serverClient();
  const { error } = await supabase.auth.resetPasswordForEmail(link.email);
  if (error) return { ok: false, error: error.message };

  return { ok: true, email: link.email };
}
