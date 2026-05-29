/**
 * Doctors catalog — single source of truth.
 *
 * Shapes mirror the eventual Supabase `doctors` and `doctor_availability`
 * tables so when the data layer is wired only this file gets replaced.
 *
 * Booking-related code (booking-data.ts) derives its smaller `BookingDoctor`
 * shape from this file, so adding a doctor here makes them bookable.
 */

export type Locale = "EN" | "HI" | "OR";
export type DoctorStatus = "active" | "on_leave" | "inactive";

export type Specialty =
  | "Conservative Dentistry"
  | "Endodontics"
  | "Orthodontics"
  | "Pediatric Dentistry"
  | "Prosthodontics"
  | "Oral Surgery"
  | "General Dentistry"
  | "Cosmetology & Implantology"
  | "Other";

export const SPECIALTIES: Specialty[] = [
  "Conservative Dentistry",
  "Endodontics",
  "Orthodontics",
  "Pediatric Dentistry",
  "Prosthodontics",
  "Oral Surgery",
  "General Dentistry",
  "Cosmetology & Implantology",
  "Other",
];

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export type TimeRange = { start: string; end: string }; // "09:00" / "18:30"

export type WeeklySchedule = Partial<Record<Weekday, TimeRange[]>>;

export type DoctorStats = {
  yearsExperience: number;
  patientsServed: number;
  appointmentsCompleted: number;
  avgRating: number;
  reviewCount: number;
};

export type Review = {
  id: string;
  patientInitials: string;
  patientName: string;
  rating: number;
  date: string;
  body: string;
};

export type Doctor = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  /** Public URL to the doctor's photo (public-assets bucket). Empty if none uploaded. */
  photoUrl?: string;
  /** Comma-stringable list like "MDS, MPH, PHDMC" */
  qualifications: string[];
  registrationNumber: string;
  primarySpecialty: Specialty;
  subSpecialties: string[];
  trainedAt: string;
  bio: string;
  languages: Locale[];
  phone: string;
  email?: string;
  whatsappOptIn: boolean;
  status: DoctorStatus;
  /** True = visiting consultant (limited hours). False = everyday team. */
  visiting: boolean;
  visitingNote?: string; // e.g. "Last Saturday each month"
  joinedOn: string;
  schedule: WeeklySchedule;
  /** Service IDs (matches BOOKING_SERVICES). */
  services: string[];
  stats: DoctorStats;
  reviews: Review[];
  /** FK to public.departments (added in migration 0010). Null = unassigned. */
  departmentId?: string | null;
};

// ---------- Mock catalog ----------

