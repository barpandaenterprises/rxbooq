/**
 * Data accessor for /admin/analytics.
 *
 * Live queries (RLS-scoped to caller's clinic):
 *   - period KPIs (new patients, bookings, no-show rate, revenue)
 *   - bookings over time, split by source (site / walkin / phone / whatsapp)
 *   - top services by completed/confirmed counts
 *   - language mix across all patients
 *   - repeat no-show patients
 *
 * MICROSITE (website visitors, GMB impressions, etc.) is intentionally left
 * as mock — it's third-party data that needs separate Google Analytics +
 * Google Business Profile integrations.
 */

import { serverClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/current-user";
import { useMockData } from "@/lib/feature-flags";

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export type AnalyticsKpi = {
  value:        string;
  rawValue:     number;
  deltaPct:     number;   // signed
  deltaLabel:   string;
  deltaUp:      boolean;
};

export type AnalyticsKpis = {
  newPatients:  AnalyticsKpi;
  bookings:     AnalyticsKpi;
  noShowRate:   AnalyticsKpi;
  revenue:      AnalyticsKpi;
};

export type BookingPoint = {
  d:       string;  // "Apr 10"
  online:  number;
  walkin:  number;
  phone:   number;
};

export type ServiceBar = {
  name: string;
  conf: number;  // confirmed/booked count (active)
  comp: number;  // completed count
};

export type LangSlice = {
  label: "Odia" | "Hindi" | "English";
  value: number;
  color: string;
};

export type NoShowRow = {
  name:     string;
  initials: string;
  count:    number;
  last:     string;  // "14 min ago"
  avBg:     string;
  avFg:     string;
};

export type MicrositeTile = {
  label: string;
  value: string;
  delta: string;
  up:    boolean;
  data:  number[];
};

export type AnalyticsFilterOption = {
  id:    string;
  label: string;
};

export type AdminAnalyticsData = {
  period:           AnalyticsPeriod;
  /** Inclusive ISO date strings (YYYY-MM-DD) for the active window — used in subtitle labels. */
  windowStart:      string;
  windowEnd:        string;
  filters: {
    doctorId:  string | null;
    serviceId: string | null;
  };
  /** Pickers — populated from live DB so the FilterBar shows real entities. */
  doctorOptions:    AnalyticsFilterOption[];
  serviceOptions:   AnalyticsFilterOption[];
  kpis:             AnalyticsKpis;
  bookingTimeline:  BookingPoint[];
  topServices:      ServiceBar[];
  languageMix:      LangSlice[];
  noShows:          NoShowRow[];
  microsite:        MicrositeTile[];   // mock-only for now
};

// =============================================================================
// Mocks (used in MOCK_DATA mode; also seed the microsite tiles in live mode)
// =============================================================================

const MOCK_KPIS: Record<AnalyticsPeriod, AnalyticsKpis> = {
  "7d": {
    newPatients: { value: "22",      rawValue: 22,   deltaPct: 18,  deltaLabel: "+18%", deltaUp: true  },
    bookings:    { value: "96",      rawValue: 96,   deltaPct: 9,   deltaLabel: "+9%",  deltaUp: true  },
    noShowRate:  { value: "4.1%",    rawValue: 4.1,  deltaPct: -34, deltaLabel: "−2.1 pts", deltaUp: true },
    revenue:     { value: "₹84,000", rawValue: 84_000, deltaPct: 12, deltaLabel: "+12%", deltaUp: true },
  },
  "30d": {
    newPatients: { value: "84",      rawValue: 84,   deltaPct: 22,  deltaLabel: "+22%", deltaUp: true  },
    bookings:    { value: "412",     rawValue: 412,  deltaPct: 14,  deltaLabel: "+14%", deltaUp: true  },
    noShowRate:  { value: "6.3%",    rawValue: 6.3,  deltaPct: -22, deltaLabel: "−1.8 pts", deltaUp: true },
    revenue:     { value: "₹3.4 L",  rawValue: 340_000, deltaPct: 18, deltaLabel: "+18%", deltaUp: true },
  },
  "90d": {
    newPatients: { value: "248",     rawValue: 248,  deltaPct: 28,  deltaLabel: "+28%", deltaUp: true  },
    bookings:    { value: "1,240",   rawValue: 1240, deltaPct: 19,  deltaLabel: "+19%", deltaUp: true  },
    noShowRate:  { value: "7.0%",    rawValue: 7.0,  deltaPct: -8,  deltaLabel: "−0.6 pts", deltaUp: true },
    revenue:     { value: "₹10.2 L", rawValue: 1_020_000, deltaPct: 22, deltaLabel: "+22%", deltaUp: true },
  },
};

const MOCK_BOOKING_TIMELINE: BookingPoint[] = [
  { d: "Apr 10", online: 14, walkin: 6,  phone: 4 },
  { d: "Apr 12", online: 18, walkin: 7,  phone: 5 },
  { d: "Apr 14", online: 22, walkin: 5,  phone: 3 },
  { d: "Apr 16", online: 19, walkin: 8,  phone: 6 },
  { d: "Apr 18", online: 24, walkin: 9,  phone: 5 },
  { d: "Apr 20", online: 28, walkin: 7,  phone: 4 },
  { d: "Apr 22", online: 25, walkin: 10, phone: 6 },
  { d: "Apr 24", online: 32, walkin: 8,  phone: 5 },
  { d: "Apr 26", online: 30, walkin: 11, phone: 7 },
  { d: "Apr 28", online: 36, walkin: 9,  phone: 4 },
  { d: "Apr 30", online: 34, walkin: 12, phone: 6 },
  { d: "May 02", online: 40, walkin: 10, phone: 5 },
  { d: "May 04", online: 38, walkin: 11, phone: 7 },
  { d: "May 06", online: 44, walkin: 9,  phone: 5 },
  { d: "May 08", online: 48, walkin: 13, phone: 6 },
];

const MOCK_SERVICES: ServiceBar[] = [
  { name: "Root Canal", conf: 42, comp: 30 },
  { name: "Cleaning",   conf: 36, comp: 28 },
  { name: "Braces",     conf: 24, comp: 18 },
  { name: "Implants",   conf: 18, comp: 12 },
  { name: "Whitening",  conf: 14, comp: 10 },
  { name: "Pediatric",  conf: 12, comp: 8 },
];

const MOCK_LANG: LangSlice[] = [
  { label: "Odia",    value: 54, color: "#0168B3" },
  { label: "Hindi",   value: 28, color: "#0E5087" },
  { label: "English", value: 18, color: "#EE344E" },
];

const MOCK_NO_SHOWS: NoShowRow[] = [
  { name: "Sarita Mahanti", count: 3, last: "14 min ago", initials: "SM", avBg: "#FFF8EC", avFg: "#7a5c2b" },
  { name: "Laxmi Pradhan",  count: 2, last: "2 days ago", initials: "LP", avBg: "#F4E5FA", avFg: "#6b3aa1" },
  { name: "Ravi Naik",      count: 2, last: "5 days ago", initials: "RN", avBg: "#FFE7EC", avFg: "#EE344E" },
];

const MICROSITE: MicrositeTile[] = [
  { label: "Website visitors",   value: "4,260",  delta: "+18%", up: true,  data: [20, 22, 24, 28, 32, 30, 38, 42, 46, 48, 50, 55, 62, 66, 72] },
  { label: "GMB impressions",    value: "12,840", delta: "+9%",  up: true,  data: [60, 65, 62, 68, 72, 70, 78, 82, 80, 86, 90, 92, 95, 100, 108] },
  { label: "Direction requests", value: "318",    delta: "+24%", up: true,  data: [8, 10, 12, 11, 14, 15, 18, 20, 22, 24, 26, 28, 30, 32, 34] },
  { label: "Calls from GMB",     value: "186",    delta: "−4%",  up: false, data: [18, 20, 19, 22, 24, 21, 20, 18, 17, 18, 16, 15, 17, 16, 15] },
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
];

function avatarFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function initialsOf(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function daysFor(period: AnalyticsPeriod): number {
  return period === "7d" ? 7 : period === "30d" ? 30 : 90;
}

function formatRevenue(rupees: number): string {
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)} L`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function pctDelta(current: number, prev: number): number {
  if (prev === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - prev) / prev) * 100);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 60)        return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)        return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function bucketLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "Asia/Kolkata" });
}

// =============================================================================
// Live fetcher
// =============================================================================

async function getLiveAnalytics(
  period:    AnalyticsPeriod,
  doctorId:  string | null,
  serviceId: string | null,
): Promise<AdminAnalyticsData> {
  const membership = await getActiveMembership();
  if (!membership) {
    return emptyAnalytics();
  }
  const clinicId = membership.clinicId;

  // A doctor login gets a self-only view: force the doctor filter to their own
  // profile and ignore any client-supplied filter. Unlinked → empty.
  let effectiveDoctorId = doctorId;
  if (membership.role === "doctor") {
    if (!membership.doctorId) return emptyAnalytics();
    effectiveDoctorId = membership.doctorId;
  }

  const supabase = await serverClient();
  const days     = daysFor(period);
  const now      = Date.now();
  const startMs  = now - days * 86_400_000;
  const prevStartMs = now - 2 * days * 86_400_000;

  // Build the appointments query, applying the doctor filter at the DB layer.
  // The serviceId filter is dropped post-redesign (appointments no longer have
  // a service link). Top-services and revenue KPIs are zeroed below until a
  // separate billing/department-rollup model lands.
  void serviceId;
  let apptQ = supabase
    .from("appointments")
    .select("starts_at, status, source, doctor_id")
    .eq("clinic_id", clinicId)
    .gte("starts_at", new Date(prevStartMs).toISOString());
  if (effectiveDoctorId) apptQ = apptQ.eq("doctor_id", effectiveDoctorId);

  // New-patients KPI: scope to the doctor's assigned patients in a doctor view.
  let patientsQ = supabase
    .from("patients")
    .select("created_at, language")
    .eq("clinic_id", clinicId);
  if (membership.role === "doctor" && effectiveDoctorId) {
    patientsQ = patientsQ.eq("assigned_doctor_id", effectiveDoctorId);
  }

  // Doctor selector options: a doctor only ever sees themselves.
  let doctorsQ = supabase
    .from("doctors")
    .select("id, display_name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (membership.role === "doctor" && effectiveDoctorId) {
    doctorsQ = doctorsQ.eq("id", effectiveDoctorId);
  }

  const [{ data: appts }, { data: patients }, { data: doctors }] = await Promise.all([
    apptQ,
    patientsQ,
    doctorsQ,
  ]);

  type ApptRow = {
    starts_at: string;
    status:    string | null;
    source:    string | null;
  };
  const apptRows = (appts ?? []) as ApptRow[];

  // ---- Period KPIs -------------------------------------------------------
  const inCurrent = (iso: string) => new Date(iso).getTime() >= startMs;
  const inPrev    = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= prevStartMs && t < startMs;
  };

  const newCur     = (patients ?? []).filter((p) => inCurrent(p.created_at)).length;
  const newPrev    = (patients ?? []).filter((p) => inPrev(p.created_at)).length;
  const bookingsCur  = apptRows.filter((a) => inCurrent(a.starts_at)).length;
  const bookingsPrev = apptRows.filter((a) => inPrev(a.starts_at)).length;

  const noShowCur    = apptRows.filter((a) => inCurrent(a.starts_at) && a.status === "no_show").length;
  const noShowPrev   = apptRows.filter((a) => inPrev(a.starts_at) && a.status === "no_show").length;
  const noShowRate     = bookingsCur  > 0 ? +(noShowCur / bookingsCur * 100).toFixed(1) : 0;
  const noShowRatePrev = bookingsPrev > 0 ? +(noShowPrev / bookingsPrev * 100).toFixed(1) : 0;

  // Revenue used to derive from service.price_inr; with no service link on
  // appointments it's not computable yet. See admin-patient-chart for the
  // matching TODO — surface revenue via a billing model later.
  const revCur  = 0;
  const revPrev = 0;

  const kpis: AnalyticsKpis = {
    newPatients: {
      value:    String(newCur),
      rawValue: newCur,
      deltaPct: pctDelta(newCur, newPrev),
      deltaLabel: `${newCur - newPrev >= 0 ? "+" : "−"}${Math.abs(newCur - newPrev)}`,
      deltaUp:  newCur >= newPrev,
    },
    bookings: {
      value:    bookingsCur.toLocaleString("en-IN"),
      rawValue: bookingsCur,
      deltaPct: pctDelta(bookingsCur, bookingsPrev),
      deltaLabel: `${pctDelta(bookingsCur, bookingsPrev) >= 0 ? "+" : ""}${pctDelta(bookingsCur, bookingsPrev)}%`,
      deltaUp:  bookingsCur >= bookingsPrev,
    },
    noShowRate: {
      value:    `${noShowRate}%`,
      rawValue: noShowRate,
      deltaPct: pctDelta(noShowRate, noShowRatePrev),
      deltaLabel: `${noShowRate - noShowRatePrev <= 0 ? "−" : "+"}${Math.abs(noShowRate - noShowRatePrev).toFixed(1)} pts`,
      deltaUp:  noShowRate <= noShowRatePrev,    // lower is better
    },
    revenue: {
      value:    formatRevenue(revCur),
      rawValue: revCur,
      deltaPct: pctDelta(revCur, revPrev),
      deltaLabel: `${pctDelta(revCur, revPrev) >= 0 ? "+" : ""}${pctDelta(revCur, revPrev)}%`,
      deltaUp:  revCur >= revPrev,
    },
  };

  // ---- Bookings over time, grouped by source + 2-day bucket -------------
  // (Matching the mock cadence — every other day for ~15 ticks on 30d.)
  const bucketSizeMs = days >= 30 ? 2 * 86_400_000 : 86_400_000;
  const bucketCount  = Math.ceil(days / (bucketSizeMs / 86_400_000));
  const points: BookingPoint[] = Array.from({ length: bucketCount }).map((_, i) => {
    const t = startMs + i * bucketSizeMs;
    return { d: bucketLabel(new Date(t)), online: 0, walkin: 0, phone: 0 };
  });
  for (const a of apptRows) {
    const t = new Date(a.starts_at).getTime();
    if (t < startMs) continue;
    const idx = Math.min(bucketCount - 1, Math.floor((t - startMs) / bucketSizeMs));
    const bucket = points[idx]!;
    switch (a.source) {
      case "site":
      case "whatsapp": bucket.online++; break;
      case "walkin":   bucket.walkin++; break;
      case "phone":    bucket.phone++;  break;
      default:         bucket.online++; break;
    }
  }

  // ---- Top services -------------------------------------------------------
  // Removed in the Department-first redesign — there's no service link on the
  // appointment any more. Replace with a per-department breakdown when the
  // dashboard catches up. For now this widget renders an empty state.
  const topServices: ServiceBar[] = [];

  // ---- Language mix ------------------------------------------------------
  const langCount = { Odia: 0, Hindi: 0, English: 0 };
  for (const p of patients ?? []) {
    const l = (p.language ?? "en").toLowerCase();
    if (l === "or") langCount.Odia++;
    else if (l === "hi") langCount.Hindi++;
    else langCount.English++;
  }
  const langTotal = langCount.Odia + langCount.Hindi + langCount.English || 1;
  const languageMix: LangSlice[] = [
    { label: "Odia",    value: Math.round(langCount.Odia    * 100 / langTotal), color: "#0168B3" },
    { label: "Hindi",   value: Math.round(langCount.Hindi   * 100 / langTotal), color: "#0E5087" },
    { label: "English", value: Math.round(langCount.English * 100 / langTotal), color: "#EE344E" },
  ];

  // ---- Repeat no-shows ---------------------------------------------------
  let noShowQ = supabase
    .from("appointments")
    .select("starts_at, patient:patients(id, full_name)")
    .eq("clinic_id", clinicId)
    .eq("status", "no_show")
    .gte("starts_at", new Date(startMs).toISOString())
    .order("starts_at", { ascending: false });
  if (effectiveDoctorId) noShowQ = noShowQ.eq("doctor_id", effectiveDoctorId);
  const { data: noShowAppts } = await noShowQ;

  type NS = { starts_at: string; patient: { id: string; full_name: string } | { id: string; full_name: string }[] | null };
  const nsAgg = new Map<string, { name: string; count: number; lastIso: string }>();
  for (const r of (noShowAppts ?? []) as NS[]) {
    const p = Array.isArray(r.patient) ? r.patient[0] : r.patient;
    if (!p) continue;
    const cur = nsAgg.get(p.id) ?? { name: p.full_name, count: 0, lastIso: r.starts_at };
    cur.count++;
    if (new Date(r.starts_at).getTime() > new Date(cur.lastIso).getTime()) cur.lastIso = r.starts_at;
    nsAgg.set(p.id, cur);
  }
  const noShows: NoShowRow[] = Array.from(nsAgg.values())
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((r) => {
      const palette = avatarFor(r.name);
      return {
        name:     r.name,
        initials: initialsOf(r.name),
        count:    r.count,
        last:     timeAgo(r.lastIso),
        avBg:     palette.bg,
        avFg:     palette.fg,
      };
    });

  const windowStartIso = new Date(startMs).toISOString().slice(0, 10);
  const windowEndIso   = new Date(now).toISOString().slice(0, 10);

  return {
    period,
    windowStart:      windowStartIso,
    windowEnd:        windowEndIso,
    filters:          { doctorId: effectiveDoctorId, serviceId },
    doctorOptions:    (doctors ?? []).map((d) => ({ id: d.id, label: d.display_name })),
    serviceOptions:   [],   // service filter retired with the schema drop
    kpis,
    bookingTimeline:  points,
    topServices,
    languageMix,
    noShows,
    microsite:        MICROSITE,
  };
}

function emptyAnalytics(): AdminAnalyticsData {
  // Returned when the signed-in user has no clinic linkage — happens for
  // pure superadmins browsing /admin/analytics without a clinic_users row.
  const today = new Date().toISOString().slice(0, 10);
  const zeroKpi = { value: "0", rawValue: 0, deltaPct: 0, deltaLabel: "+0", deltaUp: true };
  return {
    period:           "7d",
    windowStart:      today,
    windowEnd:        today,
    filters:          { doctorId: null, serviceId: null },
    doctorOptions:    [],
    serviceOptions:   [],
    kpis: {
      newPatients: zeroKpi,
      bookings:    zeroKpi,
      noShowRate:  { ...zeroKpi, value: "0%" },
      revenue:     { ...zeroKpi, value: "₹0" },
    },
    bookingTimeline:  [],
    topServices:      [],
    languageMix:      [],
    noShows:          [],
    microsite:        MICROSITE,
  };
}

// =============================================================================
// Public entry point
// =============================================================================

export type AnalyticsFilters = {
  doctorId?:  string | null;
  serviceId?: string | null;
};

function mockWindow(period: AnalyticsPeriod): { start: string; end: string } {
  const days   = daysFor(period);
  const now    = Date.now();
  const start  = new Date(now - days * 86_400_000).toISOString().slice(0, 10);
  const end    = new Date(now).toISOString().slice(0, 10);
  return { start, end };
}

export async function getAdminAnalyticsData(
  period:   AnalyticsPeriod,
  filters:  AnalyticsFilters = {},
): Promise<AdminAnalyticsData> {
  const doctorId  = filters.doctorId  ?? null;
  const serviceId = filters.serviceId ?? null;

  if (useMockData()) {
    const { start, end } = mockWindow(period);
    return {
      period,
      windowStart:     start,
      windowEnd:       end,
      filters:         { doctorId, serviceId },
      doctorOptions:   [
        { id: "mm",  label: "Dr. Manoranjan Mahakur" },
        { id: "lp",  label: "Dr. Lipsa Pradhan" },
        { id: "rs",  label: "Dr. Rashmita Sahoo" },
      ],
      serviceOptions:  MOCK_SERVICES.map((s) => ({ id: s.name.toLowerCase().replace(/\s+/g, "-"), label: s.name })),
      kpis:            MOCK_KPIS[period],
      bookingTimeline: MOCK_BOOKING_TIMELINE,
      topServices:     MOCK_SERVICES,
      languageMix:     MOCK_LANG,
      noShows:         MOCK_NO_SHOWS,
      microsite:       MICROSITE,
    };
  }
  return getLiveAnalytics(period, doctorId, serviceId);
}
