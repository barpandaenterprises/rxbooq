"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { sendBookingConfirmation } from "@/lib/wa/booking";

const E164  = z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164");
const IsoTs = z.string().datetime({ offset: true });

const publicBookingSchema = z.object({
  fullName:  z.string().trim().min(2, "Enter your full name"),
  phoneE164: E164,
  language:  z.enum(["en", "hi", "or"]).default("en"),
  serviceId: z.string().min(1, "Pick a service"),
  doctorId:  z.string().min(1, "Pick a doctor"),
  /** ISO timestamp at clinic local time, e.g. "2026-05-13T10:30:00+05:30" */
  startsAt:  IsoTs,
  notes:     z.string().optional(),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export type PublicBookingResult =
  | { ok: true;  mock: true }
  | { ok: true;  mock: false; appointmentId: string; bookingRef: string }
  | { ok: false; error: string };

function bookingRefFrom(uuid: string): string {
  const clean = uuid.replace(/-/g, "");
  return `DK-${new Date().getFullYear()}-${clean.slice(0, 5).toUpperCase()}`;
}

/**
 * Anonymous-callable booking entry point.
 *
 * Resolves the tenant clinic from the request (middleware headers) so the
 * caller can't book against an arbitrary clinic. Uses serviceClient because
 * the public site has no authenticated session — the clinic_id scope comes
 * from server-side tenant resolution, not from JWT.
 */
export async function createPublicBookingAction(
  rawInput: PublicBookingInput,
): Promise<PublicBookingResult> {
  const parsed = publicBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (useMockData()) {
    return { ok: true, mock: true };
  }

  const clinic = await getCurrentClinic();
  if (!clinic) {
    return { ok: false, error: "Could not resolve the clinic for this booking." };
  }
  const clinicId = clinic.id;

  const supabase = serviceClient();

  // 1. Find-or-create patient by phone within this clinic.
  let patientId: string;
  const { data: existing } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("phone_e164", input.phoneE164)
    .maybeSingle();

  if (existing) {
    patientId = existing.id;
  } else {
    const { data: created, error: createErr } = await supabase
      .from("patients")
      .insert({
        clinic_id:       clinicId,
        full_name:       input.fullName,
        phone_e164:      input.phoneE164,
        language:        input.language,
        whatsapp_opt_in: true,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      return { ok: false, error: createErr?.message ?? "Failed to register patient." };
    }
    patientId = created.id;
  }

  // 2. Service duration drives ends_at.
  const { data: service, error: svcErr } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", input.serviceId)
    .eq("clinic_id", clinicId)
    .single();
  if (svcErr || !service) {
    return { ok: false, error: "Service not found for this clinic." };
  }
  const startMs   = new Date(input.startsAt).getTime();
  const endsAtIso = new Date(startMs + (service.duration_minutes ?? 30) * 60_000).toISOString();

  // 3. Atomic slot lock — PK violation = race lost.
  const { error: lockErr } = await supabase
    .from("clinic_slot_locks")
    .insert({ clinic_id: clinicId, doctor_id: input.doctorId, starts_at: input.startsAt });
  if (lockErr) {
    if ((lockErr as { code?: string }).code === "23505") {
      return { ok: false, error: "This time slot was just taken. Pick another." };
    }
    return { ok: false, error: lockErr.message };
  }

  // 4. Insert appointment.
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
    await supabase
      .from("clinic_slot_locks")
      .delete()
      .match({ clinic_id: clinicId, doctor_id: input.doctorId, starts_at: input.startsAt });
    return { ok: false, error: apptErr?.message ?? "Failed to create appointment." };
  }

  revalidatePath("/admin/today");
  revalidatePath("/admin/calendar");

  sendBookingConfirmation(appt.id).catch((err) => {
    console.error("[publicBooking] WhatsApp confirmation failed:", err);
  });

  return {
    ok:            true,
    mock:          false,
    appointmentId: appt.id,
    bookingRef:    bookingRefFrom(appt.id),
  };
}