export const DOCTORS: Doctor[] = [
  {
    id: "mm",
    name: "Dr. Manoranjan Mahakur",
    initials: "MM",
    avatarBg: "#FFE7EC",
    avatarFg: "#EE344E",
    qualifications: ["MDS", "MPH", "PHDMC"],
    registrationNumber: "446/A",
    primarySpecialty: "Cosmetology & Implantology",
    subSpecialties: ["Conservative Dentistry", "Endodontics"],
    trainedAt: "BCB Dental College, Cuttack",
    bio: "Senior dental surgeon with two decades of practice in western Odisha. Consultant Cosmetologist and Implantologist with a focus on painless root canals, smile makeovers and dental implants.",
    languages: ["EN", "HI", "OR"],
    phone: "+91 82602 22828",
    email: "dr.manoranjan@mahakurdental.in",
    whatsappOptIn: true,
    status: "active",
    visiting: true,
    visitingNote: "Last Saturday each month",
    joinedOn: "2004-06-01",
    schedule: {
      sat: [{ start: "09:00", end: "14:00" }],
    },
    services: ["rct", "imp", "gen", "wht"],
    stats: {
      yearsExperience: 20,
      patientsServed: 8400,
      appointmentsCompleted: 12100,
      avgRating: 4.9,
      reviewCount: 312,
    },
    reviews: [
      { id: "r1", patientInitials: "PS", patientName: "Priya Sahu",      rating: 5, date: "2026-05-09", body: "Painless root canal in one sitting. Dr. Mahakur explained every step." },
      { id: "r2", patientInitials: "RM", patientName: "Rajesh Mishra",   rating: 5, date: "2026-04-22", body: "Excellent diagnostician. Got my treatment plan reviewed in detail." },
      { id: "r3", patientInitials: "AS", patientName: "Anita Sahu",      rating: 5, date: "2026-04-14", body: "Has handled my whole RCT case patiently. Truly worth the visit." },
    ],
  },
  {
    id: "lp",
    name: "Dr. Lipsa Pradhan",
    initials: "LP",
    avatarBg: "#E6F1FA",
    avatarFg: "#0E5087",
    qualifications: ["MDS", "MPHM"],
    registrationNumber: "1284/B",
    primarySpecialty: "General Dentistry",
    subSpecialties: ["Orthodontics", "Pediatric Dentistry"],
    trainedAt: "SCB Dental College, Cuttack",
    bio: "Everyday dentist at the clinic — handles routine cleaning, orthodontics adjustments, and pediatric care. Patients love her gentle hands and patience with anxious cases.",
    languages: ["EN", "HI", "OR"],
    phone: "+91 82602 22828",
    email: "dr.lipsa@mahakurdental.in",
    whatsappOptIn: true,
    status: "active",
    visiting: false,
    joinedOn: "2021-08-15",
    schedule: {
      mon: [{ start: "08:00", end: "20:00" }],
      tue: [{ start: "08:00", end: "20:00" }],
      wed: [{ start: "08:00", end: "20:00" }],
      thu: [{ start: "08:00", end: "20:00" }],
      fri: [{ start: "08:00", end: "20:00" }],
      sat: [{ start: "08:00", end: "18:00" }],
    },
    services: ["gen", "wht", "brc", "kid"],
    stats: {
      yearsExperience: 6,
      patientsServed: 2840,
      appointmentsCompleted: 4180,
      avgRating: 4.8,
      reviewCount: 188,
    },
    reviews: [
      { id: "r4", patientInitials: "PS", patientName: "Pinky Sahu",     rating: 5, date: "2026-04-18", body: "My daughter loves coming to Dr. Lipsa. Kind, never rushes." },
      { id: "r5", patientInitials: "SP", patientName: "Suresh Pati",    rating: 5, date: "2026-04-12", body: "Mid-treatment for braces. Visits are quick and well-explained." },
    ],
  },
  {
    id: "rs",
    name: "Dr. Rashmita Sahoo",
    initials: "RS",
    avatarBg: "#E6F4EC",
    avatarFg: "#3a8b5e",
    qualifications: ["BDS"],
    registrationNumber: "2014/C",
    primarySpecialty: "General Dentistry",
    subSpecialties: [],
    trainedAt: "Hi-Tech Dental College, Bhubaneswar",
    bio: "Junior associate handling routine cleanings, checkups and first-line follow-ups. Trained in trauma-informed pediatric care.",
    languages: ["EN", "OR"],
    phone: "+91 82602 22828",
    whatsappOptIn: true,
    status: "active",
    visiting: false,
    joinedOn: "2023-11-01",
    schedule: {
      mon: [{ start: "10:00", end: "18:00" }],
      wed: [{ start: "10:00", end: "18:00" }],
      fri: [{ start: "10:00", end: "18:00" }],
      sat: [{ start: "10:00", end: "16:00" }],
    },
    services: ["gen", "kid"],
    stats: {
      yearsExperience: 3,
      patientsServed: 940,
      appointmentsCompleted: 1280,
      avgRating: 4.7,
      reviewCount: 64,
    },
    reviews: [
      { id: "r6", patientInitials: "GS", patientName: "Geeta Sahu", rating: 5, date: "2026-03-30", body: "Friendly and explained everything. Will return." },
    ],
  },
  {
    id: "am",
    name: "Dr. Amiya Krushna Sahu",
    initials: "AK",
    avatarBg: "#F4E5FA",
    avatarFg: "#6b3aa1",
    qualifications: ["MBBS", "MD (Psychiatry)", "Fellow IMA"],
    registrationNumber: "OMC-7821",
    primarySpecialty: "Other",
    subSpecialties: ["Consultant Neuropsychiatrist"],
    trainedAt: "MKCG Medical College, Berhampur",
    bio: "Visiting Consultant Neuropsychiatrist. Available on alternate Saturdays and Sundays for OPD consultations and follow-ups.",
    languages: ["EN", "HI", "OR"],
    phone: "+91 82602 22828",
    whatsappOptIn: false,
    status: "active",
    visiting: true,
    visitingNote: "2nd & 4th Saturday/Sunday · 12:00 PM – 3:00 PM",
    joinedOn: "2025-01-12",
    schedule: {
      sat: [{ start: "12:00", end: "15:00" }],
      sun: [{ start: "12:00", end: "15:00" }],
    },
    services: ["gen"],
    stats: {
      yearsExperience: 12,
      patientsServed: 1840,
      appointmentsCompleted: 2200,
      avgRating: 4.9,
      reviewCount: 96,
    },
    reviews: [
      { id: "r7", patientInitials: "MS", patientName: "Meera Sahoo", rating: 5, date: "2026-04-20", body: "Compassionate and thorough." },
    ],
  },
  {
    id: "tm",
    name: "Dr. Tony Mathew Austin",
    initials: "TA",
    avatarBg: "#FFF8EC",
    avatarFg: "#7a5c2b",
    qualifications: ["MBBS", "MD (General Medicine)"],
    registrationNumber: "OMC-5412",
    primarySpecialty: "Other",
    subSpecialties: ["Consultant Physician"],
    trainedAt: "JIPMER, Puducherry",
    bio: "Visiting Consultant Physician. Handles pre-operative clearance and post-extraction medical follow-ups for our dental cases.",
    languages: ["EN", "HI"],
    phone: "+91 82602 22828",
    whatsappOptIn: false,
    status: "on_leave",
    visiting: true,
    visitingNote: "Mon, Wed, Fri, Sat · 12:00 PM – 2:00 PM (currently on leave)",
    joinedOn: "2024-08-01",
    schedule: {
      mon: [{ start: "12:00", end: "14:00" }],
      wed: [{ start: "12:00", end: "14:00" }],
      fri: [{ start: "12:00", end: "14:00" }],
      sat: [{ start: "12:00", end: "14:00" }],
    },
    services: ["gen"],
    stats: {
      yearsExperience: 8,
      patientsServed: 620,
      appointmentsCompleted: 810,
      avgRating: 4.8,
      reviewCount: 41,
    },
    reviews: [],
  },
];

