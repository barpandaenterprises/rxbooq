import { serviceClient } from "@/lib/supabase/server";

export type LinkClinicUserArgs = {
  authUserId:  string;
  email:       string;
  clinicId:    string;
  role:        "clinic_admin" | "doctor" | "receptionist";
  displayName: string;
  phone?:      string;
  /** Optional doctor profile to link (role='doctor' logins). */
  doctorId?:   string | null;
};

export type LinkClinicUserResult = { ok: true } | { ok: false; error: string };

/**
 * Inserts the clinic_users row linking an auth user to a clinic with a role.
 * Shared by the Team invite flow and the Add/Edit Doctor "create login" flow.
 * Uses the service client because invites run before the user has a session.
 *
 * The caller is responsible for authorizing this (clinic admin gate) and for
 * resolving/creating the auth user. A unique violation here means the user is
 * already a member of this clinic, or the doctor profile already has a login.
 */
export async function linkAuthUserToClinic(
  args: LinkClinicUserArgs,
): Promise<LinkClinicUserResult> {
  const admin = serviceClient();
  const { error } = await admin
    .from("clinic_users")
    .insert({
      clinic_id:    args.clinicId,
      auth_user_id: args.authUserId,
      role:         args.role,
      display_name: args.displayName,
      email:        args.email,
      phone:        args.phone ?? null,
      doctor_id:    args.doctorId ?? null,
    });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "That person is already on this clinic's team, or the doctor profile already has a login." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
