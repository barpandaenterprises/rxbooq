"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";

// =============================================================================
// Helpers
// =============================================================================

type CallerContext = {
  clinicId: string;
  role:     "clinic_admin" | "doctor" | "receptionist";
  authUserId: string;
};

/**
 * Resolves the caller's clinic + role via RLS and asserts they're a clinic_admin.
 * Returns the context or an error response shape.
 */
async function requireClinicAdmin(): Promise<
  | { ok: true; ctx: CallerContext }
  | { ok: false; error: string }
> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row } = await supabase
    .from("clinic_users")
    .select("clinic_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!row?.clinic_id) {
    return { ok: false, error: "Your account is not linked to a clinic." };
  }
  if (row.role !== "clinic_admin") {
    return { ok: false, error: "Only clinic admins can manage the team." };
  }
  return {
    ok: true,
    ctx: {
      clinicId:   row.clinic_id,
      role:       row.role,
      authUserId: user.id,
    },
  };
}

// =============================================================================
// Invite
// =============================================================================

const inviteSchema = z.object({
  email:       z.string().trim().email("Enter a valid email"),
  displayName: z.string().trim().min(2, "Display name is required"),
  role:        z.enum(["clinic_admin", "doctor", "receptionist"]),
  phone:       z.string().trim().optional(),
});

export type InviteClinicUserInput = z.infer<typeof inviteSchema>;

export type InviteClinicUserResult =
  | { ok: true; mock: boolean }
  | { ok: false; error: string };

export async function inviteClinicUserAction(
  rawInput: InviteClinicUserInput,
): Promise<InviteClinicUserResult> {
  const parsed = inviteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (useMockData()) return { ok: true, mock: true };

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
      return await linkAuthUserToClinic({
        authUserId:  existing.id,
        email:       input.email,
        clinicId:    ctx.clinicId,
        role:        input.role,
        displayName: input.displayName,
        phone:       input.phone,
      });
    }
    return { ok: false, error: inviteErr?.message ?? "Failed to invite user." };
  }

  return await linkAuthUserToClinic({
    authUserId:  invited.user.id,
    email:       input.email,
    clinicId:    ctx.clinicId,
    role:        input.role,
    displayName: input.displayName,
    phone:       input.phone,
  });
}

async function linkAuthUserToClinic(args: {
  authUserId:  string;
  email:       string;
  clinicId:    string;
  role:        "clinic_admin" | "doctor" | "receptionist";
  displayName: string;
  phone?:      string;
}): Promise<InviteClinicUserResult> {
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
    });

  if (error) {
    // Most likely a unique violation on auth_user_id — the user is already on
    // a clinic_users row somewhere. We don't roll back the auth.users row
    // because they may legitimately exist in another tenant.
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings/team");
  return { ok: true, mock: false };
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
  if (useMockData()) return { ok: true };

  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const admin = serviceClient();
  const { error } = await admin
    .from("clinic_users")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.clinicUserId)
    .eq("clinic_id", gate.ctx.clinicId); // double-scope: only my clinic

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings/team");
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
  if (useMockData()) return { ok: true };

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

  revalidatePath("/admin/settings/team");
  return { ok: true };
}
