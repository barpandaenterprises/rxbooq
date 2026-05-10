/**
 * Demo booking catalog for the Mahakur tenant.
 *
 * In production these come from Supabase per-clinic — this static mirror
 * exists so the booking flow renders end-to-end before the data layer is wired.
 */

export type BookingService = {
  id: string;
  icon: string;
  name: string;
  duration: string;
  fee: string;
  description: string;
};

export type BookingDoctor = {
  id: string;
  name: string;
  credential: string;
  initials: string;
};

export const BOOKING_SERVICES: BookingService[] = [
  {
    id: "rct",
    icon: "fa-tooth",
    name: "Root Canal",
    duration: "45 min",
    fee: "₹2,500",
    description:
      "Single-sitting RCT with rotary endodontics. Anaesthesia included.",
  },
  {
    id: "imp",
    icon: "fa-teeth",
    name: "Dental Implants",
    duration: "60 min",
    fee: "Consult",
    description: "Initial assessment, X-ray review and treatment plan.",
  },
  {
    id: "brc",
    icon: "fa-grip-lines",
    name: "Braces & Aligners",
    duration: "30 min",
    fee: "₹500",
    description:
      "Orthodontic consult — metal, ceramic or clear aligner options.",
  },
  {
    id: "wht",
    icon: "fa-magic",
    name: "Teeth Whitening",
    duration: "45 min",
    fee: "₹3,500",
    description: "In-clinic whitening session, visible results in one visit.",
  },
  {
    id: "kid",
    icon: "fa-baby",
    name: "Kids Dentistry",
    duration: "30 min",
    fee: "₹400",
    description: "Pediatric checkup with fluoride application if needed.",
  },
  {
    id: "gen",
    icon: "fa-stethoscope",
    name: "General Checkup",
    duration: "20 min",
    fee: "₹300",
    description: "Full oral exam, scaling and personalised plan.",
  },
];

export const BOOKING_DOCTORS: BookingDoctor[] = [
  { id: "mm", name: "Dr. Manoranjan Mahakur", credential: "MDS, MPH, PHDMC", initials: "MM" },
  { id: "lp", name: "Dr. Lipsa Pradhan", credential: "MDS, Dental Surgeon", initials: "LP" },
  { id: "rs", name: "Dr. Rashmita Sahoo", credential: "BDS, Dental Surgeon", initials: "RS" },
];

export function findService(id: string | undefined | null): BookingService {
  return BOOKING_SERVICES.find((s) => s.id === id) ?? BOOKING_SERVICES[0]!;
}

export function findDoctor(id: string | undefined | null): BookingDoctor | null {
  if (!id) return null;
  return BOOKING_DOCTORS.find((d) => d.id === id) ?? null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Format a "YYYY-MM-DD" ISO date as e.g. "Mon, May 11".
 *
 * Important: parses the input as a *local* date, not UTC. Using `new Date(iso)`
 * would treat the string as UTC midnight, which in positive-offset timezones
 * (e.g. IST) reads back as the *previous* calendar day in some UI paths. We
 * pair this with `toLocalIso()` so the round-trip is timezone-stable.
 */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const day = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) return "";
  const d = new Date(y, m - 1, day);
  return `${DAY_LABELS[d.getDay()]!}, ${MONTH_LABELS[d.getMonth()]!} ${d.getDate()}`;
}

/**
 * Format a Date as "YYYY-MM-DD" using local components. Use this instead of
 * `date.toISOString().slice(0, 10)` whenever the iso represents "the day on the
 * patient's calendar" — `toISOString()` is UTC and slips by a day in many TZs.
 */
export function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "10:00" → "10:00 AM". Returns "" for invalid input. */
export function formatSlotLabel(short: string | null | undefined): string {
  if (!short) return "";
  const [hhStr, mmStr] = short.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "";
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return `${hour12}:${mm === 0 ? "00" : "30"} ${ampm}`;
}
