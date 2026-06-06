"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { useMockData } from "@/lib/feature-flags";
import { sendBookingConfirmation } from "@/lib/wa/booking";
import {
  computeDoctorWorkingWindows,
  slotsInWindows,
  subtractBooked,
  workingDatesFor,
  dateRange,
  type AvailabilityOverrideRow,
  type AvailabilityRow,
  type WorkingWindow,
} from "@/lib/data/booking-availability";

const IST_OFFSET = "+05:30";

// =============================================================================
// Per-doctor slots for a date — returns the doctor's working windows for the
// day plus the slots that are taken. Drives the slot grid in By-Doctor flow.
// Replaces the previous getBookedSlotsAction, which ignored
// `doctor_availability` and hardcoded a 9–7 grid client-side.
// =============================================================================

const doctorSlotsSchema = z.object({
  doctorId: z.string().uuid(),
  dateIso:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DoctorSlotsResult =
  | { ok: true; workingWindows: WorkingWindow[]; bookedSlots: string[] }
  | { ok: false; error: string };

export async function getDoctorSlotsForDateAction(
  rawInput: z.infer<typeof doctorSlotsSchema>,
): Promise<DoctorSlotsResult> {
  const parsed = doctorSlotsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { doctorId, dateIso } = parsed.data;

  if (useMockData()) {
    // Friendly default for UI iteration without a seeded DB.
    return {
      ok: true,
      workingWindows: [{ start: "09:00", end: "18:00", slotMinutes: 30 }],
      bookedSlots: ["10:30", "11:00", "13:00", "13:30", "15:30"],
    };
  }

  const supabase = await serverClient();

  const [{ data: availRows }, { data: overrideRows }, booked] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .eq("doctor_id", doctorId),
    supabase
      .from("availability_overrides")
      .select("date, is_blocked, start_time, end_time")
      .eq("doctor_id", doctorId)
      .eq("date", dateIso),
    fetchBookedSlotsForDoctor(supabase, doctorId, dateIso),
  ]);

  const workingWindows = computeDoctorWorkingWindows(
    (availRows ?? []) as AvailabilityRow[],
    (overrideRows ?? []) as AvailabilityOverrideRow[],
    dateIso,
  );

  return { ok: true, workingWindows, bookedSlots: Array.from(booked) };
}

// =============================================================================
// Per-department free slots for a date — union of slots where ≥1 doctor in
// the department is on duty and not booked. Drives the slot grid in By-Dept
// flow.
// =============================================================================

