import { cache } from "react";
import { serverClient } from "@/lib/supabase/server";

export type SignedInClinicUser = {
  authUserId:  string;
  email:       string | null;
  displayName: string;
  role:        "clinic_admin" | "doctor" | "receptionist" | "superadmin" | null;
  clinicId:    string | null;
};

/**
 * Resolves the signed-in clinic staff user (or null when unauthenticated).
 * Cached per request so it can be called from multiple Server Components
 * without duplicating the round-trip.
 *
 * Resolution order:
 *   1. raw_app_meta_data.role = 'superadmin'  → platform-wide role wins
 *      even if the same auth user also has a clinic_users row (common for
 *      founder/dev accounts seeded as a clinic_admin first).
 *   2. clinic_users row                       → per-tenant staff role
 *   3. otherwise null role (signed in but unaffiliated)
 */
export const getSignedInClinicUser = cache(
  async (): Promise<SignedInClinicUser | null> => {
    const supabase = await serverClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const metaRole = (user.app_metadata?.role as string | undefined) ?? null;
    if (metaRole === "superadmin") {
      return {
        authUserId:  user.id,
        email:       user.email ?? null,
        displayName: user.email ?? "Signed in",
        role:        "superadmin",
        clinicId:    null,
      };
    }

    const { data: row } = await supabase
      .from("clinic_users")
      .select("clinic_id, role, display_name, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (row) {
      return {
        authUserId:  user.id,
        email:       row.email ?? user.email ?? null,
        displayName: row.display_name ?? user.email ?? "Signed in",
        role:        row.role as SignedInClinicUser["role"],
        clinicId:    row.clinic_id,
      };
    }

    return {
      authUserId:  user.id,
      email:       user.email ?? null,
      displayName: user.email ?? "Signed in",
      role:        null,
      clinicId:    null,
    };
  },
);
