import { cache } from "react";
import { headers } from "next/headers";
import { serverClient, serviceClient } from "@/lib/supabase/server";

export type SignedInClinicUser = {
  authUserId:  string;
  email:       string | null;
  displayName: string;
  role:        "clinic_admin" | "doctor" | "receptionist" | "superadmin" | null;
  /** First / only clinic linked via clinic_users — used for display fallbacks.
   *  For URL-driven scoping, prefer getCurrentStaffClinicId() which reads the
   *  active clinic from the request URL (set by middleware). */
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

/**
 * Returns the clinic_id the signed-in user is *acting in* right now, scoped by
 * the request URL. Returns null when:
 *   - The URL has no clinic context (e.g. apex platform marketing).
 *   - The slug in the URL doesn't resolve to an active clinic.
 *   - The signed-in user is not a member of that clinic (= access denied).
 *
 * Resolution order:
 *   1. `x-active-clinic-slug` header — set by middleware from either the URL
 *      path (`/[slug]/admin/...`) or the resolved tenant subdomain.
 *   2. Membership check via `clinic_users` (clinic_id + auth_user_id).
 *
 * Multi-clinic-membership safe: a doctor in two clinics will see clinic A's
 * data when they hit /a/admin/* and clinic B's data on /b/admin/*. The URL
 * is the source of truth; the user's clinic_users row(s) only gate access.
 *
 * Use this in every /admin/* data loader and server action as an explicit
 * .eq("clinic_id", …) filter — defense-in-depth on top of RLS.
 */
export const getCurrentStaffClinicId = cache(async (): Promise<string | null> => {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return null;

  const admin = serviceClient();
  const h    = await headers();
  const slug = h.get("x-active-clinic-slug");

  if (slug) {
    // URL-driven path: look up clinic by slug, verify membership.
    const { data: clinic } = await admin
      .from("clinics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clinic) return null;

    const { data: membership } = await admin
      .from("clinic_users")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("auth_user_id", user.id)
      .maybeSingle();
    return membership ? clinic.id : null;
  }

  // Fallback for legacy /admin/* routes that haven't been migrated to
  // /[clinicSlug]/admin/* yet: use the user's first membership. This keeps
  // single-clinic users working during the migration. When the route
  // restructure is done and legacy /admin/* is deleted, this branch becomes
  // dead code and can be removed.
  const { data: firstMembership } = await admin
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return firstMembership?.clinic_id ?? null;
});

/**
 * Returns every clinic the signed-in user belongs to (via clinic_users).
 * Powers the sidebar clinic switcher. Empty list if not signed in or not
 * a member of any clinic.
 */
export const getMyClinicMemberships = cache(async (): Promise<Array<{
  clinicId: string;
  slug:     string;
  name:     string;
  role:     "clinic_admin" | "doctor" | "receptionist";
}>> => {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return [];

  const admin = serviceClient();
  const { data } = await admin
    .from("clinic_users")
    .select("role, clinic:clinics ( id, slug, name )")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: true });
  if (!data) return [];

  return data
    .map((r) => {
      const c = Array.isArray(r.clinic) ? r.clinic[0] : r.clinic;
      if (!c) return null;
      return {
        clinicId: c.id,
        slug:     c.slug,
        name:     c.name,
        role:     r.role as "clinic_admin" | "doctor" | "receptionist",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
});
