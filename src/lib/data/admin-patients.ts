/**
 * Data accessor for the /admin/patients screen.
 *
 * Aggregates last-visit / visit-count / lifetime-value per patient by joining
 * patients with their appointments (and services for the price).
 *
 * Phone numbers are masked client-side for display ("+91 98••• ••342"); the
 * full number stays on the row for actions like WhatsApp send.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { getCurrentStaffClinicId } from "@/lib/auth/current-user";

// =============================================================================
// Canonical type (matches AdminPatients UI expectations)
// =============================================================================

export type PatientLang = "EN" | "HI" | "OR";

export type PatientRow = {
  /** Stable id used in URLs — UUID in live mode, "P-1284" in mock mode. */
  id:              string;
  /** Human-readable label shown in the UI (always "P-XXXX" shape). */
  displayId:       string;
  name:            string;
  initials:        string;
  avatarBg:        string;
  avatarFg:        string;
  /** Display-masked phone, e.g. "+91 98••• ••342" */
  phone:           string;
  /** Full E.164 number for actions (WhatsApp send etc.) */
  phoneE164:       string;
  lang:            PatientLang;
  /** ISO YYYY-MM-DD or "" if no visits yet */
  lastVisit:       string;
  lastVisitLabel:  string;
  visits:          number;
  ltv:             number;
  tags:            string[];
  wa:              boolean;
};

// =============================================================================
// Mock data
// =============================================================================

const MOCK_PATIENTS: PatientRow[] = [
  { id: "P-1284", displayId: "P-1284", name: "Anita Sahu",     initials: "AS", avatarBg: "#FFE7EC", avatarFg: "#EE344E", phone: "+91 98••• ••342", phoneE164: "+919876512342", lang: "EN", lastVisit: "2026-05-09", lastVisitLabel: "9 May 2026",  visits: 7,  ltv: 12400, tags: ["VIP", "Root canal"], wa: true },
  { id: "P-1283", displayId: "P-1283", name: "Bidyut Panda",   initials: "BP", avatarBg: "#E6F1FA", avatarFg: "#0E5087", phone: "+91 96••• ••018", phoneE164: "+919654322018", lang: "OR", lastVisit: "2026-05-09", lastVisitLabel: "9 May 2026",  visits: 1,  ltv: 1200,  tags: ["New"],          wa: true },
  { id: "P-1281", displayId: "P-1281", name: "Sarita Mahanti", initials: "SM", avatarBg: "#FFF8EC", avatarFg: "#7a5c2b", phone: "+91 99••• ••445", phoneE164: "+919937823445", lang: "HI", lastVisit: "2026-05-02", lastVisitLabel: "2 May 2026",  visits: 4,  ltv: 8600,  tags: ["No-show"],      wa: true },
  { id: "P-1278", displayId: "P-1278", name: "Manoj Behera",   initials: "MB", avatarBg: "#E6F4EC", avatarFg: "#3a8b5e", phone: "+91 95••• ••111", phoneE164: "+919567234111", lang: "OR", lastVisit: "2026-04-28", lastVisitLabel: "28 Apr 2026", visits: 2,  ltv: 4200,  tags: ["Implants"],     wa: true },
  { id: "P-1276", displayId: "P-1276", name: "Rajesh Mishra",  initials: "RM", avatarBg: "#F4E5FA", avatarFg: "#6b3aa1", phone: "+91 94••• ••111", phoneE164: "+919437011111", lang: "HI", lastVisit: "2026-04-24", lastVisitLabel: "24 Apr 2026", visits: 3,  ltv: 3800,  tags: [],               wa: false },
  { id: "P-1273", displayId: "P-1273", name: "Karthik Rao",    initials: "KR", avatarBg: "#FFE7EC", avatarFg: "#EE344E", phone: "+91 70••• ••144", phoneE164: "+917008491144", lang: "EN", lastVisit: "2026-04-20", lastVisitLabel: "20 Apr 2026", visits: 5,  ltv: 9750,  tags: ["Root canal"],   wa: true },
  { id: "P-1271", displayId: "P-1271", name: "Pinky Sahu",     initials: "PS", avatarBg: "#E6F1FA", avatarFg: "#0E5087", phone: "+91 87••• ••501", phoneE164: "+918722455501", lang: "OR", lastVisit: "2026-04-18", lastVisitLabel: "18 Apr 2026", visits: 6,  ltv: 2100,  tags: ["Pediatric"],    wa: true },
  { id: "P-1268", displayId: "P-1268", name: "Susmita Dash",   initials: "SD", avatarBg: "#FFF8EC", avatarFg: "#7a5c2b", phone: "+91 99••• ••015", phoneE164: "+919922033015", lang: "EN", lastVisit: "2026-04-15", lastVisitLabel: "15 Apr 2026", visits: 9,  ltv: 18300, tags: ["VIP"],          wa: true },
  { id: "P-1265", displayId: "P-1265", name: "Suresh Pati",    initials: "SP", avatarBg: "#E6F4EC", avatarFg: "#3a8b5e", phone: "+91 89••• ••445", phoneE164: "+918923011445", lang: "OR", lastVisit: "2026-04-12", lastVisitLabel: "12 Apr 2026", visits: 14, ltv: 24500, tags: ["Braces"],       wa: true },
  { id: "P-1262", displayId: "P-1262", name: "Laxmi Pradhan",  initials: "LP", avatarBg: "#F4E5FA", avatarFg: "#6b3aa1", phone: "+91 90••• ••512", phoneE164: "+919032455512", lang: "HI", lastVisit: "2026-04-08", lastVisitLabel: "8 Apr 2026",  visits: 2,  ltv: 2800,  tags: ["Cancelled"],    wa: false },
  { id: "P-1259", displayId: "P-1259", name: "Priya Sahu",     initials: "PS", avatarBg: "#FFE7EC", avatarFg: "#EE344E", phone: "+91 93••• ••901", phoneE164: "+919345678901", lang: "OR", lastVisit: "2026-04-07", lastVisitLabel: "7 Apr 2026",  visits: 3,  ltv: 5400,  tags: ["Root canal"],   wa: true },
  { id: "P-1257", displayId: "P-1257", name: "Anita Mohanti",  initials: "AM", avatarBg: "#E6F1FA", avatarFg: "#0E5087", phone: "+91 98••• ••611", phoneE164: "+919812356611", lang: "EN", lastVisit: "2026-04-05", lastVisitLabel: "5 Apr 2026",  visits: 8,  ltv: 14200, tags: [],               wa: true },
];

