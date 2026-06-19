"use server";

import { redirect } from "next/navigation";
import { serverClient, serviceClient } from "@/lib/supabase/server";

/**
 * Server action: email + password sign-in for clinic staff.
 *
 * Form fields: email, password, next (optional redirect target).
 *
 * After auth succeeds, the redirect target is resolved in this order:
 *   1. Explicit `next` form field if it's an internal path. Slug-prefixed
 *      URLs (`/[slug]/admin/...`, `/[slug]/book/...`, `/superadmin/...`)
 *      pass straight through.
 *   2. User's first clinic_users membership → `/[firstSlug]/admin/today`.
 *   3. Superadmin (raw_app_meta_data.role='superadmin') → `/superadmin/clinics`.
 *   4. Nothing → `/` (platform marketing).
 *
 * On success it redirects (throws NEXT_REDIRECT, which the client lets
 * propagate). On failure it RETURNS { error } so the form can render the message
 * inline — redirecting back to /login?error= doesn't work reliably because the
 * persisted client form state wouldn't pick up the new query param.
 */
export async function signInWithPassword(
  formData: FormData,
): Promise<{ error: string } | void> {
  const email    = String(formData.get("email")    ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw  = String(formData.get("next")     ?? "");

  // Whitelist internal redirects.
  const explicitNext = nextRaw.startsWith("/") && !nextRaw.startsWith("//")
    ? nextRaw
    : null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await serverClient();
  const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  // If the caller asked for a specific destination, trust it (already whitelisted).
  if (explicitNext) redirect(explicitNext);

  // Otherwise resolve a sensible default based on the user's role + memberships.
  const userId = signed.user?.id;
  if (!userId) redirect("/");

  const admin = serviceClient();
  const { data: firstMembership } = await admin
    .from("clinic_users")
    .select("clinics ( slug )")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const clinicRel = (firstMembership as unknown as { clinics: { slug: string } | { slug: string }[] | null } | null)?.clinics;
  const firstSlug = clinicRel
    ? (Array.isArray(clinicRel) ? clinicRel[0]?.slug ?? null : clinicRel.slug)
    : null;
  if (firstSlug) redirect(`/${firstSlug}/admin/today`);

  // No clinic linkage — superadmin?
  const isSuperadmin = signed.user?.app_metadata?.role === "superadmin";
  if (isSuperadmin) redirect("/superadmin/clinics");

  // Signed in but unaffiliated — bounce to platform marketing.
  redirect("/");
}

/** Map Supabase's terse auth errors to clear, user-facing copy. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message || "Sign-in failed. Please try again.";
}
