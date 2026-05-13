"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";

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
  visiting:           boolean;
  visitingNote:       string | null;
  status:             AddDoctorStatus;
  /** Lowercase locale codes: "en" | "hi" | "or" */
  languages:          string[];
  bio?:               string;
  schedule:           AddDoctorScheduleRow[];
};

export type AddDoctorResult =
  | { ok: true;  mock: true }
  | { ok: true;  mock: false; doctorId: string }
  | { ok: false; error: string };

/**
 * Inserts a doctor + their weekly availability into the live DB.
 * In MOCK_DATA mode returns { ok: true, mock: true } without touching the DB —
 * the dialog falls back to its local-state update for the demo flow.
 */
export async function addDoctorAction(input: AddDoctorInput): Promise<AddDoctorResult> {
  if (useMockData()) {
    return { ok: true, mock: true };
  }

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

  return { ok: true, mock: false, doctorId: doctor.id };
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
};

export async function updateDoctorAction(
  input: UpdateDoctorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (useMockData()) return { ok: true };

  const supabase = await serverClient();
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

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from("doctors").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/doctors");
  revalidatePath(`/admin/doctors/${input.id}`);
  return { ok: true };
}

export async function deactivateDoctorAction(
  doctorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (useMockData()) return { ok: true };

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
