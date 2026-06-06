"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/server";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { sendBookingConfirmation } from "@/lib/wa/booking";
import { useMockData } from "@/lib/feature-flags";
import {
  computeDoctorWorkingWindows,
  dateRange,
  slotsInWindows,
  subtractBooked,
  workingDatesFor,
  type AvailabilityOverrideRow,
  type AvailabilityRow,
  type WorkingWindow,
} from "@/lib/data/booking-availability";

const IST_OFFSET = "+05:30";

// =============================================================================
// Per-doctor slots for a date (public). Mirrors the admin action.
// =============================================================================

const pubDoctorSlotsSchema = z.object({
  doctorId: z.string().uuid(),
  dateIso:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PublicDoctorSlotsResult =
  | { ok: true; workingWindows: WorkingWindow[]; bookedSlots: string[] }
  | { ok: false; error: string };

export async function getPublicDoctorSlotsForDateAction(
  rawInput: z.infer<typeof pubDoctorSlotsSchema>,
): Promise<PublicDoctorSlotsResult> {
  const parsed = pubDoctorSlotsSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { doctorId, dateIso } = parsed.data;

  if (useMockData()) {
    return {
      ok: true,
      workingWindows: [{ start: "09:00", end: "18:00", slotMinutes: 30 }],
      bookedSlots: ["10:30", "13:00"],
    };
  }

  const clinic = await getCurrentClinic();
  if (!clinic) return { ok: false, error: "Clinic not resolved." };

  const supabase = serviceClient();

  const [{ data: availRows }, { data: overrideRows }, booked] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .eq("clinic_id", clinic.id)
      .eq("doctor_id", doctorId),
    supabase
      .from("availability_overrides")
      .select("date, is_blocked, start_time, end_time")
      .eq("clinic_id", clinic.id)
      .eq("doctor_id", doctorId)
      .eq("date", dateIso),
    fetchBookedSlots(clinic.id, doctorId, dateIso),
  ]);

  const workingWindows = computeDoctorWorkingWindows(
    (availRows ?? []) as AvailabilityRow[],
    (overrideRows ?? []) as AvailabilityOverrideRow[],
    dateIso,
  );
  return { ok: true, workingWindows, bookedSlots: Array.from(booked) };
}

// =============================================================================
// Department free slots (public).
// =============================================================================

