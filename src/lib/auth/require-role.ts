import { getActiveMembership, type ActiveMembership } from "@/lib/auth/current-user";

export type RoleCtx = ActiveMembership;

export type GateResult =
  | { ok: true; ctx: RoleCtx }
  | { ok: false; error: string };

/**
 * Asserts the signed-in user is a member of the clinic they're acting in (the
 * URL-driven active clinic) AND holds one of the allowed roles. Returns the
 * caller context (clinicId, role, doctorId, authUserId) or an error response.
 *
 * Built on getActiveMembership() so it's correct for multi-clinic users — the
 * role + linked doctor profile are resolved for the active clinic, not the
 * user's first membership. Superadmins are not clinic members and therefore
 * are not authorized by this gate (use service-side flows for cross-tenant).
 */
export async function requireRole(
  allowed: Array<RoleCtx["role"]>,
): Promise<GateResult> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { ok: false, error: "Your account is not linked to this clinic." };
  }
  if (!allowed.includes(membership.role)) {
    return { ok: false, error: "You don't have permission to do that." };
  }
  return { ok: true, ctx: membership };
}

/** Convenience gate — clinic admins only. */
export async function requireClinicAdmin(): Promise<GateResult> {
  return requireRole(["clinic_admin"]);
}
