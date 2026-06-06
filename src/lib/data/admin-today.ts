/**
 * Data accessors for the /admin/today screen.
 *
 * - Types are the canonical shape AdminToday.tsx consumes.
 * - Mock arrays mirror what the demo screen showed before any DB existed.
 * - getAdminTodayData() picks mock vs live based on the MOCK_DATA flag.
 *
 * Live queries rely on RLS to scope rows to the signed-in user's clinic — we
 * do NOT pass clinic_id explicitly. If RLS returns zero rows, double-check
 * the user has a clinic_users row.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { getActiveMembership } from "@/lib/auth/current-user";

// =============================================================================
// Canonical types — AdminToday renders against these
// =============================================================================

export type ApptStatus = "confirmed" | "booked" | "completed" | "noshow" | "cancelled";

export type ApptItem = {
  time:    string;       // "HH:mm" in Asia/Kolkata
  name:    string;
  phone:   string;
  service: string;
  doctor:  string;
  status:  ApptStatus;
  isNow?:  boolean;
  isNew?:  boolean;
};

export type ApptHourGroup = { hour: string; items: ApptItem[] };

export type WaActivity = {
  name:      string;
  tpl:       string;
  status:    "delivered" | "read" | "replied" | "failed";
  ts:        string;
  replied?:  boolean;
  highlight?: boolean;
};

export type AdminTodayKpis = {
  noShows7d:            number;
  noShows7dDeltaPct:    number;  // % change vs previous 7-day window (rounded)
  noShows7dSpark:       number[]; // daily count for the last 7 days (oldest first)
  newPatientsWeek:      number;
  newPatientsWeekDelta: number;  // absolute change vs previous 7-day window
  newPatientsWeekSpark: number[]; // daily count for the last 7 days (oldest first)
};

export type AdminTodayData = {
  appointments: ApptHourGroup[];
  doctors:      string[];     // display names — feeds the doctor filter
  waActivity:   WaActivity[];
  kpis:         AdminTodayKpis;
};

// =============================================================================
// Mock data (used when MOCK_DATA=true)
// =============================================================================

const MOCK_DOCTORS = ["Dr. Manoranjan", "Dr. Lipsa", "Dr. Asit"];

const MOCK_APPOINTMENTS: ApptHourGroup[] = [
  { hour: "09:00", items: [
    { time: "09:00", name: "Priya Sahu",     phone: "+91 93456 78901", service: "Root Canal · S2",   doctor: "Dr. Manoranjan", status: "completed" },
    { time: "09:30", name: "Rajesh Mishra",  phone: "+91 94370 11111", service: "Consultation",      doctor: "Dr. Manoranjan", status: "completed" },
  ]},
  { hour: "10:00", items: [
    { time: "10:00", name: "Anita Sahu",     phone: "+91 98765 12342", service: "Root Canal · S2",   doctor: "Dr. Manoranjan", status: "completed" },
    { time: "10:30", name: "Laxmi Pradhan",  phone: "+91 90324 55512", service: "Cleaning",          doctor: "Dr. Lipsa",      status: "cancelled" },
    { time: "11:00", name: "Sarita Mahanti", phone: "+91 99378 23445", service: "Whitening",         doctor: "Dr. Lipsa",      status: "noshow" },
  ]},
  { hour: "12:00", items: [
    { time: "12:00", name: "Manoj Behera",   phone: "+91 95672 34111", service: "Implant consult",   doctor: "Dr. Manoranjan", status: "confirmed", isNow: true },
    { time: "12:30", name: "Suresh Pati",    phone: "+91 89230 11445", service: "Braces adjust",     doctor: "Dr. Asit",       status: "confirmed" },
  ]},
  { hour: "14:00", items: [
    { time: "14:00", name: "Karthik Rao",    phone: "+91 70084 91144", service: "Root Canal · S1",   doctor: "Dr. Manoranjan", status: "booked" },
    { time: "14:30", name: "Pinky Sahu",     phone: "+91 87224 55501", service: "Pediatric checkup", doctor: "Dr. Lipsa",      status: "booked" },
    { time: "15:30", name: "Bidyut Panda",   phone: "+91 96543 22018", service: "Tooth extraction",  doctor: "Dr. Manoranjan", status: "booked", isNew: true },
  ]},
  { hour: "17:00", items: [
    { time: "17:00", name: "Susmita Dash",   phone: "+91 99220 33015", service: "Cleaning",          doctor: "Dr. Lipsa",      status: "booked" },
    { time: "17:30", name: "Anita Mohanti",  phone: "+91 98123 56611", service: "Follow-up",         doctor: "Dr. Manoranjan", status: "booked" },
  ]},
];

const MOCK_WA_ACTIVITY: WaActivity[] = [
  { name: "Bidyut Panda",   tpl: "booking_confirmation_v1", status: "replied",   ts: "just now",   replied: true,  highlight: true },
  { name: "Anita Sahu",     tpl: "reminder_24h_v2",         status: "read",      ts: "2 min ago" },
  { name: "Sarita Mahanti", tpl: "noshow_followup_v1",      status: "delivered", ts: "14 min ago" },
  { name: "Karthik Rao",    tpl: "booking_confirmation_v1", status: "read",      ts: "18 min ago" },
  { name: "Pinky Sahu",     tpl: "booking_confirmation_v1", status: "read",      ts: "22 min ago" },
  { name: "Suresh Pati",    tpl: "reminder_24h_v2",         status: "replied",   ts: "31 min ago", replied: true },
  { name: "Manoj Behera",   tpl: "reminder_24h_v2",         status: "delivered", ts: "46 min ago" },
  { name: "Laxmi Pradhan",  tpl: "cancellation_ack_v1",     status: "read",      ts: "1 hr ago" },
];

const MOCK_KPIS: AdminTodayKpis = {
  noShows7d:            3,
  noShows7dDeltaPct:    -40,
  noShows7dSpark:       [7, 6, 5, 5, 4, 4, 3],
  newPatientsWeek:      18,
  newPatientsWeekDelta: 5,
  newPatientsWeekSpark: [2, 3, 4, 3, 4, 5, 6],
};

const MOCK: AdminTodayData = {
  appointments: MOCK_APPOINTMENTS,
  doctors:      MOCK_DOCTORS,
  waActivity:   MOCK_WA_ACTIVITY,
  kpis:         MOCK_KPIS,
};

// =============================================================================
// Helpers
// =============================================================================

const IST = "Asia/Kolkata";

function startOfTodayIST(): Date {
  // Get today's date in IST as a UTC Date.
  const now      = new Date();
  const istParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => istParts.find((p) => p.type === t)?.value ?? "00";
  // Midnight IST in UTC = midnight IST minus 5:30
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+05:30`);
}

function formatTimeIST(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

function dbStatusToUi(s: string | null): ApptStatus {
  switch (s) {
    case "confirmed": return "confirmed";
    case "booked":    return "booked";
    case "completed": return "completed";
    case "no_show":   return "noshow";
    case "cancelled": return "cancelled";
    default:          return "booked";
  }
}

function groupByHour(items: ApptItem[]): ApptHourGroup[] {
  const map = new Map<string, ApptItem[]>();
  for (const item of items) {
    const hour = `${item.time.slice(0, 2)}:00`;
    const list = map.get(hour) ?? [];
    list.push(item);
    map.set(hour, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, items]) => ({ hour, items }));
}

// =============================================================================
// Live fetcher
// =============================================================================

async function getLiveAdminTodayData(): Promise<AdminTodayData> {
  // Explicit clinic scope — defense-in-depth against RLS superadmin bypass.
  const membership = await getActiveMembership();
  if (!membership) {
    return { appointments: [], doctors: [], waActivity: [], kpis: emptyKpis() };
  }
  const clinicId = membership.clinicId;
  // A doctor login sees only their own appointments. A doctor not yet linked to
  // a profile sees nothing (fail-closed) rather than the whole clinic.
  const scopeDoctorId = membership.role === "doctor" ? membership.doctorId : null;
  if (membership.role === "doctor" && !scopeDoctorId) {
    return { appointments: [], doctors: [], waActivity: [], kpis: emptyKpis() };
  }

  const supabase = await serverClient();
  const start    = startOfTodayIST();
  const end      = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  let apptQuery = supabase
    .from("appointments")
    .select(`
      id, starts_at, status,
      patient:patients ( full_name, phone_e164 ),
      doctor:doctors  ( display_name )
    `)
    .eq("clinic_id", clinicId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });
  if (scopeDoctorId) apptQuery = apptQuery.eq("doctor_id", scopeDoctorId);

  const { data: rows, error } = await apptQuery;

  if (error) {
    console.error("[admin-today] appointments query failed:", error.message);
    return {
      appointments: [],
      doctors:      [],
      waActivity:   [],
      kpis:         emptyKpis(),
    };
  }

  const items: ApptItem[] = (rows ?? []).map((r) => {
    // Supabase typing for embedded selects can be union of array/object; coerce.
    const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;
    const doctor  = Array.isArray(r.doctor)  ? r.doctor[0]  : r.doctor;
    return {
      time:    formatTimeIST(r.starts_at as string),
      name:    patient?.full_name  ?? "Unknown patient",
      phone:   patient?.phone_e164 ?? "",
      service: "—",
      doctor:  doctor?.display_name ?? "—",
      status:  dbStatusToUi(r.status as string),
    };
  });

  // Distinct doctor list for the filter — pulled from the active doctors,
  // not just today's roster, so the filter still shows all options. A doctor
  // login only ever sees themselves, so the filter is just their own name.
  let doctorListQuery = supabase
    .from("doctors")
    .select("display_name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (scopeDoctorId) doctorListQuery = doctorListQuery.eq("id", scopeDoctorId);
  const { data: doctorRows } = await doctorListQuery;

  const doctors = (doctorRows ?? []).map((d) => d.display_name);

  const kpis = await getLiveKpis(supabase, clinicId, scopeDoctorId);

  return {
    appointments: groupByHour(items),
    doctors,
    waActivity:   [],   // wired in a later phase
    kpis,
  };
}

// =============================================================================
// Live KPI queries (no-shows 7d, new patients week)
// =============================================================================

function emptyKpis(): AdminTodayKpis {
  return {
    noShows7d:            0,
    noShows7dDeltaPct:    0,
    noShows7dSpark:       [0, 0, 0, 0, 0, 0, 0],
    newPatientsWeek:      0,
    newPatientsWeekDelta: 0,
    newPatientsWeekSpark: [0, 0, 0, 0, 0, 0, 0],
  };
}

function deltaPct(current: number, prev: number): number {
  if (prev === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - prev) / prev) * 100);
}

function countByDay(rows: { starts_at?: string; created_at?: string }[], dayKey: "starts_at" | "created_at", startMs: number): number[] {
  // Returns 7 daily counts, oldest first, anchored to startMs (which is the
  // beginning of the 7-day window in IST millis).
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) {
    const iso = r[dayKey];
    if (!iso) continue;
    const idx = Math.floor((new Date(iso).getTime() - startMs) / 86_400_000);
    if (idx >= 0 && idx < 7) buckets[idx]!++;
  }
  return buckets;
}

async function getLiveKpis(
  supabase: Awaited<ReturnType<typeof serverClient>>,
  clinicId: string,
  scopeDoctorId: string | null,
): Promise<AdminTodayKpis> {
  const now              = Date.now();
  const sevenDaysMs      = 7  * 86_400_000;
  const fourteenDaysAgo  = new Date(now - 2 * sevenDaysMs).toISOString();

  // ---- No-shows in the last 7d + previous 7d (single query covers both) ----
  let noShowQuery = supabase
    .from("appointments")
    .select("starts_at, status")
    .eq("clinic_id", clinicId)
    .eq("status", "no_show")
    .gte("starts_at", fourteenDaysAgo)
    .lt("starts_at",  new Date(now).toISOString());
  if (scopeDoctorId) noShowQuery = noShowQuery.eq("doctor_id", scopeDoctorId);
  const { data: noShowRows } = await noShowQuery;

  const cutoff7Ms       = now - sevenDaysMs;
  const noShowCurrent   = (noShowRows ?? []).filter((r) => new Date(r.starts_at).getTime() >= cutoff7Ms).length;
  const noShowPrev      = (noShowRows ?? []).filter((r) => new Date(r.starts_at).getTime() <  cutoff7Ms).length;
  const noShowSpark     = countByDay(
    (noShowRows ?? []).filter((r) => new Date(r.starts_at).getTime() >= cutoff7Ms),
    "starts_at",
    cutoff7Ms,
  );

  // ---- New patients ------------------------------------------------------
  // For a doctor, "new patients" means new patients assigned to them.
  let patientQuery = supabase
    .from("patients")
    .select("created_at")
    .eq("clinic_id", clinicId)
    .gte("created_at", fourteenDaysAgo);
  if (scopeDoctorId) patientQuery = patientQuery.eq("assigned_doctor_id", scopeDoctorId);
  const { data: patientRows } = await patientQuery;

  const newPatientsCurrent = (patientRows ?? []).filter((r) => new Date(r.created_at).getTime() >= cutoff7Ms).length;
  const newPatientsPrev    = (patientRows ?? []).filter((r) => new Date(r.created_at).getTime() <  cutoff7Ms).length;
  const newPatientsSpark   = countByDay(
    (patientRows ?? []).filter((r) => new Date(r.created_at).getTime() >= cutoff7Ms),
    "created_at",
    cutoff7Ms,
  );

  return {
    noShows7d:            noShowCurrent,
    noShows7dDeltaPct:    deltaPct(noShowCurrent, noShowPrev),
    noShows7dSpark:       noShowSpark,
    newPatientsWeek:      newPatientsCurrent,
    newPatientsWeekDelta: newPatientsCurrent - newPatientsPrev,
    newPatientsWeekSpark: newPatientsSpark,
  };
}

// =============================================================================
// Public entry point
// =============================================================================

export async function getAdminTodayData(): Promise<AdminTodayData> {
  if (useMockData()) return MOCK;
  return getLiveAdminTodayData();
}