// ---------- Accessors ----------

export function listDoctors(): Doctor[] {
  return DOCTORS;
}

export function findDoctorById(id: string | null | undefined): Doctor | null {
  if (!id) return null;
  return DOCTORS.find((d) => d.id === id) ?? null;
}

// ---------- Display helpers ----------

export const STATUS_META: Record<DoctorStatus, { label: string; bg: string; fg: string; dot: string }> = {
  active:   { label: "Active",     bg: "#E6F4EC", fg: "#3a8b5e", dot: "#3a8b5e" },
  on_leave: { label: "On leave",   bg: "#FFF8EC", fg: "#7a5c2b", dot: "#7a5c2b" },
  inactive: { label: "Inactive",   bg: "#F4F5F7", fg: "#9aa9b8", dot: "#9aa9b8" },
};

export function formatQualifications(d: Doctor): string {
  return d.qualifications.join(", ");
}

export function summariseSchedule(schedule: WeeklySchedule): string {
  const days = WEEKDAYS.filter((d) => (schedule[d]?.length ?? 0) > 0);
  if (days.length === 0) return "No hours set";
  if (days.length === 7) return "Every day";
  if (days.length >= 5 && days.includes("mon") && days.includes("fri")) {
    return days.includes("sat") ? "Mon – Sat" : "Mon – Fri";
  }
  return days.map((d) => WEEKDAY_LABEL[d]).join(", ");
}
