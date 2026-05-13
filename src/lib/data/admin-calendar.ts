/**
 * Data accessor for /admin/calendar.
 *
 * Fetches appointments for a single visible week (Monday → Sunday) in IST,
 * mapped to the `CalendarAppt` shape the AdminCalendar grid consumes.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";

export type CalendarApptStatus = "confirmed" | "booked" | "completed" | "noshow" | "cancelled";

export type CalendarAppt = {
  id:         string;
  /** 0 = Mon … 6 = Sun, relative to the start of the visible week (IST). */
  dayOffset:  number;
  start:      string; // "HH:mm"
  end:        string;
  patient:    string;
  service:    string;
  doctor:     string;
  status:     CalendarApptStatus;
};

// =============================================================================
// Mock data
// =============================================================================

const MOCK_APPTS: CalendarAppt[] = [
  { id: "1",  dayOffset: 0, start: "09:00", end: "09:45", patient: "Priya Sahu",     service: "Root Canal · S2",   doctor: "Dr. Manoranjan", status: "completed" },
  { id: "2",  dayOffset: 0, start: "10:00", end: "10:30", patient: "Rajesh Mishra",  service: "Consultation",      doctor: "Dr. Manoranjan", status: "completed" },
  { id: "3",  dayOffset: 0, start: "11:00", end: "11:30", patient: "Anita Sahu",     service: "Root Canal · S2",   doctor: "Dr. Manoranjan", status: "confirmed" },
  { id: "4",  dayOffset: 0, start: "14:30", end: "15:00", patient: "Manoj Behera",   service: "Implant consult",   doctor: "Dr. Manoranjan", status: "confirmed" },
  { id: "5",  dayOffset: 0, start: "16:00", end: "16:30", patient: "Suresh Pati",    service: "Cleaning",          doctor: "Dr. Lipsa",      status: "booked" },
  { id: "6",  dayOffset: 1, start: "09:00", end: "09:30", patient: "Karthik Rao",    service: "Cleaning",          doctor: "Dr. Lipsa",      status: "confirmed" },
  { id: "7",  dayOffset: 1, start: "10:30", end: "11:30", patient: "Suresh Pati",    service: "Braces fitting",    doctor: "Dr. Lipsa",      status: "confirmed" },
  { id: "8",  dayOffset: 1, start: "15:00", end: "15:30", patient: "Pinky Sahu",     service: "Pediatric checkup", doctor: "Dr. Lipsa",      status: "booked" },
  { id: "9",  dayOffset: 1, start: "17:00", end: "17:30", patient: "Bidyut Panda",   service: "Tooth extraction",  doctor: "Dr. Manoranjan", status: "booked" },
  { id: "10", dayOffset: 2, start: "09:30", end: "10:15", patient: "Susmita Dash",   service: "Root Canal · S1",   doctor: "Dr. Manoranjan", status: "confirmed" },
  { id: "11", dayOffset: 2, start: "11:00", end: "11:30", patient: "Sarita Mahanti", service: "Whitening",         doctor: "Dr. Lipsa",      status: "noshow" },
  { id: "12", dayOffset: 2, start: "14:00", end: "14:30", patient: "Anita Mohanti",  service: "Follow-up",         doctor: "Dr. Manoranjan", status: "booked" },
  { id: "13", dayOffset: 2, start: "16:30", end: "17:00", patient: "Laxmi Pradhan",  service: "Cleaning",          doctor: "Dr. Lipsa",      status: "cancelled" },
  { id: "14", dayOffset: 3, start: "10:00", end: "11:00", patient: "Manoj Behera",   service: "Implant placement", doctor: "Dr. Manoranjan", status: "booked" },
  { id: "15", dayOffset: 3, start: "13:00", end: "13:30", patient: "Priya Sahu",     service: "Follow-up",         doctor: "Dr. Manoranjan", status: "booked" },
  { id: "16", dayOffset: 3, start: "15:30", end: "16:00", patient: "Karthik Rao",    service: "Crown fitting",     doctor: "Dr. Manoranjan", status: "booked" },
  { id: "17", dayOffset: 4, start: "09:00", end: "09:30", patient: "Rashmi Sahu",    service: "Cleaning",          doctor: "Dr. Rashmita",   status: "booked" },
  { id: "18", dayOffset: 4, start: "11:30", end: "12:00", patient: "Bidyut Panda",   service: "Follow-up",         doctor: "Dr. Manoranjan", status: "booked" },
  { id: "19", dayOffset: 4, start: "16:00", end: "17:00", patient: "Anita Sahu",     service: "Root Canal · S3",   doctor: "Dr. Manoranjan", status: "booked" },
  { id: "20", dayOffset: 5, start: "09:30", end: "10:00", patient: "Pinky Sahu",     service: "Pediatric checkup", doctor: "Dr. Lipsa",      status: "booked" },
  { id: "21", dayOffset: 5, start: "11:00", end: "11:30", patient: "Susmita Dash",   service: "Cleaning",          doctor: "Dr. Lipsa",      status: "booked" },
];

