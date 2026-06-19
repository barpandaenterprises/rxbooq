"use server";

/**
 * Super-admin clinic management — edit + delete.
 *
 * Both actions guard on the superadmin role and use serviceClient() (bypasses
 * RLS) to act across tenants. Result-shape convention matches the rest of the
 * codebase (see src/app/(super-admin)/superadmin/verifications/actions.ts).
 *
 * deleteClinicAction mirrors scripts/delete-test-clinic.ts: the clinics row
 * cascade-deletes every clinic-scoped child; clinic_applications (FK is NO
 * ACTION) are cleared first; auth users left orphaned by the delete are removed
 * unless they belong to another clinic or are a platform superadmin.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serverClient, serviceClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";

async function requireSuperadmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if ((user.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
    return { ok: false, error: "Forbidden." };
  }
  return { ok: true };
}

// =============================================================================
// Edit
// =============================================================================

const updateSchema = z.object({
  name:            z.string().trim().min(2, "Clinic name must be at least 2 characters.").max(120, "Clinic name is too long."),
  slug:            z.string().trim().min(2, "URL slug must be at least 2 characters.").max(60, "URL slug is too long.")
                     .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Use lowercase letters, digits, and hyphens."),
  status:          z.enum(["active", "onboarding", "suspended"]),
  whatsapp_number: z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/, "Use E.164 format, e.g. +919999900001").optional().or(z.literal("")),
  custom_domain:   z.string().trim().max(120, "Domain is too long.")
                     .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Enter a valid domain, e.g. clinic.example.com").optional().or(z.literal("")),
});

export type UpdateClinicInput = z.infer<typeof updateSchema>;

export type UpdateClinicResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateClinicAction(clinicId: string, input: UpdateClinicInput): Promise<UpdateClinicResult> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!z.string().uuid().safeParse(clinicId).success) {
    return { ok: false, error: "Invalid clinic id." };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input", fieldErrors };
  }
  const d = parsed.data;

  const supabase = serviceClient();

  // Slug guards (reserved + taken by a *different* clinic).
  if (isReservedSlug(d.slug)) {
    return { ok: false, error: `"${d.slug}" is reserved.`, fieldErrors: { slug: `"${d.slug}" is reserved — pick another.` } };
  }
  const { data: slugHit } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", d.slug)
    .neq("id", clinicId)
    .maybeSingle();
  if (slugHit) {
    return { ok: false, error: `"${d.slug}" is already taken.`, fieldErrors: { slug: `"${d.slug}" is already taken.` } };
  }

  // Custom domain unique across clinics (DB enforces it too; fail clean here).
  const customDomain = d.custom_domain ? d.custom_domain.toLowerCase() : null;
  if (customDomain) {
    const { data: domainHit } = await supabase
      .from("clinics")
      .select("id")
      .eq("custom_domain", customDomain)
      .neq("id", clinicId)
      .maybeSingle();
    if (domainHit) {
      return { ok: false, error: "That custom domain is already in use.", fieldErrors: { custom_domain: "Already in use by another clinic." } };
    }
  }

  const { error } = await supabase
    .from("clinics")
    .update({
      name:            d.name,
      slug:            d.slug,
      status:          d.status,
      whatsapp_number: d.whatsapp_number ? d.whatsapp_number : null,
      custom_domain:   customDomain,
    })
    .eq("id", clinicId);

  if (error) {
    // Unique-violation fallback (race between the checks above and the update).
    if (error.code === "23505") {
      return { ok: false, error: "Slug or custom domain is already taken." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin/clinics");
  return { ok: true, slug: d.slug };
}

// =============================================================================
// Delete (clinic + ALL related data)
// =============================================================================

export type DeleteClinicResult =
  | { ok: true; slug: string; deletedUsers: number }
  | { ok: false; error: string };

export async function deleteClinicAction(clinicId: string): Promise<DeleteClinicResult> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!z.string().uuid().safeParse(clinicId).success) {
    return { ok: false, error: "Invalid clinic id." };
  }

  const supabase = serviceClient();

  const { data: clinic, error: clinicErr } = await supabase
    .from("clinics")
    .select("id, slug")
    .eq("id", clinicId)
    .maybeSingle();
  if (clinicErr) return { ok: false, error: clinicErr.message };
  if (!clinic) return { ok: false, error: "Clinic not found." };

  // Collect auth users attached to this clinic (from every angle) before the
  // cascade removes the link rows.
  const authIds = new Set<string>();
  const collect = async (table: "clinic_users" | "patient_users" | "clinic_applications") => {
    const { data } = await supabase.from(table).select("auth_user_id").eq("clinic_id", clinic.id);
    for (const row of (data ?? []) as Array<{ auth_user_id: string | null }>) {
      if (row.auth_user_id) authIds.add(row.auth_user_id);
    }
  };
  await Promise.all([collect("clinic_users"), collect("patient_users"), collect("clinic_applications")]);

  // clinic_applications FK is NO ACTION → clear it first or the clinic delete blocks.
  const { error: appErr } = await supabase.from("clinic_applications").delete().eq("clinic_id", clinic.id);
  if (appErr) return { ok: false, error: `Failed to clear applications: ${appErr.message}` };

  // Delete the clinic → cascades to all clinic-scoped child tables.
  const { error: delErr } = await supabase.from("clinics").delete().eq("id", clinic.id);
  if (delErr) return { ok: false, error: `Clinic delete failed: ${delErr.message}` };

  // Remove now-orphaned auth users (skip multi-clinic members + superadmins).
  let deletedUsers = 0;
  for (const id of authIds) {
    const [{ count: cuLeft }, { count: puLeft }] = await Promise.all([
      supabase.from("clinic_users").select("id", { count: "exact", head: true }).eq("auth_user_id", id),
      supabase.from("patient_users").select("auth_user_id", { count: "exact", head: true }).eq("auth_user_id", id),
    ]);
    if ((cuLeft ?? 0) > 0 || (puLeft ?? 0) > 0) continue;

    const { data: u } = await supabase.auth.admin.getUserById(id);
    if ((u?.user?.app_metadata as Record<string, unknown> | undefined)?.role === "superadmin") continue;

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (!error) deletedUsers += 1;
  }

  revalidatePath("/superadmin/clinics");
  return { ok: true, slug: clinic.slug, deletedUsers };
}