const deptSlotsSchema = z.object({
  departmentId: z.string().uuid(),
  dateIso:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DeptSlotsResult =
  | { ok: true; freeSlots: string[] }
  | { ok: false; error: string };

export async function getDeptSlotsForDateAction(
  rawInput: z.infer<typeof deptSlotsSchema>,
): Promise<DeptSlotsResult> {
  const parsed = deptSlotsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { departmentId, dateIso } = parsed.data;

  if (useMockData()) {
    return { ok: true, freeSlots: ["09:00", "09:30", "10:00", "11:30", "12:00", "14:30", "15:00", "16:30", "17:00"] };
  }

  const supabase = await serverClient();

  // 1. All active doctors in the department.
  const { data: docRows } = await supabase
    .from("doctors")
    .select("id")
    .eq("department_id", departmentId)
    .eq("is_active", true);

  const doctorIds = (docRows ?? []).map((d) => d.id as string);
  if (doctorIds.length === 0) return { ok: true, freeSlots: [] };

  // 2. Their availability + overrides for this date.
  const [{ data: availRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("doctor_id, weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .in("doctor_id", doctorIds),
    supabase
      .from("availability_overrides")
      .select("doctor_id, date, is_blocked, start_time, end_time")
      .in("doctor_id", doctorIds)
      .eq("date", dateIso),
  ]);

  // 3. Booked slots per doctor for this date (parallel).
  const bookedByDoctor = await Promise.all(
    doctorIds.map((id) => fetchBookedSlotsForDoctor(supabase, id, dateIso)),
  );
  const bookedMap = new Map<string, Set<string>>();
  doctorIds.forEach((id, i) => bookedMap.set(id, bookedByDoctor[i] ?? new Set()));

  // 4. Union slots across doctors.
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
// Doctors in a department who are free at a specific slot on a date.
// Drives the doctor dropdown that appears after slot pick in By-Dept flow.
// =============================================================================

const doctorsForSlotSchema = z.object({
  departmentId: z.string().uuid(),
  dateIso:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot:         z.string().regex(/^\d{2}:\d{2}$/),
});

export type DoctorsForSlotResult =
  | { ok: true; doctors: Array<{ id: string; displayName: string; qualifications: string | null }> }
  | { ok: false; error: string };

export async function getDoctorsForSlotAction(
  rawInput: z.infer<typeof doctorsForSlotSchema>,
): Promise<DoctorsForSlotResult> {
  const parsed = doctorsForSlotSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { departmentId, dateIso, slot } = parsed.data;

  if (useMockData()) {
    return {
      ok: true,
      doctors: [
        { id: "doc-1", displayName: "Dr. Manoranjan Mahakur", qualifications: "BDS, MDS" },
      ],
    };
  }

  const supabase = await serverClient();

  const { data: docRows } = await supabase
    .from("doctors")
    .select("id, display_name, qualifications")
    .eq("department_id", departmentId)
    .eq("is_active", true);

  const doctorIds = (docRows ?? []).map((d) => d.id as string);
  if (doctorIds.length === 0) return { ok: true, doctors: [] };

  const [{ data: availRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("doctor_id, weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .in("doctor_id", doctorIds),
    supabase
      .from("availability_overrides")
      .select("doctor_id, date, is_blocked, start_time, end_time")
      .in("doctor_id", doctorIds)
      .eq("date", dateIso),
  ]);

  const bookedByDoctor = await Promise.all(
    doctorIds.map((id) => fetchBookedSlotsForDoctor(supabase, id, dateIso)),
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
    const allSlots = slotsInWindows(windows);
    if (!allSlots.includes(slot)) return false;
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
// Working dates in a range — used by the By-Doctor flow to grey out days the
// doctor isn't on duty in the 30-day date row.
// =============================================================================

const workingDatesSchema = z.object({
  doctorId: z.string().uuid(),
  fromIso:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days:     z.number().int().min(1).max(60).default(30),
});

export type WorkingDatesResult =
  | { ok: true; workingDates: string[] }
  | { ok: false; error: string };

export async function getDoctorWorkingDatesAction(
  rawInput: z.infer<typeof workingDatesSchema>,
): Promise<WorkingDatesResult> {
  const parsed = workingDatesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { doctorId, fromIso, days } = parsed.data;
  const dates = dateRange(fromIso, days);

  if (useMockData()) {
    // Mon–Sat working; Sunday off.
    const working = dates.filter((d) => {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      return dow !== 0;
    });
    return { ok: true, workingDates: working };
  }

  const supabase = await serverClient();
  const lastIso = dates[dates.length - 1] ?? fromIso;

  const [{ data: availRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from("doctor_availability")
      .select("weekday, start_time, end_time, slot_minutes, effective_from, effective_to")
      .eq("doctor_id", doctorId),
    supabase
      .from("availability_overrides")
      .select("date, is_blocked, start_time, end_time")
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
//   A slot is taken if EITHER an active appointment occupies it OR a slot-lock
//   is held (mid-flight booking from another session).
// =============================================================================

type SupabaseClient = Awaited<ReturnType<typeof serverClient>>;

async function fetchBookedSlotsForDoctor(
  supabase: SupabaseClient,
  doctorId: string,
  dateIso:  string,
): Promise<Set<string>> {
  const start = new Date(`${dateIso}T00:00:00${IST_OFFSET}`);
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: appts }, { data: locks }] = await Promise.all([
    supabase
      .from("appointments")
      .select("starts_at, status")
      .eq("doctor_id", doctorId)
      .neq("status", "cancelled")
      .gte("starts_at", start.toISOString())
      .lt("starts_at",  end.toISOString()),
    supabase
      .from("clinic_slot_locks")
      .select("starts_at")
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
    /** Informational. Kept on the request shape for telemetry. Not stored on
     *  appointments. */
    departmentId: z.string().uuid().optional(),
    startsAt:     IsoTs,
    /** Slot length in minutes — drives ends_at. Falls back to 30. The dialog
     *  passes the doctor's slot_minutes from their availability window. */
    durationMinutes: z.number().int().min(5).max(240).optional(),
    notes:        z.string().optional(),
    sendWhatsApp: z.boolean().default(false),
  })
  .refine(
    (v) => v.patientId !== undefined || v.patient !== undefined,
    { message: "Provide patientId or patient details" },
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export type CreateAppointmentResult =
  | { ok: true;  appointmentId: string }
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

  // All staff can book; a doctor may only book for themselves.
  const gate = await requireRole(["clinic_admin", "receptionist", "doctor"]);
  if (!gate.ok) return gate;
  if (gate.ctx.role === "doctor") {
    if (!gate.ctx.doctorId) {
      return { ok: false, error: "Your login isn't linked to a doctor profile yet — ask an admin to link it." };
    }
    // Ignore any client-supplied doctorId; a doctor books only their own slots.
    input.doctorId = gate.ctx.doctorId;
  }
  const clinicId = gate.ctx.clinicId;

  const supabase = await serverClient();

  // Compute ends_at from the slot length the dialog passed (it knows the
  // doctor's slot_minutes from their availability window). Fallback to 30.
  const duration   = input.durationMinutes ?? 30;
  const startsAtMs = new Date(input.startsAt).getTime();
  const endsAtIso  = new Date(startsAtMs + duration * 60_000).toISOString();

  // ---- Acquire the slot lock FIRST. -------------------------------------
  // Doing this before any patient writes means a contended slot fails fast
  // and we never leave behind a half-onboarded patient row. The (clinic_id,
  // doctor_id, starts_at) PK guarantees only one writer wins the race.
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

  // From here on, any failure path must release the slot lock so the slot
  // becomes available again.
  const releaseLock = () =>
    supabase
      .from("clinic_slot_locks")
      .delete()
      .match({ clinic_id: clinicId, doctor_id: input.doctorId, starts_at: input.startsAt });

  // ---- Resolve patientId (find-or-create), tracking whether we created it
  let patientId = input.patientId;
  let patientWasCreated = false;
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
        await releaseLock();
        return { ok: false, error: createErr?.message ?? "Failed to create patient." };
      }
      patientId         = created.id;
      patientWasCreated = true;
    }
  }
  if (!patientId) {
    await releaseLock();
    return { ok: false, error: "Missing patient." };
  }

  // ---- Insert the appointment row ---------------------------------------
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
    await releaseLock();
    // If we created the patient just for this booking, roll that back too —
    // otherwise we'd leave an orphan with zero appointments cluttering
    // /admin/patients. Existing patients stay untouched.
    if (patientWasCreated && patientId) {
      await supabase.from("patients").delete().eq("id", patientId);
    }
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

  await revalidateActiveClinicPath("/admin/today");
  await revalidateActiveClinicPath("/admin/calendar");
  await revalidateActiveClinicPath("/admin/patients");

  return { ok: true, appointmentId: appt.id };
}