// =============================================================================
// Helpers
// =============================================================================

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: "#FFE7EC", fg: "#EE344E" },
  { bg: "#E6F4EC", fg: "#3a8b5e" },
  { bg: "#E6F1FA", fg: "#0E5087" },
  { bg: "#FFF8EC", fg: "#7a5c2b" },
  { bg: "#F4E5FA", fg: "#6b3aa1" },
  { bg: "#E1F0F4", fg: "#2b5c7a" },
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarFor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function maskPhone(e164: string): string {
  // "+919876512342" -> "+91 98••• ••342"
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 10) return e164;
  // Take last 10 digits as the local number for India.
  const local = digits.slice(-10);
  const prefix = `+${digits.slice(0, digits.length - 10)}`;
  return `${prefix} ${local.slice(0, 2)}••• ••${local.slice(7)}`;
}

function shortPatientId(uuid: string): string {
  // "abcd1234-...." -> "P-1234" — last 4 chars of the UUID as a stable suffix.
  const clean = uuid.replace(/-/g, "");
  return `P-${clean.slice(-4).toUpperCase()}`;
}

function langFromDb(s: string | null): PatientLang {
  switch ((s ?? "").toLowerCase()) {
    case "hi": return "HI";
    case "or": return "OR";
    default:   return "EN";
  }
}

function formatVisitLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day:   "numeric",
    month: "short",
    year:  "numeric",
  }).format(d);
}

// =============================================================================
// Live fetcher
// =============================================================================

type DbPatient = {
  id:              string;
  full_name:       string;
  phone_e164:      string;
  language:        string | null;
  whatsapp_opt_in: boolean;
  tags:            string[] | null;
  created_at:      string;
};

type DbAppointment = {
  patient_id: string;
  starts_at:  string;
  status:     string;
};

async function getLivePatients(): Promise<PatientRow[]> {
  // Explicit clinic scope — see getCurrentStaffClinicId comment for why we
  // can't rely on RLS alone here (superadmin bypass).
  const clinicId = await getCurrentStaffClinicId();
  if (!clinicId) return [];

  const supabase = await serverClient();
  const [{ data: patientRows, error: pErr }, { data: apptRows }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, phone_e164, language, whatsapp_opt_in, tags, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("patient_id, starts_at, status")
      .eq("clinic_id", clinicId),
  ]);

  if (pErr) {
    console.error("[admin-patients] patients query failed:", pErr.message);
    return [];
  }

  // Aggregate appointments per patient.
  // LTV used to sum service.price_inr; without a service link the value is
  // unknown and reports as 0 until a separate billing model lands.
  type Agg = { visits: number; ltv: number; lastVisit: string };
  const aggByPatient = new Map<string, Agg>();
  for (const a of (apptRows ?? []) as DbAppointment[]) {
    if (!a.patient_id) continue;
    const existing = aggByPatient.get(a.patient_id) ?? { visits: 0, ltv: 0, lastVisit: "" };
    existing.visits += 1;
    const dateIso = (a.starts_at ?? "").slice(0, 10);
    if (dateIso && dateIso > existing.lastVisit) existing.lastVisit = dateIso;
    aggByPatient.set(a.patient_id, existing);
  }

  return (patientRows ?? []).map((p: DbPatient): PatientRow => {
    const agg     = aggByPatient.get(p.id) ?? { visits: 0, ltv: 0, lastVisit: "" };
    const palette = avatarFor(p.id);
    return {
      id:             p.id,
      displayId:      shortPatientId(p.id),
      name:           p.full_name,
      initials:       initialsOf(p.full_name),
      avatarBg:       palette.bg,
      avatarFg:       palette.fg,
      phone:          maskPhone(p.phone_e164),
      phoneE164:      p.phone_e164,
      lang:           langFromDb(p.language),
      lastVisit:      agg.lastVisit,
      lastVisitLabel: formatVisitLabel(agg.lastVisit),
      visits:         agg.visits,
      ltv:            agg.ltv,
      tags:           p.tags ?? [],
      wa:             p.whatsapp_opt_in,
    };
  });
}

// =============================================================================
// Public entry point
// =============================================================================

export async function getAdminPatientsData(): Promise<PatientRow[]> {
  if (useMockData()) return MOCK_PATIENTS;
  return getLivePatients();
}