// =============================================================================
// Helpers
// =============================================================================

const IST = "Asia/Kolkata";

/** Returns the Monday of the week that contains the given local date, as a UTC Date at IST midnight. */
export function getISTMonday(d: Date): Date {
  // Compute the local IST date string for `d`.
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = get("weekday"); // Mon, Tue, ...
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[dow] ?? 0;

  // Build the IST midnight for `d`, then shift back by `offset` days.
  const istMidnight = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+05:30`);
  istMidnight.setUTCDate(istMidnight.getUTCDate() - offset);
  return istMidnight;
}

function dateFormatIst(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function timeFormatIst(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function dayOffsetFromMondayIst(d: Date, mondayIst: Date): number {
  // Difference in IST calendar days. Use the IST date strings to avoid DST/TZ math.
  const a = dateFormatIst(d);
  const b = dateFormatIst(mondayIst);
  const aDate = new Date(`${a}T00:00:00+05:30`);
  const bDate = new Date(`${b}T00:00:00+05:30`);
  return Math.round((aDate.getTime() - bDate.getTime()) / 86400000);
}

function dbStatusToUi(s: string | null): CalendarApptStatus {
  switch (s) {
    case "confirmed": return "confirmed";
    case "booked":    return "booked";
    case "completed": return "completed";
    case "no_show":   return "noshow";
    case "cancelled": return "cancelled";
    default:          return "booked";
  }
}

// =============================================================================
// Live fetcher
// =============================================================================

type DbRow = {
  id:        string;
  starts_at: string;
  ends_at:   string;
  status:    string | null;
  patient: { full_name: string | null } | { full_name: string | null }[] | null;
  doctor:  { display_name: string | null } | { display_name: string | null }[] | null;
  service: { name: string | null } | { name: string | null }[] | null;
};

async function getLiveCalendar(mondayIst: Date): Promise<CalendarAppt[]> {
  const supabase = await serverClient();
  const end = new Date(mondayIst.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await supabase
    .from("appointments")
    .select(`
      id, starts_at, ends_at, status,
      patient:patients ( full_name ),
      doctor:doctors  ( display_name ),
      service:services ( name )
    `)
    .gte("starts_at", mondayIst.toISOString())
    .lt("starts_at",  end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[admin-calendar] query failed:", error.message);
    return [];
  }

  return (rows ?? []).map((r: DbRow): CalendarAppt => {
    const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;
    const doctor  = Array.isArray(r.doctor)  ? r.doctor[0]  : r.doctor;
    const service = Array.isArray(r.service) ? r.service[0] : r.service;
    return {
      id:        r.id,
      dayOffset: dayOffsetFromMondayIst(new Date(r.starts_at), mondayIst),
      start:     timeFormatIst(new Date(r.starts_at)),
      end:       timeFormatIst(new Date(r.ends_at)),
      patient:   patient?.full_name ?? "Unknown",
      service:   service?.name      ?? "—",
      doctor:    doctor?.display_name ?? "—",
      status:    dbStatusToUi(r.status),
    };
  });
}

// =============================================================================
// Public entry point
// =============================================================================

export async function getAdminCalendarData(mondayIst: Date): Promise<CalendarAppt[]> {
  if (useMockData()) return MOCK_APPTS;
  return getLiveCalendar(mondayIst);
}
