"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { doctorCanAccessPatient } from "@/lib/data/doctor-scope";

const E164 = z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164 like +919876543210");

// =============================================================================
// Create
// =============================================================================

const createPatientSchema = z.object({
  fullName:      z.string().trim().min(2, "Name is required"),
  phoneE164:     E164,
  language:      z.enum(["en", "hi", "or"]).default("en"),
  dateOfBirth:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender:        z.enum(["M", "F", "O"]).optional(),
  tags:          z.array(z.string()).optional().default([]),
  whatsappOptIn: z.boolean().default(true),
  notes:         z.string().optional(),
  /** Optional explicit assignment (admins/receptionists pick; doctors get self). */
  assignedDoctorId: z.string().uuid().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export async function createPatientAction(
  rawInput: CreatePatientInput,
): Promise<{ ok: true; patientId: string } | { ok: false; error: string }> {
  const parsed = createPatientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const gate = await requireRole(["clinic_admin", "receptionist", "doctor"]);
  if (!gate.ok) return gate;

  // A doctor's new patients default to being assigned to themselves; admins
  // and receptionists may assign explicitly (or leave unassigned).
  const assignedDoctorId =
    gate.ctx.role === "doctor" ? gate.ctx.doctorId : input.assignedDoctorId ?? null;

  const supabase = await serverClient();
  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      clinic_id:          gate.ctx.clinicId,
      full_name:          input.fullName,
      phone_e164:         input.phoneE164,
      language:           input.language,
      date_of_birth:      input.dateOfBirth ?? null,
      gender:             input.gender ?? null,
      tags:               input.tags,
      whatsapp_opt_in:    input.whatsappOptIn,
      notes:              input.notes ?? null,
      assigned_doctor_id: assignedDoctorId,
    })
    .select("id")
    .single();

  if (error || !patient) {
    return { ok: false, error: error?.message ?? "Failed to create patient." };
  }

  await revalidateActiveClinicPath("/admin/patients");
  return { ok: true, patientId: patient.id };
}

// =============================================================================
// Update
// =============================================================================

export type UpdatePatientInput = {
  id:             string;
  fullName?:      string;
  phoneE164?:     string;
  language?:      "en" | "hi" | "or";
  dateOfBirth?:   string | null;
  gender?:        "M" | "F" | "O" | null;
  tags?:          string[];
  whatsappOptIn?: boolean;
  notes?:         string | null;
};

export async function updatePatientAction(
  input: UpdatePatientInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireRole(["clinic_admin", "receptionist", "doctor"]);
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  // A doctor may only edit a patient they can access (assigned or has-appt).
  if (gate.ctx.role === "doctor") {
    if (!gate.ctx.doctorId) return { ok: false, error: "Your login isn't linked to a doctor profile yet." };
    const allowed = await doctorCanAccessPatient(supabase, gate.ctx.clinicId, gate.ctx.doctorId, input.id);
    if (!allowed) return { ok: false, error: "You don't have access to this patient." };
  }

  const patch: Record<string, unknown> = {};

  if (input.fullName      !== undefined) patch.full_name       = input.fullName;
  if (input.phoneE164     !== undefined) patch.phone_e164      = input.phoneE164;
  if (input.language      !== undefined) patch.language        = input.language;
  if (input.dateOfBirth   !== undefined) patch.date_of_birth   = input.dateOfBirth;
  if (input.gender        !== undefined) patch.gender          = input.gender;
  if (input.tags          !== undefined) patch.tags            = input.tags;
  if (input.whatsappOptIn !== undefined) patch.whatsapp_opt_in = input.whatsappOptIn;
  if (input.notes         !== undefined) patch.notes           = input.notes;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from("patients")
    .update(patch)
    .eq("id", input.id)
    .eq("clinic_id", gate.ctx.clinicId);
  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/patients");
  await revalidateActiveClinicPath(`/admin/patients/${input.id}`);
  return { ok: true };
}

// =============================================================================
// Archive (soft-delete via a tag)
// =============================================================================
// We don't have an is_active flag on patients, so we mark them with an
// "Archived" tag. Filters can hide archived rows.

export async function archivePatientAction(
  patientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireRole(["clinic_admin", "receptionist"]);
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  const { data: current, error: rErr } = await supabase
    .from("patients")
    .select("tags")
    .eq("id", patientId)
    .eq("clinic_id", gate.ctx.clinicId)
    .maybeSingle();
  if (rErr || !current) return { ok: false, error: rErr?.message ?? "Patient not found." };

  const existingTags: string[] = current.tags ?? [];
  if (existingTags.includes("Archived")) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("patients")
    .update({ tags: [...existingTags, "Archived"] })
    .eq("id", patientId)
    .eq("clinic_id", gate.ctx.clinicId);
  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/patients");
  await revalidateActiveClinicPath(`/admin/patients/${patientId}`);
  return { ok: true };
}

// =============================================================================
// Assign / reassign a patient's primary doctor (admins + receptionists).
// =============================================================================

const assignDoctorSchema = z.object({
  patientId: z.string().uuid(),
  doctorId:  z.string().uuid().nullable(),
});

export async function assignPatientDoctorAction(
  rawInput: z.infer<typeof assignDoctorSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = assignDoctorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireRole(["clinic_admin", "receptionist"]);
  if (!gate.ok) return gate;
  const supabase = await serverClient();

  // If assigning (not clearing), the doctor must belong to this clinic.
  if (parsed.data.doctorId) {
    const { data: doc } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", parsed.data.doctorId)
      .eq("clinic_id", gate.ctx.clinicId)
      .maybeSingle();
    if (!doc) return { ok: false, error: "Doctor not found in this clinic." };
  }

  const { error } = await supabase
    .from("patients")
    .update({ assigned_doctor_id: parsed.data.doctorId })
    .eq("id", parsed.data.patientId)
    .eq("clinic_id", gate.ctx.clinicId);
  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/patients");
  await revalidateActiveClinicPath(`/admin/patients/${parsed.data.patientId}`);
  return { ok: true };
}
