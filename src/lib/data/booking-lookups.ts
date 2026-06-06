/**
 * Lookups consumed by the NewAppointmentDialog.
 *
 * After the Department-first booking redesign:
 *   - doctors: per-clinic active doctors, with department_id for filtering.
 *   - departments: per-clinic active departments (migration 0010).
 *
 * Services are no longer captured at booking time — see migration 0011 which
 * drops appointments.service_id entirely.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { BOOKING_DOCTORS } from "@/lib/booking-data";
import { getCurrentStaffClinicId } from "@/lib/auth/current-user";

export type BookingLookupDoctor = {
  id:           string;
  name:         string;
  credential:   string;
  initials:     string;
  /** FK to public.departments. Doctors with `null` aren't reachable via the
   *  By-Department flow until an admin assigns them in Settings → Doctors. */
  departmentId: string | null;
};

export type BookingLookupDepartment = {
  id:           string;
  name:         string;
  slug:         string;
  displayOrder: number;
};

export type BookingLookups = {
  doctors:     BookingLookupDoctor[];
  departments: BookingLookupDepartment[];
};

// =============================================================================
// Mock
// =============================================================================

const MOCK_DEPARTMENTS: BookingLookupDepartment[] = [
  { id: "dept-dental",     name: "Dental",     slug: "dental",     displayOrder: 1 },
  { id: "dept-psychiatry", name: "Psychiatry", slug: "psychiatry", displayOrder: 2 },
  { id: "dept-neurology",  name: "Neurology",  slug: "neurology",  displayOrder: 3 },
  { id: "dept-gynecology", name: "Gynecology", slug: "gynecology", displayOrder: 4 },
];

const MOCK_LOOKUPS: BookingLookups = {
  doctors: BOOKING_DOCTORS.map((d) => ({
    id:           d.id,
    name:         d.name,
    credential:   d.credential,
    initials:     d.initials,
    departmentId: "dept-dental",
  })),
  departments: MOCK_DEPARTMENTS,
};

// =============================================================================
// Helpers
// =============================================================================

function initialsOf(name: string): string {
  return name.replace(/^(Dr\.?\s+)/i, "")
    .split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// =============================================================================
// Live fetcher
// =============================================================================

async function getLiveLookups(): Promise<BookingLookups> {
  const clinicId = await getCurrentStaffClinicId();
  if (!clinicId) return { doctors: [], departments: [] };

  const supabase = await serverClient();

  const [
    { data: doctorRows, error: dErr },
    { data: deptRows,   error: deptErr },
  ] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, display_name, qualifications, department_id")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("departments")
      .select("id, name, slug, display_order")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name",          { ascending: true }),
  ]);

  if (dErr || deptErr) {
    console.error("[booking-lookups] query failed:", dErr?.message ?? deptErr?.message);
    return { doctors: [], departments: [] };
  }

  const doctors: BookingLookupDoctor[] = (doctorRows ?? []).map((d) => ({
    id:           d.id,
    name:         d.display_name,
    credential:   d.qualifications ?? "",
    initials:     initialsOf(d.display_name),
    departmentId: d.department_id ?? null,
  }));

  const departments: BookingLookupDepartment[] = (deptRows ?? []).map((r) => ({
    id:           r.id,
    name:         r.name,
    slug:         r.slug,
    displayOrder: r.display_order,
  }));

  return { doctors, departments };
}

// =============================================================================
// Public
// =============================================================================

export async function getBookingLookups(): Promise<BookingLookups> {
  if (useMockData()) return MOCK_LOOKUPS;
  return getLiveLookups();
}
