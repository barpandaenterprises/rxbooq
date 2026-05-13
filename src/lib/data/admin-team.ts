/**
 * Data accessor for /admin/settings/team.
 * RLS scopes the result to the signed-in user's clinic.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";

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
};

const MOCK_TEAM: TeamMember[] = [
  { id: "cu-1", authUserId: "auth-1", email: "you@mahakur.in",      displayName: "You",                 role: "clinic_admin", phone: null, joinedAt: "2025-09-12", isSelf: true  },
  { id: "cu-2", authUserId: "auth-2", email: "lipsa@mahakur.in",    displayName: "Dr. Lipsa Pradhan",   role: "doctor",       phone: null, joinedAt: "2025-10-04", isSelf: false },
  { id: "cu-3", authUserId: "auth-3", email: "reema@mahakur.in",    displayName: "Reema R.",            role: "receptionist", phone: null, joinedAt: "2025-11-21", isSelf: false },
];

type Row = {
  id:            string;
  auth_user_id:  string;
  email:         string | null;
  display_name:  string | null;
  role:          string;
  phone:         string | null;
  created_at:    string;
};

export async function getAdminTeamData(): Promise<TeamMember[]> {
  if (useMockData()) return MOCK_TEAM;

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myAuthId = user?.id ?? "";

  // RLS scopes the rows to the caller's clinic.
  const { data, error } = await supabase
    .from("clinic_users")
    .select("id, auth_user_id, email, display_name, role, phone, created_at")
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
  }));
}