const pubDeptSlotsSchema = z.object({
  departmentId: z.string().uuid(),
  dateIso:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PublicDeptSlotsResult =
  | { ok: true; freeSlots: string[] }
  | { ok: false; error: string };

export async function getPublicDeptSlotsForDateAction(
  rawInput: z.infer<typeof pubDeptSlotsSchema>,
): Promise<PublicDeptSlotsResult> {
  const parsed = pubDeptSlotsSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { departmentId, dateIso } = parsed.data;

  if (useMockData()) {
    return { ok: true, freeSlots: ["09:00", "09:30", "10:00", "11:30", "12:00", "14:30", "15:00", "16:30", "17:00"] };
  }

  const clinic = await getCurrentClinic();
  if (!clinic) return { ok: false, error: "Clinic not resolved." };

  const supabase = serviceClient();

  const { data: docRows } = await supabase
    .from("doctors")
    .select("id")
    .eq("clinic_id", clinic.id)
    .eq("department_id", departmentId)
    .eq("is_active", true);

  const doctorIds = (docRows ?? []).map((d) => d.id as string);
  if (doctorIds.length === 0) return { ok: true, freeSlots: [] };

  const [{ data: availRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("doctor_id, weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .eq("clinic_id", clinic.id)
      .in("doctor_id", doctorIds),
    supabase
      .from("availability_overrides")
      .select("doctor_id, date, is_blocked, start_time, end_time")
      .eq("clinic_id", clinic.id)
      .in("doctor_id", doctorIds)
      .eq("date", dateIso),
  ]);

  const bookedByDoctor = await Promise.all(
    doctorIds.map((id) => fetchBookedSlots(clinic.id, id, dateIso)),
  );
  const bookedMap = new Map<string, Set<string>>();
  doctorIds.forEach((id, i) => bookedMap.set(id, bookedByDoctor[i] ?? new Set()));

  const freeUnion = new Set<string>();
  for (const id of doctorIds) {
    const myAvail     = ((availRows ?? []) as Array<AvailabilityRow & { doctor_id: string }>)
      .filter((r) => r.doctor_id === id);
    const myOverrides = ((overrideRows ?? []) as Array<AvailabilityOverrideRow & { doctor_id: string }>)
      .filter((r) => r.doctor_id === id);
    const windows  = computeDoctorWorkingWindows(myAvail, myOverrides, dateIso);
    const allSlots = slotsInWindows(windows);
    const free     = subtractBooked(allSlots, bookedMap.get(id) ?? new Set());
    for (const s of free) freeUnion.add(s);
  }
  return { ok: true, freeSlots: Array.from(freeUnion).sort() };
}

// =============================================================================
// Doctors in a department free at a slot (public).
// =============================================================================

const pubDoctorsForSlotSchema = z.object({
  departmentId: z.string().uuid(),
  dateIso:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot:         z.string().regex(/^\d{2}:\d{2}$/),
});

export type PublicDoctorsForSlotResult =
  | { ok: true; doctors: Array<{ id: string; displayName: string; qualifications: string | null }> }
  | { ok: false; error: string };

export async function getPublicDoctorsForSlotAction(
  rawInput: z.infer<typeof pubDoctorsForSlotSchema>,
): Promise<PublicDoctorsForSlotResult> {
  const parsed = pubDoctorsForSlotSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { departmentId, dateIso, slot } = parsed.data;

  if (useMockData()) {
    return {
      ok: true,
      doctors: [{ id: "doc-1", displayName: "Dr. Manoranjan Mahakur", qualifications: "BDS, MDS" }],
    };
  }

  const clinic = await getCurrentClinic();
  if (!clinic) return { ok: false, error: "Clinic not resolved." };

  const supabase = serviceClient();
  const { data: docRows } = await supabase
    .from("doctors")
    .select("id, display_name, qualifications")
    .eq("clinic_id", clinic.id)
    .eq("department_id", departmentId)
    .eq("is_active", true);

  const doctorIds = (docRows ?? []).map((d) => d.id as string);
  if (doctorIds.length === 0) return { ok: true, doctors: [] };

  const [{ data: availRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("doctor_id, weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .eq("clinic_id", clinic.id)
      .in("doctor_id", doctorIds),
    supabase
      .from("availability_overrides")
      .select("doctor_id, date, is_blocked, start_time, end_time")
      .eq("clinic_id", clinic.id)
      .in("doctor_id", doctorIds)
      .eq("date", dateIso),
  ]);

  const bookedByDoctor = await Promise.all(
    doctorIds.map((id) => fetchBookedSlots(clinic.id, id, dateIso)),
  );
  const bookedMap = new Map<string, Set<string>>();
  doctorIds.forEach((id, i) => bookedMap.set(id, bookedByDoctor[i] ?? new Set()));

  const matching = (docRows ?? []).filter((d) => {
    const id = d.id as string;
    const myAvail     = ((availRows ?? []) as Array<AvailabilityRow & { doctor_id: string }>)
      .filter((r) => r.doctor_id === id);
    const myOverrides = ((overrideRows ?? []) as Array<AvailabilityOverrideRow & { doctor_id: string }>)
      .filter((r) => r.doctor_id === id);
    const windows  = computeDoctorWorkingWindows(myAvail, myOverrides, dateIso);
    if (!slotsInWindows(windows).includes(slot)) return false;
    return !(bookedMap.get(id)?.has(slot));
  });

  return {
    ok: true,
    doctors: matching.map((d) => ({
      id:             d.id as string,
      displayName:    d.display_name as string,
      qualifications: (d.qualifications as string | null) ?? null,
    })),
  };
}

// =============================================================================
// Working dates (public).
// =============================================================================

const pubWorkingDatesSchema = z.object({
  doctorId: z.string().uuid(),
  fromIso:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days:     z.number().int().min(1).max(60).default(30),
});

export type PublicWorkingDatesResult =
  | { ok: true; workingDates: string[] }
  | { ok: false; error: string };

export async function getPublicDoctorWorkingDatesAction(
  rawInput: z.infer<typeof pubWorkingDatesSchema>,
): Promise<PublicWorkingDatesResult> {
  const parsed = pubWorkingDatesSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { doctorId, fromIso, days } = parsed.data;
  const dates = dateRange(fromIso, days);

  if (useMockData()) {
    return {
      ok: true,
      workingDates: dates.filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0),
    };
  }

  const clinic = await getCurrentClinic();
  if (!clinic) return { ok: false, error: "Clinic not resolved." };

  const supabase = serviceClient();
  const lastIso = dates[dates.length - 1] ?? fromIso;

  const [{ data: availRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .eq("clinic_id", clinic.id)
      .eq("doctor_id", doctorId),
    supabase
      .from("availability_overrides")
      .select("date, is_blocked, start_time, end_time")
      .eq("clinic_id", clinic.id)
      .eq("doctor_id", doctorId)
      .gte("date", fromIso)
      .lte("date", lastIso),
  ]);

  const set = workingDatesFor(
    dates,
    (availRows ?? []) as AvailabilityRow[],
    (overrideRows ?? []) as AvailabilityOverrideRow[],
  );
  return { ok: true, workingDates: dates.filter((d) => set.has(d)) };
}

// =============================================================================
// Helper: booked slots ("HH:mm" in IST) for a doctor on a date.
// =============================================================================

async function fetchBookedSlots(clinicId: string, doctorId: string, dateIso: string): Promise<Set<string>> {
  const supabase = serviceClient();
  const start = new Date(`${dateIso}T00:00:00${IST_OFFSET}`);
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: appts }, { data: locks }] = await Promise.all([
    supabase
      .from("appointments")
      .select("starts_at, status")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .neq("status", "cancelled")
      .gte("starts_at", start.toISOString())
      .lt("starts_at",  end.toISOString()),
    supabase
      .from("clinic_slot_locks")
      .select("starts_at")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .gte("starts_at", start.toISOString())
      .lt("starts_at",  end.toISOString()),
  ]);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  });
  const out = new Set<string>();
  for (const a of (appts ?? [])) out.add(fmt.format(new Date(a.starts_at as string)));
  for (const l of (locks ?? [])) out.add(fmt.format(new Date(l.starts_at as string)));
  return out;
}

