"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/server";
import { requireClinicAdmin } from "@/lib/auth/require-role";
import { linkAuthUserToClinic } from "@/lib/auth/link-clinic-user";

// =============================================================================
// Invite
// =============================================================================

const inviteSchema = z.object({
  email:       z.string().trim().email("Enter a valid email"),
  displayName: z.string().trim().min(2, "Display name is required"),
  role:        z.enum(["clinic_admin", "doctor", "receptionist"]),
  phone:       z.string().trim().optional(),
  /** Optional doctor profile to link when role='doctor'. */
  doctorId:    z.string().uuid().optional(),
});

export type InviteClinicUserInput = z.infer<typeof inviteSchema>;

export type InviteClinicUserResult =
  | { ok: true }
  | { ok: false; error: string };

export async function inviteClinicUserAction(
  rawInput: InviteClinicUserInput,
): Promise<InviteClinicUserResult> {
  const parsed = inviteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;
  const { ctx } = gate;

  // Send the invite via Supabase Auth admin API. This:
  //   - creates an auth.users row if the email isn't already registered
  //   - sends a magic-link email so the user can set a password
  //   - returns the user id we link to clinic_users
  const admin = serviceClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { display_name: input.displayName },
    },
  );

  if (inviteErr || !invited?.user) {
    // If the user already exists, fall back to looking them up.
    if (inviteErr?.message?.toLowerCase().includes("already")) {
      const { data: users } = await admin.auth.admin.listUsers();
      const existing = users?.users?.find((u) => u.email?.toLowerCase() === input.email.toLowerCase());
      if (!existing) {
        return { ok: false, error: inviteErr?.message ?? "Failed to invite user." };
      }
      // Continue with the existing auth user.
      return await linkAndRevalidate({
        authUserId:  existing.id,
        email:       input.email,
        clinicId:    ctx.clinicId,
        role:        input.role,
        displayName: input.displayName,
        phone:       input.phone,
        doctorId:    input.role === "doctor" ? input.doctorId ?? null : null,
      });
    }
    return { ok: false, error: inviteErr?.message ?? "Failed to invite user." };
  }

  return await linkAndRevalidate({
    authUserId:  invited.user.id,
    email:       input.email,
    clinicId:    ctx.clinicId,
    role:        input.role,
    displayName: input.displayName,
    phone:       input.phone,
    doctorId:    input.role === "doctor" ? input.doctorId ?? null : null,
  });
}

/** linkAuthUserToClinic + revalidate the team list. */
async function linkAndRevalidate(
  args: Parameters<typeof linkAuthUserToClinic>[0],
): Promise<InviteClinicUserResult> {
  const result = await linkAuthUserToClinic(args);
  if (!result.ok) return result;
  await revalidateActiveClinicPath("/admin/settings/team");
  return { ok: true };
}

// =============================================================================
// Update role
// =============================================================================

const updateRoleSchema = z.object({
  clinicUserId: z.string().uuid(),
  role:         z.enum(["clinic_admin", "doctor", "receptionist"]),
});

export async function updateClinicUserRoleAction(
  rawInput: z.infer<typeof updateRoleSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const admin = serviceClient();
  // Clear any doctor-profile link when the role moves away from 'doctor'.
  const patch: { role: string; doctor_id?: null } =
    parsed.data.role === "doctor"
      ? { role: parsed.data.role }
      : { role: parsed.data.role, doctor_id: null };
  const { error } = await admin
    .from("clinic_users")
    .update(patch)
    .eq("id", parsed.data.clinicUserId)
    .eq("clinic_id", gate.ctx.clinicId); // double-scope: only my clinic

  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/settings/team");
  return { ok: true };
}

// =============================================================================
// Link a doctor-role login to a doctor profile (Team screen dropdown).
// =============================================================================

const setDoctorSchema = z.object({
  clinicUserId: z.string().uuid(),
  doctorId:     z.string().uuid().nullable(),
});

export async function setClinicUserDoctorAction(
  rawInput: z.infer<typeof setDoctorSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = setDoctorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const admin = serviceClient();

  // The target must be a doctor-role member of this clinic.
  const { data: target } = await admin
    .from("clinic_users")
    .select("id, role")
    .eq("id", parsed.data.clinicUserId)
    .eq("clinic_id", gate.ctx.clinicId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Team member not found in this clinic." };
  if (target.role !== "doctor") {
    return { ok: false, error: "Only doctor-role logins can be linked to a doctor profile." };
  }

  // If linking (not clearing), the profile must belong to this clinic.
  if (parsed.data.doctorId) {
    const { data: doc } = await admin
      .from("doctors")
      .select("id")
      .eq("id", parsed.data.doctorId)
      .eq("clinic_id", gate.ctx.clinicId)
      .maybeSingle();
    if (!doc) return { ok: false, error: "Doctor profile not found in this clinic." };
  }

  const { error } = await admin
    .from("clinic_users")
    .update({ doctor_id: parsed.data.doctorId })
    .eq("id", parsed.data.clinicUserId)
    .eq("clinic_id", gate.ctx.clinicId);

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "That doctor profile already has a login linked." };
    }
    return { ok: false, error: error.message };
  }

  await revalidateActiveClinicPath("/admin/settings/team");
  return { ok: true };
}

// =============================================================================
// Deactivate — removes the clinic_users link so RLS hides the clinic.
// The auth.users row stays so the email can be re-invited later.
// =============================================================================

const deactivateSchema = z.object({
  clinicUserId: z.string().uuid(),
});

export async function deactivateClinicUserAction(
  rawInput: z.infer<typeof deactivateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = deactivateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  // Don't allow an admin to deactivate themselves — would lock them out.
  const admin = serviceClient();
  const { data: target } = await admin
    .from("clinic_users")
    .select("auth_user_id")
    .eq("id", parsed.data.clinicUserId)
    .eq("clinic_id", gate.ctx.clinicId)
    .maybeSingle();
  if (!target) return { ok: false, error: "User not found in this clinic." };
  if (target.auth_user_id === gate.ctx.authUserId) {
    return { ok: false, error: "You can't deactivate yourself." };
  }

  const { error } = await admin
    .from("clinic_users")
    .delete()
    .eq("id", parsed.data.clinicUserId)
    .eq("clinic_id", gate.ctx.clinicId);

  if (error) return { ok: false, error: error.message };

  await revalidateActiveClinicPath("/admin/settings/team");
  return { ok: true };
}
