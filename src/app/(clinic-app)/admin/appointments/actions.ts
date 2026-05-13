"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { sendBookingConfirmation } from "@/lib/wa/booking";

// =============================================================================
// Schema
// =============================================================================

const E164  = z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164 like +919876543210");
const IsoTs = z.string().datetime({ offset: true });

const createAppointmentSchema = z
  .object({
    /** Optional — when provided, we book against this existing patient. */
    patientId:  z.string().uuid().optional(),
    /** When patientId is omitted, we find-or-create from these details. */
    patient: z
      .object({
        fullName:  z.string().trim().min(2),
        phoneE164: E164,
        language:  z.enum(["en", "hi", "or"]).default("en"),
      })
      .optional(),
    doctorId:     z.string().uuid(),
    serviceId:    z.string().uuid(),
    startsAt:     IsoTs,
    notes:        z.string().optional(),
    sendWhatsApp: z.boolean().default(false),
  })
  .refine(
    (v) => v.patientId !== undefined || v.patient !== undefined,
    { message: "Provide patientId or patient details" },
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export type CreateAppointmentResult =
  | { ok: true;  mock: true }
  | { ok: true;  mock: false; appointmentId: string }
  | { ok: false; error: string };

// =============================================================================
// Action
// =============================================================================

export async function createAppointmentAction(
  rawInput: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const parsed = createAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (useMockData()) {
    return { ok: true, mock: true };
  }

  const supabase = await serverClient();

  // Resolve clinic from current user.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cu?.clinic_id) {
    return { ok: false, error: "Your account is not linked to a clinic." };
  }
  const clinicId = cu.clinic_id;

  // Resolve patientId (find-or-create).
  let patientId = input.patientId;
  if (!patientId && input.patient) {
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("phone_e164", input.patient.phoneE164)
      .maybeSingle();

    if (existing) {
      patientId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("patients")
        .insert({
          clinic_id:       clinicId,
          full_name:       input.patient.fullName,
          phone_e164:      input.patient.phoneE164,
          language:        input.patient.language,
          whatsapp_opt_in: true,
        })
        .select("id")
        .single();
      if (createErr || !created) {
        return { ok: false, error: createErr?.message ?? "Failed to create patient." };
      }
      patientId = created.id;
    }
  }
  if (!patientId) return { ok: false, error: "Missing patient." };

  // Read service duration to compute ends_at.
  const { data: service, error: svcErr } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", input.serviceId)
    .single();
  if (svcErr || !service) {
    return { ok: false, error: "Service not found." };
  }
  const duration = service.duration_minutes ?? 30;
  const startsAtMs = new Date(input.startsAt).getTime();
  const endsAtIso  = new Date(startsAtMs + duration * 60_000).toISOString();

  // Acquire the slot lock by inserting into clinic_slot_locks. The (clinic_id,
  // doctor_id, starts_at) PK guarantees only one writer wins the race; any
  // subsequent insert with the same key fails with a unique-violation.
  const { error: lockErr } = await supabase
    .from("clinic_slot_locks")
    .insert({
      clinic_id: clinicId,
      doctor_id: input.doctorId,
      starts_at: input.startsAt,
    });
  if (lockErr) {
    // 23505 = unique_violation in Postgres
    if ((lockErr as { code?: string }).code === "23505") {
      return { ok: false, error: "This time slot is already booked. Pick another." };
    }
    return { ok: false, error: lockErr.message };
  }

  // Insert the appointment row.
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      clinic_id:  clinicId,
      patient_id: patientId,
      doctor_id:  input.doctorId,
      service_id: input.serviceId,
      starts_at:  input.startsAt,
      ends_at:    endsAtIso,
      status:     "booked",
      source:     "site",
      notes:      input.notes ?? null,
    })
    .select("id")
    .single();

  if (apptErr || !appt) {
    // Roll back the slot lock so the slot becomes available again.
    await supabase
      .from("clinic_slot_locks")
      .delete()
      .match({ clinic_id: clinicId, doctor_id: input.doctorId, starts_at: input.startsAt });
    return { ok: false, error: apptErr?.message ?? "Failed to create appointment." };
  }

  // Fire-and-forget WhatsApp confirmation. We don't await the network call so
  // the action returns quickly even if Interakt is slow; the wa_messages row
  // captures success/failure for the inbox view.
  if (input.sendWhatsApp) {
    sendBookingConfirmation(appt.id).catch((err) => {
      console.error("[createAppointment] WhatsApp confirmation failed:", err);
    });
  }

  revalidatePath("/admin/today");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/patients");

  return { ok: true, mock: false, appointmentId: appt.id };
}
