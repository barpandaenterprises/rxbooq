/**
 * Booking lookups for the NewAppointmentDialog (and later the public booking
 * flow): services, doctors, recent patients.
 *
 * Mock mode returns the static BOOKING_SERVICES / BOOKING_DOCTORS / a small
 * synthetic recent-patient list. Live mode reads from Supabase.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { BOOKING_DOCTORS, BOOKING_SERVICES } from "@/lib/booking-data";

export type BookingLookupService = {
  id:              string;
  name:            string;
  durationMinutes: number;
  feeLabel:        string;
  icon:            string;
  description:     string;
};

export type BookingLookupDoctor = {
  id:         string;
  name:       string;
  credential: string;
  initials:   string;
};

export type BookingLookupRecentPatient = {
  id:        string;
  name:      string;
  initials:  string;
  /** Display-formatted local number, e.g. "98765 12342" */
  phone:     string;
  phoneE164: string;
  lang:      "EN" | "HI" | "OR";
  bg:        string;
  fg:        string;
};

export type BookingLookups = {
  services:       BookingLookupService[];
  doctors:        BookingLookupDoctor[];
  recentPatients: BookingLookupRecentPatient[];
};

// =============================================================================
// Mock
// =============================================================================

const MOCK_RECENT: BookingLookupRecentPatient[] = [
  { id: "P-1284", name: "Anita Sahu",    initials: "AS", phone: "98765 12342", phoneE164: "+919876512342", lang: "EN", bg: "#FFE7EC", fg: "#EE344E" },
  { id: "P-1283", name: "Bidyut Panda",  initials: "BP", phone: "96543 22018", phoneE164: "+919654322018", lang: "OR", bg: "#E6F1FA", fg: "#0E5087" },
  { id: "P-1278", name: "Manoj Behera",  initials: "MB", phone: "95672 34111", phoneE164: "+919567234111", lang: "OR", bg: "#E6F4EC", fg: "#3a8b5e" },
  { id: "P-1273", name: "Karthik Rao",   initials: "KR", phone: "70084 91144", phoneE164: "+917008491144", lang: "EN", bg: "#FFE7EC", fg: "#EE344E" },
  { id: "P-1271", name: "Pinky Sahu",    initials: "PS", phone: "87224 55501", phoneE164: "+918722455501", lang: "OR", bg: "#E6F1FA", fg: "#0E5087" },
  { id: "P-1262", name: "Laxmi Pradhan", initials: "LP", phone: "90324 55512", phoneE164: "+919032455512", lang: "HI", bg: "#F4E5FA", fg: "#6b3aa1" },
];

const MOCK_LOOKUPS: BookingLookups = {
  services: BOOKING_SERVICES.map((s) => ({
    id:              s.id,
    name:            s.name,
    durationMinutes: parseInt(s.duration, 10) || 30,
    feeLabel:        s.fee,
    icon:            s.icon,
    description:     s.description,
  })),
  doctors: BOOKING_DOCTORS.map((d) => ({
    id:         d.id,
    name:       d.name,
    credential: d.credential,
    initials:   d.initials,
  })),
  recentPatients: MOCK_RECENT,
};

// =============================================================================
// Helpers
// =============================================================================

function initialsOf(name: string): string {
  return name.replace(/^(Dr\.?\s+)/i, "")
    .split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: "#FFE7EC", fg: "#EE344E" },
  { bg: "#E6F4EC", fg: "#3a8b5e" },
  { bg: "#E6F1FA", fg: "#0E5087" },
  { bg: "#FFF8EC", fg: "#7a5c2b" },
  { bg: "#F4E5FA", fg: "#6b3aa1" },
];

function avatarFor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function localFromE164(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const local  = digits.slice(-10);
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : e164;
}

function langFromDb(s: string | null): "EN" | "HI" | "OR" {
  switch ((s ?? "").toLowerCase()) {
    case "hi": return "HI";
    case "or": return "OR";
    default:   return "EN";
  }
}

// =============================================================================
// Live fetcher
// =============================================================================

async function getLiveLookups(): Promise<BookingLookups> {
  const supabase = await serverClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const [
    { data: serviceRows, error: sErr },
    { data: doctorRows,  error: dErr },
    { data: recentAppts },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_inr")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("doctors")
      .select("id, display_name, qualifications")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("appointments")
      .select("starts_at, patient:patients ( id, full_name, phone_e164, language )")
      .gte("starts_at", cutoff.toISOString())
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);

  if (sErr || dErr) {
    console.error("[booking-lookups] query failed:", sErr?.message ?? dErr?.message);
    return { services: [], doctors: [], recentPatients: [] };
  }

  const services: BookingLookupService[] = (serviceRows ?? []).map((s) => ({
    id:              s.id,
    name:            s.name,
    durationMinutes: s.duration_minutes ?? 30,
    feeLabel:        s.price_inr ? `₹${s.price_inr.toLocaleString("en-IN")}` : "—",
    icon:            "fa-tooth",
    description:     "",
  }));

  const doctors: BookingLookupDoctor[] = (doctorRows ?? []).map((d) => ({
    id:         d.id,
    name:       d.display_name,
    credential: d.qualifications ?? "",
    initials:   initialsOf(d.display_name),
  }));

  // Deduplicate recent appts by patient id, preserving most-recent order.
  const seen = new Set<string>();
  const recentPatients: BookingLookupRecentPatient[] = [];
  type ApptWithPatient = {
    patient: { id: string; full_name: string; phone_e164: string; language: string | null }
           | { id: string; full_name: string; phone_e164: string; language: string | null }[]
           | null;
  };
  for (const a of (recentAppts ?? []) as ApptWithPatient[]) {
    const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
    if (!patient || seen.has(patient.id)) continue;
    seen.add(patient.id);
    const palette = avatarFor(patient.id);
    recentPatients.push({
      id:        patient.id,
      name:      patient.full_name,
      initials:  initialsOf(patient.full_name),
      phone:     localFromE164(patient.phone_e164),
      phoneE164: patient.phone_e164,
      lang:      langFromDb(patient.language),
      bg:        palette.bg,
      fg:        palette.fg,
    });
    if (recentPatients.length >= 12) break;
  }

  return { services, doctors, recentPatients };
}

// =============================================================================
// Public
// =============================================================================

export async function getBookingLookups(): Promise<BookingLookups> {
  if (useMockData()) return MOCK_LOOKUPS;
  return getLiveLookups();
}
