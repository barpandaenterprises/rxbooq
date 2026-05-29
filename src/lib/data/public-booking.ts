/**
 * Public booking data layer.
 *
 * Uses serviceClient (bypasses RLS) because visitors are unauthenticated.
 * We scope every query to the tenant clinic explicitly — that's the only
 * way RLS-free reads stay safe.
 */

import { serviceClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { BOOKING_DOCTORS, BOOKING_SERVICES } from "@/lib/booking-data";

export type PublicService = {
  id:              string;
  name:            string;
  description:     string;
  durationMinutes: number;
  feeLabel:        string;
  icon:            string;
};

export type PublicDoctor = {
  id:           string;
  name:         string;
  credential:   string;
  initials:     string;
  /** Added by migration 0010. Null = unassigned (filtered out of By-Dept flow). */
  departmentId: string | null;
};

export type PublicDepartment = {
  id:           string;
  name:         string;
  slug:         string;
  displayOrder: number;
};

export type DoctorAvailabilityRow = {
  doctorId:  string;
  weekday:   number;  // 0 = Sun, ... 6 = Sat
  startTime: string;  // "HH:mm"
  endTime:   string;
  slotMinutes: number;
};

// =============================================================================
// Helpers
// =============================================================================

function initialsOf(name: string): string {
  return name.replace(/^(Dr\.?\s+)/i, "")
    .split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function hhmm(time: string): string {
  return time.slice(0, 5);
}

// =============================================================================
// Live fetchers (per clinic)
// =============================================================================

async function getLiveServices(clinicId: string): Promise<PublicService[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_inr")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[public-booking] services query failed:", error.message);
    return [];
  }

  return (data ?? []).map((s) => ({
    id:              s.id,
    name:            s.name,
    description:     s.description ?? "",
    durationMinutes: s.duration_minutes ?? 30,
    feeLabel:        s.price_inr ? `₹${s.price_inr.toLocaleString("en-IN")}` : "Consult",
    icon:            "fa-tooth",
  }));
}

async function getLiveDoctors(clinicId: string): Promise<PublicDoctor[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("doctors")
    .select("id, display_name, qualifications, department_id")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[public-booking] doctors query failed:", error.message);
    return [];
  }

  return (data ?? []).map((d) => ({
    id:           d.id,
    name:         d.display_name,
    credential:   d.qualifications ?? "",
    initials:     initialsOf(d.display_name),
    departmentId: d.department_id ?? null,
  }));
}

async function getLiveDepartments(clinicId: string): Promise<PublicDepartment[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, slug, display_order")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name",          { ascending: true });

  if (error) {
    console.error("[public-booking] departments query failed:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id:           r.id,
    name:         r.name,
    slug:         r.slug,
    displayOrder: r.display_order,
  }));
}

async function getLiveDefaultServiceId(clinicId: string): Promise<string | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("services")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function getLiveAvailability(clinicId: string, doctorId: string): Promise<DoctorAvailabilityRow[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("doctor_availability")
    .select("doctor_id, weekday, start_time, end_time, slot_minutes")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorId);

  if (error) {
    console.error("[public-booking] availability query failed:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    doctorId:    r.doctor_id,
    weekday:     r.weekday,
    startTime:   hhmm(r.start_time),
    endTime:     hhmm(r.end_time),
    slotMinutes: r.slot_minutes ?? 15,
  }));
}

async function getLiveBookedSlots(clinicId: string, doctorId: string, dateIso: string): Promise<string[]> {
  // Returns "HH:mm" strings for the given doctor + date that are already
  // taken (either booked appointments OR held slot-locks).
  const supabase = serviceClient();
  const start = new Date(`${dateIso}T00:00:00+05:30`);
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: appts }, { data: locks }] = await Promise.all([
    supabase
      .from("appointments")
      .select("starts_at, status")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .gte("starts_at", start.toISOString())
      .lt("starts_at",  end.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("clinic_slot_locks")
      .select("starts_at")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .gte("starts_at", start.toISOString())
      .lt("starts_at",  end.toISOString()),
  ]);

  const ist = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const out = new Set<string>();
  for (const a of (appts ?? [])) {
    out.add(ist.format(new Date(a.starts_at)));
  }
  for (const l of (locks ?? [])) {
    out.add(ist.format(new Date(l.starts_at)));
  }
  return Array.from(out);
}

// =============================================================================
// Mock helpers
// =============================================================================

const MOCK_SERVICES: PublicService[] = BOOKING_SERVICES.map((s) => ({
  id:              s.id,
  name:            s.name,
  description:     s.description,
  durationMinutes: parseInt(s.duration, 10) || 30,
  feeLabel:        s.fee,
  icon:            s.icon,
}));

const MOCK_DOCTORS: PublicDoctor[] = BOOKING_DOCTORS.map((d) => ({
  id:           d.id,
  name:         d.name,
  credential:   d.credential,
  initials:     d.initials,
  departmentId: "dept-dental",
}));

const MOCK_DEPARTMENTS: PublicDepartment[] = [
  { id: "dept-dental",     name: "Dental",     slug: "dental",     displayOrder: 1 },
  { id: "dept-psychiatry", name: "Psychiatry", slug: "psychiatry", displayOrder: 2 },
  { id: "dept-neurology",  name: "Neurology",  slug: "neurology",  displayOrder: 3 },
  { id: "dept-gynecology", name: "Gynecology", slug: "gynecology", displayOrder: 4 },
];

// =============================================================================
// Public entry points
// =============================================================================

export async function getPublicServices(clinicId: string): Promise<PublicService[]> {
  if (useMockData()) return MOCK_SERVICES;
  return getLiveServices(clinicId);
}

export async function getPublicDoctors(clinicId: string): Promise<PublicDoctor[]> {
  if (useMockData()) return MOCK_DOCTORS;
  return getLiveDoctors(clinicId);
}

export async function getPublicDoctorAvailability(
  clinicId: string,
  doctorId: string,
): Promise<DoctorAvailabilityRow[]> {
  if (useMockData()) {
    // In mock mode we let the existing client-side buildSlots fill the grid;
    // returning [] here is fine — the picker keeps its mock behavior.
    return [];
  }
  return getLiveAvailability(clinicId, doctorId);
}

export async function getPublicBookedSlots(
  clinicId: string,
  doctorId: string,
  dateIso: string,
): Promise<string[]> {
  if (useMockData()) return [];
  return getLiveBookedSlots(clinicId, doctorId, dateIso);
}

export async function findPublicServiceById(
  clinicId: string,
  id: string | null | undefined,
): Promise<PublicService | null> {
  if (!id) return null;
  const all = await getPublicServices(clinicId);
  return all.find((s) => s.id === id) ?? null;
}

export async function findPublicDoctorById(
  clinicId: string,
  id: string | null | undefined,
): Promise<PublicDoctor | null> {
  if (!id) return null;
  const all = await getPublicDoctors(clinicId);
  return all.find((d) => d.id === id) ?? null;
}

export async function getPublicDepartments(clinicId: string): Promise<PublicDepartment[]> {
  if (useMockData()) return MOCK_DEPARTMENTS;
  return getLiveDepartments(clinicId);
}

/**
 * Default service for inserts while `appointments.service_id` is still NOT
 * NULL. Phase 3 drops the column and removes this helper. Returns `null` for
 * clinics with no active services — callers should reject the booking with a
 * friendly error.
 */
export async function getPublicDefaultServiceId(clinicId: string): Promise<string | null> {
  if (useMockData()) return MOCK_SERVICES[0]?.id ?? null;
  return getLiveDefaultServiceId(clinicId);
}
