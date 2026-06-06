import type { serverClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof serverClient>>;

/**
 * The set of patient ids a doctor is allowed to see in a clinic:
 *   - patients explicitly assigned to them (patients.assigned_doctor_id), OR
 *   - patients they have at least one appointment with (appointments.doctor_id).
 *
 * The union guarantees a doctor can always reach the chart of a patient on
 * their own schedule even if that patient is unassigned or assigned elsewhere.
 */
export async function doctorPatientIds(
  supabase: SupabaseServerClient,
  clinicId: string,
  doctorId: string,
): Promise<Set<string>> {
  const [{ data: assigned }, { data: appts }] = await Promise.all([
    supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("assigned_doctor_id", doctorId),
    supabase
      .from("appointments")
      .select("patient_id")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId),
  ]);

  const ids = new Set<string>();
  for (const r of assigned ?? []) ids.add(r.id as string);
  for (const r of appts ?? []) ids.add(r.patient_id as string);
  return ids;
}

/** Whether a doctor may access a specific patient's chart (assigned OR has-appointment). */
export async function doctorCanAccessPatient(
  supabase: SupabaseServerClient,
  clinicId: string,
  doctorId: string,
  patientId: string,
): Promise<boolean> {
  const [{ data: assigned }, { data: appt }] = await Promise.all([
    supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("id", patientId)
      .eq("assigned_doctor_id", doctorId)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .eq("patient_id", patientId)
      .limit(1)
      .maybeSingle(),
  ]);
  return Boolean(assigned) || Boolean(appt);
}
