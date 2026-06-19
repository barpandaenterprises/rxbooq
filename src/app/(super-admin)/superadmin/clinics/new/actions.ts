"use server";

/**
 * Super-admin "Onboard clinic" server action.
 *
 * Reuses the same battle-tested provisioning path as the public funnel: it
 * inserts a clinic_applications row and calls the activate_clinic_application
 * RPC (clinic + clinic_admin + founding doctor + subscription in one
 * transaction). The difference from /get-started is the trust boundary — there
 * is no OTP gate here; access is gated by the superadmin role check below.
 *
 * Result-shape convention matches the rest of the codebase (see
 * src/app/(onboarding)/get-started/actions.ts).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serverClient, serviceClient } from "@/lib/supabase/server";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";

const schema = z.object({
  // Clinic
  clinic_name:    z.string().trim().min(2, "Clinic name must be at least 2 characters.").max(120, "Clinic name is too long."),
  suggested_slug: z.string().trim().min(2, "URL slug must be at least 2 characters.").max(60, "URL slug is too long.")
                    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Use lowercase letters, digits, and hyphens."),
  address:        z.string().trim().min(5, "Street address must be at least 5 characters.").max(200, "Address is too long."),
  city:           z.string().trim().min(2, "Enter the city.").max(80, "City name is too long."),
  state:          z.string().trim().min(2, "Enter the state.").max(80, "State name is too long."),
  pincode:        z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode."),
  primary_phone:  z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/, "Enter a valid phone number."),
  primary_email:  z.string().trim().toLowerCase().email("Enter a valid email address."),

  // Founding doctor
  doctor_full_name:         z.string().trim().min(2, "Enter the doctor's full name.").max(120, "Name is too long."),
  doctor_registration_no:   z.string().trim().min(2, "Enter the registration number.").max(60, "Registration number is too long."),
  doctor_qualifications:    z.string().trim().max(200, "Qualifications are too long.").optional(),
  doctor_primary_specialty: z.string().trim().max(80, "Specialty is too long.").optional(),
  doctor_years_experience:  z.number().int().min(0).max(80, "Enter a realistic number of years.").optional(),

  // Plan & access
  planId:                 z.string().uuid("Pick a plan."),
  requested_doctor_seats: z.number().int().min(1).max(50).default(1),
  password:               z.string().min(8, "Password must be at least 8 characters.").max(120, "Password is too long."),
});

export type CreateClinicInput = z.infer<typeof schema>;

export type CreateClinicResult =
  | { ok: true; clinicId: string; clinicSlug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createClinicAction(input: CreateClinicInput): Promise<CreateClinicResult> {
  // 1. Guard — superadmin only. The layout guards reads; this guards the write.
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if ((user.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
    return { ok: false, error: "Forbidden." };
  }

  // 2. Validate, mapping each issue to its field for inline rendering.
  const parsed = schema.safeParse(input);
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

  // 3. Slug guards (reserved + already claimed) — fail clearly instead of
  //    tripping the unique-index violation deep inside the RPC.
  if (isReservedSlug(d.suggested_slug)) {
    return {
      ok: false,
      error: `"${d.suggested_slug}" is reserved by the platform.`,
      fieldErrors: { suggested_slug: `"${d.suggested_slug}" is reserved — pick another.` },
    };
  }
  const { data: slugHit } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", d.suggested_slug)
    .maybeSingle();
  if (slugHit) {
    return {
      ok: false,
      error: `"${d.suggested_slug}" is already taken.`,
      fieldErrors: { suggested_slug: `"${d.suggested_slug}" is already taken.` },
    };
  }

  // 4. Plan must exist and be active.
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, is_active")
    .eq("id", d.planId)
    .maybeSingle();
  if (!plan || !plan.is_active) {
    return { ok: false, error: "Selected plan is not available.", fieldErrors: { planId: "Pick an active plan." } };
  }

  // 5. Create the founding auth user. Login is the contact email + password.
  const { data: created, error: cuErr } = await supabase.auth.admin.createUser({
    email:         d.primary_email,
    password:      d.password,
    email_confirm: true,
    user_metadata: { onboarded_by_superadmin: user.id },
  });
  if (cuErr || !created.user) {
    const dup = cuErr?.message?.includes("already registered");
    return {
      ok: false,
      error: dup ? "An account with this email already exists." : (cuErr?.message ?? "Could not create the founder account."),
      fieldErrors: dup ? { primary_email: "This email already has an account." } : undefined,
    };
  }
  const authUserId = created.user.id;

  // 6. Insert the application row the RPC operates on. status='draft' sidesteps
  //    the submitted-complete CHECK; the RPC re-validates the required fields and
  //    flips it to 'active'. onboarding_channel/contact are left null on purpose
  //    (those are only for the public resume flow's per-contact uniqueness).
  const { data: app, error: appErr } = await supabase
    .from("clinic_applications")
    .insert({
      auth_user_id:             authUserId,
      status:                   "draft",
      clinic_name:              d.clinic_name,
      suggested_slug:           d.suggested_slug,
      address:                  d.address,
      city:                     d.city,
      state:                    d.state,
      pincode:                  d.pincode,
      primary_phone:            d.primary_phone,
      primary_email:            d.primary_email,
      doctor_full_name:         d.doctor_full_name,
      doctor_registration_no:   d.doctor_registration_no,
      doctor_qualifications:    d.doctor_qualifications ?? null,
      doctor_primary_specialty: d.doctor_primary_specialty ?? null,
      doctor_years_experience:  d.doctor_years_experience ?? null,
      selected_plan_id:         d.planId,
      requested_doctor_seats:   d.requested_doctor_seats,
      last_step_completed:      "account",
    })
    .select("id")
    .single();
  if (appErr || !app) {
    // Roll back the auth user so a retry starts clean.
    await supabase.auth.admin.deleteUser(authUserId);
    return { ok: false, error: appErr?.message ?? "Could not create the application." };
  }

  // 7. Activate → clinic + clinic_admin + founding doctor + subscription.
  const { data: clinicId, error: actErr } = await supabase.rpc(
    "activate_clinic_application",
    { application_id: app.id },
  );
  if (actErr || !clinicId) {
    await supabase.from("clinic_applications").delete().eq("id", app.id);
    await supabase.auth.admin.deleteUser(authUserId);
    return { ok: false, error: actErr?.message ?? "Activation failed." };
  }

  revalidatePath("/superadmin/clinics");
  return { ok: true, clinicId: clinicId as string, clinicSlug: d.suggested_slug };
}
