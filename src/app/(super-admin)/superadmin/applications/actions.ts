"use server";

/**
 * Super-admin onboarding-draft management — edit + delete.
 *
 * Drafts are clinic_applications rows with status='draft' (no clinic, usually no
 * auth user yet). Both actions guard on the superadmin role and use
 * serviceClient() (drafts have no auth_user_id, so RLS can't gate them).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serverClient, serviceClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";
import { CLINIC_APPLICATIONS_BUCKET } from "@/lib/supabase/storage";

async function requireSuperadmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if ((user.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
    return { ok: false, error: "Forbidden." };
  }
  return { ok: true };
}

const emptyToNull = (s: string | undefined | null): string | null =>
  s && s.trim().length > 0 ? s.trim() : null;

// =============================================================================
// Edit a draft
// =============================================================================

const draftSchema = z.object({
  clinic_name:    z.string().trim().max(120, "Clinic name is too long.").optional(),
  suggested_slug: z.string().trim().max(60, "URL slug is too long.")
                    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Use lowercase letters, digits, and hyphens.")
                    .or(z.literal("")).optional(),
  address:        z.string().trim().max(200, "Address is too long.").optional(),
  city:           z.string().trim().max(80, "City name is too long.").optional(),
  state:          z.string().trim().max(80, "State name is too long.").optional(),
  pincode:        z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode.").or(z.literal("")).optional(),
  primary_phone:  z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/, "Enter a valid phone number.").or(z.literal("")).optional(),
  primary_email:  z.string().trim().toLowerCase().email("Enter a valid email address.").or(z.literal("")).optional(),

  doctor_full_name:         z.string().trim().max(120, "Name is too long.").optional(),
  doctor_registration_no:   z.string().trim().max(60, "Registration number is too long.").optional(),
  doctor_qualifications:    z.string().trim().max(200, "Qualifications are too long.").optional(),
  doctor_primary_specialty: z.string().trim().max(80, "Specialty is too long.").optional(),
  doctor_years_experience:  z.number().int().min(0).max(80, "Enter a realistic number of years.").nullable().optional(),

  selected_plan_id:        z.string().uuid().nullable().optional(),
  requested_doctor_seats:  z.number().int().min(1).max(50).optional(),
});

export type UpdateDraftInput = z.infer<typeof draftSchema>;

export type UpdateDraftResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateDraftAction(draftId: string, input: UpdateDraftInput): Promise<UpdateDraftResult> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!z.string().uuid().safeParse(draftId).success) {
    return { ok: false, error: "Invalid draft id." };
  }

  const parsed = draftSchema.safeParse(input);
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

  // Slug uniqueness (only when a slug is set) — against live clinics and other
  // in-flight applications, excluding this draft.
  const slug = emptyToNull(d.suggested_slug);
  if (slug) {
    if (isReservedSlug(slug)) {
      return { ok: false, error: `"${slug}" is reserved.`, fieldErrors: { suggested_slug: `"${slug}" is reserved — pick another.` } };
    }
    const [{ data: clinicHit }, { data: appHits }] = await Promise.all([
      supabase.from("clinics").select("id").eq("slug", slug).maybeSingle(),
      supabase.from("clinic_applications").select("id").eq("suggested_slug", slug).in("status", ["draft", "pending"]).neq("id", draftId),
    ]);
    if (clinicHit || (appHits ?? []).length > 0) {
      return { ok: false, error: `"${slug}" is already taken.`, fieldErrors: { suggested_slug: `"${slug}" is already taken.` } };
    }
  }

  const { error } = await supabase
    .from("clinic_applications")
    .update({
      clinic_name:              emptyToNull(d.clinic_name),
      suggested_slug:           slug,
      address:                  emptyToNull(d.address),
      city:                     emptyToNull(d.city),
      state:                    emptyToNull(d.state),
      pincode:                  emptyToNull(d.pincode),
      primary_phone:            emptyToNull(d.primary_phone),
      primary_email:            emptyToNull(d.primary_email),
      doctor_full_name:         emptyToNull(d.doctor_full_name),
      doctor_registration_no:   emptyToNull(d.doctor_registration_no),
      doctor_qualifications:    emptyToNull(d.doctor_qualifications),
      doctor_primary_specialty: emptyToNull(d.doctor_primary_specialty),
      doctor_years_experience:  d.doctor_years_experience ?? null,
      selected_plan_id:         d.selected_plan_id ?? null,
      requested_doctor_seats:   d.requested_doctor_seats ?? 1,
    })
    .eq("id", draftId)
    .eq("status", "draft");

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Slug is already taken." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin/applications");
  return { ok: true };
}

// =============================================================================
// Delete a draft
// =============================================================================

export type DeleteDraftResult = { ok: true } | { ok: false; error: string };

export async function deleteDraftAction(draftId: string): Promise<DeleteDraftResult> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!z.string().uuid().safeParse(draftId).success) {
    return { ok: false, error: "Invalid draft id." };
  }

  const supabase = serviceClient();

  const { data: draft, error: loadErr } = await supabase
    .from("clinic_applications")
    .select("id, status, auth_user_id, registration_cert_path, clinic_license_path")
    .eq("id", draftId)
    .maybeSingle();
  if (loadErr) return { ok: false, error: loadErr.message };
  if (!draft) return { ok: false, error: "Draft not found." };
  if (draft.status !== "draft") {
    return { ok: false, error: "This application is no longer a draft — manage it from Clinics instead." };
  }

  // Best-effort: remove uploaded verification docs from the applications bucket.
  const paths = [draft.registration_cert_path, draft.clinic_license_path].filter(Boolean) as string[];
  if (paths.length > 0) {
    await supabase.storage.from(CLINIC_APPLICATIONS_BUCKET).remove(paths);
  }

  const { error: delErr } = await supabase
    .from("clinic_applications")
    .delete()
    .eq("id", draftId)
    .eq("status", "draft");
  if (delErr) return { ok: false, error: delErr.message };

  // Edge case: a draft that reached the account step may carry an auth_user_id.
  // Remove it if it's now orphaned (not linked to any clinic) and not a superadmin.
  if (draft.auth_user_id) {
    const [{ count: cuLeft }, { count: puLeft }] = await Promise.all([
      supabase.from("clinic_users").select("id", { count: "exact", head: true }).eq("auth_user_id", draft.auth_user_id),
      supabase.from("patient_users").select("auth_user_id", { count: "exact", head: true }).eq("auth_user_id", draft.auth_user_id),
    ]);
    if ((cuLeft ?? 0) === 0 && (puLeft ?? 0) === 0) {
      const { data: u } = await supabase.auth.admin.getUserById(draft.auth_user_id);
      if ((u?.user?.app_metadata as Record<string, unknown> | undefined)?.role !== "superadmin") {
        await supabase.auth.admin.deleteUser(draft.auth_user_id);
      }
    }
  }

  revalidatePath("/superadmin/applications");
  return { ok: true };
}
