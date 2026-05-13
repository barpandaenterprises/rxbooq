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
 * RLS lets staff read their own clinic_users row, so a single query is enough.
 * Super-admins (raw_app_meta_data.role = 'superadmin') don't have a
 * clinic_users row — we surface their email + role anyway.
 */
export const getSignedInClinicUser = cache(
  async (): Promise<SignedInClinicUser | null> => {
    const supabase = await serverClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

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

    const metaRole = (user.app_metadata?.role as string | undefined) ?? null;
    return {
      authUserId:  user.id,
      email:       user.email ?? null,
      displayName: user.email ?? "Signed in",
      role:        metaRole === "superadmin" ? "superadmin" : null,
      clinicId:    null,
    };
  },
);
