/**
 * Data accessor for the /admin/doctors screen.
 *
 * Returns the rich `Doctor` shape that the UI expects. Live queries hit the
 * narrower DB shape (`doctors` + `doctor_availability`) and fill in UI-only
 * fields (avatar colors, stats, reviews, visiting flag) with safe defaults.
 *
 * MOCK_DATA=true → returns DOCTORS from doctors-data.ts unchanged.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import {
  DOCTORS,
  WEEKDAYS,
  type Doctor,
  type DoctorStatus,
  type Locale,
  type Specialty,
  type TimeRange,
  type Weekday,
  type WeeklySchedule,
} from "@/lib/doctors-data";

// =============================================================================
// Helpers
// =============================================================================

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: "#E6F1FA", fg: "#0E5087" },
  { bg: "#E6F4EC", fg: "#3a8b5e" },
  { bg: "#FFE7EC", fg: "#EE344E" },
  { bg: "#FFF5E1", fg: "#7a5c2b" },
  { bg: "#F0E6FA", fg: "#5e3a8b" },
  { bg: "#E1F0F4", fg: "#2b5c7a" },
];

function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?\s+)/i, "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarFor(id: string): { bg: string; fg: string } {
  // Stable colour for a given doctor id.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function weekdayFromInt(n: number): Weekday {
  // Postgres weekday is 0=Sun..6=Sat; our enum starts on Monday.
  return WEEKDAYS[(n + 6) % 7]!;
}

function hhmm(time: string): string {
  // Convert "09:00:00" → "09:00"
  return time.slice(0, 5);
}

type AvailabilityRow = {
  doctor_id:  string;
  weekday:    number;
  start_time: string;
  end_time:   string;
};

function buildScheduleByDoctor(rows: AvailabilityRow[]): Record<string, WeeklySchedule> {
  const out: Record<string, WeeklySchedule> = {};
  for (const r of rows) {
    const day = weekdayFromInt(r.weekday);
    const range: TimeRange = { start: hhmm(r.start_time), end: hhmm(r.end_time) };
    const schedule = (out[r.doctor_id] ??= {});
    (schedule[day] ??= []).push(range);
  }
  return out;
}

// =============================================================================
// Live fetcher
// =============================================================================

type DoctorRow = {
  id:                 string;
  display_name:       string;
  qualifications:     string | null;
  bio:                string | null;
  photo_url:          string | null;
  registration_no:    string | null;
  display_order:      number;
  is_active:          boolean;
  created_at:         string;
  // Added in migration 0007
  years_experience:   number | null;
  trained_at:         string | null;
  phone:              string | null;
  email:              string | null;
  primary_specialty:  string | null;
  visiting:           boolean | null;
  visiting_note:      string | null;
  status:             string | null;
  languages:          string[] | null;
};

const VALID_SPECIALTIES = new Set<Specialty>([
  "Conservative Dentistry", "Endodontics", "Orthodontics", "Pediatric Dentistry",
  "Prosthodontics", "Oral Surgery", "General Dentistry",
  "Cosmetology & Implantology", "Other",
]);

function coerceSpecialty(s: string | null): Specialty {
  if (s && (VALID_SPECIALTIES as Set<string>).has(s)) return s as Specialty;
  return "General Dentistry";
}

function coerceStatus(status: string | null, isActive: boolean): DoctorStatus {
  if (status === "active" || status === "on_leave" || status === "inactive") return status;
  return isActive ? "active" : "inactive";
}

function coerceLocales(langs: string[] | null): Locale[] {
  if (!langs || langs.length === 0) return ["EN"];
  const map: Record<string, Locale> = { en: "EN", hi: "HI", or: "OR" };
  const out: Locale[] = [];
  for (const l of langs) {
    const mapped = map[l.toLowerCase()];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out.length > 0 ? out : ["EN"];
}

async function getLiveDoctors(): Promise<Doctor[]> {
  const supabase = await serverClient();

  // RLS auto-scopes both queries to the signed-in user's clinic.
  const [{ data: docRows, error: dErr }, { data: availRows }] = await Promise.all([
    supabase
      .from("doctors")
      .select(
        "id, display_name, qualifications, bio, photo_url, registration_no, display_order, is_active, created_at, years_experience, trained_at, phone, email, primary_specialty, visiting, visiting_note, status, languages",
      )
      .order("display_order", { ascending: true }),
    supabase
      .from("doctor_availability")
      .select("doctor_id, weekday, start_time, end_time"),
  ]);

  if (dErr) {
    console.error("[admin-doctors] doctors query failed:", dErr.message);
    return [];
  }

  const scheduleByDoctor = buildScheduleByDoctor((availRows ?? []) as AvailabilityRow[]);

  return (docRows ?? []).map((r: DoctorRow): Doctor => {
    const palette = avatarFor(r.id);
    return {
      id:                  r.id,
      name:                r.display_name,
      initials:            initialsOf(r.display_name),
      avatarBg:            palette.bg,
      avatarFg:            palette.fg,
      photoUrl:            r.photo_url ?? undefined,
      qualifications:      r.qualifications ? r.qualifications.split(",").map((s) => s.trim()).filter(Boolean) : [],
      registrationNumber:  r.registration_no ?? "",
      primarySpecialty:    coerceSpecialty(r.primary_specialty),
      subSpecialties:      [],
      trainedAt:           r.trained_at ?? "",
      bio:                 r.bio ?? "",
      languages:           coerceLocales(r.languages),
      phone:               r.phone ?? "",
      email:               r.email ?? undefined,
      whatsappOptIn:       false,
      status:              coerceStatus(r.status, r.is_active),
      visiting:            r.visiting ?? false,
      visitingNote:        r.visiting_note ?? undefined,
      joinedOn:            r.created_at.slice(0, 10),
      schedule:            scheduleByDoctor[r.id] ?? {},
      services:            [],
      stats: {
        yearsExperience:        r.years_experience ?? 0,
        patientsServed:         0,
        appointmentsCompleted:  0,
        avgRating:              0,
        reviewCount:            0,
      },
      reviews: [],
    };
  });
}

// =============================================================================
// Single-doctor fetch
// =============================================================================

async function getLiveDoctorById(id: string): Promise<Doctor | null> {
  // Reuse the list fetcher and pick — keeps the mapping logic in one place,
  // and the list size per clinic is small.
  const all = await getLiveDoctors();
  return all.find((d) => d.id === id) ?? null;
}

// =============================================================================
// Public entry points
// =============================================================================

export async function getAdminDoctorsData(): Promise<Doctor[]> {
  if (useMockData()) return DOCTORS;
  return getLiveDoctors();
}

export async function getAdminDoctorById(id: string): Promise<Doctor | null> {
  if (useMockData()) {
    const { findDoctorById } = await import("@/lib/doctors-data");
    return findDoctorById(id) ?? null;
  }
  return getLiveDoctorById(id);
}
