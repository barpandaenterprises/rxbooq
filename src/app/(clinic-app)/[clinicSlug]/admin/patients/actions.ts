"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";

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

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cu?.clinic_id) return { ok: false, error: "Your account is not linked to a clinic." };

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      clinic_id:       cu.clinic_id,
      full_name:       input.fullName,
      phone_e164:      input.phoneE164,
      language:        input.language,
      date_of_birth:   input.dateOfBirth ?? null,
      gender:          input.gender ?? null,
      tags:            input.tags,
      whatsapp_opt_in: input.whatsappOptIn,
      notes:           input.notes ?? null,
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
  const supabase = await serverClient();
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

  const { error } = await supabase.from("patients").update(patch).eq("id", input.id);
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
  const supabase = await serverClient();

  const { data: current, error: rErr } = await supabase
    .from("patients")
    .select("tags")
    .eq("id", patientId)
    .maybeSingle();
  if (rErr || !current) return { ok: false, error: rErr?.message ?? "Patient not found." };

  const existingTags: string[] = current.tags ?? [];
  if (existingTags.includes("Archived")) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("patients")
    .update({ tags: [...existingTags, "Archived"] })
    .eq("id", patientId);
  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/patients");
  await revalidateActiveClinicPath(`/admin/patients/${patientId}`);
  return { ok: true };
}