// =============================================================================
// Booking action
// =============================================================================

const E164  = z.string().regex(/^\+\d{10,15}$/, "Phone must be E.164");
const IsoTs = z.string().datetime({ offset: true });

const publicBookingSchema = z.object({
  fullName:  z.string().trim().min(2, "Enter your full name"),
  phoneE164: E164,
  language:  z.enum(["en", "hi", "or"]).default("en"),
  doctorId:     z.string().min(1, "Pick a doctor"),
  /** Informational — not stored on the appointment row. */
  departmentId: z.string().uuid().optional(),
  /** ISO timestamp at clinic local time, e.g. "2026-05-13T10:30:00+05:30" */
  startsAt:  IsoTs,
  /** Slot length in minutes (drives ends_at). Fallback 30. */
  durationMinutes: z.number().int().min(5).max(240).optional(),
  notes:     z.string().optional(),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export type PublicBookingResult =
  | { ok: true;  appointmentId: string; bookingRef: string }
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

  // 2. Compute ends_at from durationMinutes (defaults to 30).
  const duration   = input.durationMinutes ?? 30;
  const startMs    = new Date(input.startsAt).getTime();
  const endsAtIso  = new Date(startMs + duration * 60_000).toISOString();

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

  await revalidateActiveClinicPath("/admin/today");
  await revalidateActiveClinicPath("/admin/calendar");

  sendBookingConfirmation(appt.id).catch((err) => {
    console.error("[publicBooking] WhatsApp confirmation failed:", err);
  });

  return {
    ok:            true,
    appointmentId: appt.id,
    bookingRef:    bookingRefFrom(appt.id),
  };
}
