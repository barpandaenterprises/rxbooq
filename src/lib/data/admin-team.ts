/**
 * Data accessor for /admin/settings/team.
 * RLS scopes the result to the signed-in user's clinic.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { getActiveMembership } from "@/lib/auth/current-user";

export type ClinicUserRole = "clinic_admin" | "doctor" | "receptionist";

export type TeamMember = {
  id:           string;
  authUserId:   string;
  email:        string;
  displayName:  string;
  role:         ClinicUserRole;
  phone:        string | null;
  joinedAt:     string;  // ISO date
  isSelf:       boolean;
  /** Linked doctor profile id for a doctor-role login (null if unlinked). */
  doctorId:     string | null;
};

/** Lightweight doctor option for the Team screen's profile-link dropdown. */
export type DoctorOption = { id: string; name: string };

const MOCK_TEAM: TeamMember[] = [
  { id: "cu-1", authUserId: "auth-1", email: "you@mahakur.in",      displayName: "You",                 role: "clinic_admin", phone: null, joinedAt: "2025-09-12", isSelf: true,  doctorId: null },
  { id: "cu-2", authUserId: "auth-2", email: "lipsa@mahakur.in",    displayName: "Dr. Lipsa Pradhan",   role: "doctor",       phone: null, joinedAt: "2025-10-04", isSelf: false, doctorId: null },
  { id: "cu-3", authUserId: "auth-3", email: "reema@mahakur.in",    displayName: "Reema R.",            role: "receptionist", phone: null, joinedAt: "2025-11-21", isSelf: false, doctorId: null },
];

type Row = {
  id:            string;
  auth_user_id:  string;
  email:         string | null;
  display_name:  string | null;
  role:          string;
  phone:         string | null;
  created_at:    string;
  doctor_id:     string | null;
};

export async function getAdminTeamData(): Promise<TeamMember[]> {
  if (useMockData()) return MOCK_TEAM;

  const membership = await getActiveMembership();
  if (!membership) return [];

  const supabase = await serverClient();
  const myAuthId = membership.authUserId;

  const { data, error } = await supabase
    .from("clinic_users")
    .select("id, auth_user_id, email, display_name, role, phone, created_at, doctor_id")
    .eq("clinic_id", membership.clinicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-team] query failed:", error.message);
    return [];
  }

  return (data ?? []).map((r: Row): TeamMember => ({
    id:          r.id,
    authUserId:  r.auth_user_id,
    email:       r.email ?? "",
    displayName: r.display_name ?? r.email ?? "(no name)",
    role:        (r.role as ClinicUserRole),
    phone:       r.phone,
    joinedAt:    r.created_at.slice(0, 10),
    isSelf:      r.auth_user_id === myAuthId,
    doctorId:    r.doctor_id ?? null,
  }));
}

/** Active doctor profiles in the caller's clinic, for the team profile-link dropdown. */
export async function getClinicDoctorOptions(): Promise<DoctorOption[]> {
  if (useMockData()) return [];

  const membership = await getActiveMembership();
  if (!membership) return [];

  const supabase = await serverClient();
  const { data } = await supabase
    .from("doctors")
    .select("id, display_name")
    .eq("clinic_id", membership.clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (data ?? []).map((d) => ({ id: d.id as string, name: d.display_name as string }));
}
