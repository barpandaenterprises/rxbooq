"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serverClient, serviceClient } from "@/lib/supabase/server";

// =============================================================================
// Schemas
// =============================================================================

const featuresSchema = z.object({
  public_listing:       z.boolean(),
  patient_enquiries:    z.boolean(),
  calendar:             z.boolean(),
  emr:                  z.boolean(),
  whatsapp_templates:   z.boolean(),
  sponsored_placement:  z.boolean(),
  online_consult:       z.boolean(),
  custom_domain:        z.boolean(),
  /** 0 = unlimited */
  departments_max:      z.number().int().min(0).max(100),
  analytics:            z.enum(["none", "basic", "full"]),
});

export type PlanFeaturesInput = z.infer<typeof featuresSchema>;

const planSchema = z.object({
  code:                  z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Lowercase letters, digits, dashes; starts alphanumeric"),
  display_name:          z.string().trim().min(2).max(80),
  tagline:               z.string().trim().max(200).nullable().optional(),
  monthly_price_inr:     z.number().int().min(0),
  annual_price_inr:      z.number().int().min(0).nullable().optional(),
  included_doctor_seats: z.number().int().min(0).max(500),
  extra_seat_price_inr:  z.number().int().min(0),
  features:              featuresSchema,
  is_active:             z.boolean(),
  is_popular:            z.boolean(),
  sort_order:            z.number().int().min(0).max(1000),
});

export type PlanInput = z.infer<typeof planSchema>;

const updateSchema = planSchema.extend({ id: z.string().uuid() });
export type PlanUpdateInput = z.infer<typeof updateSchema>;

// =============================================================================
// Common result + auth gate
// =============================================================================

export type PlanMutationResult =
  | { ok: true; id: string; warnings?: string[] }
  | { ok: false; error: string };

async function requireSuperadmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") return { ok: false, error: "Forbidden." };
  return { ok: true, userId: user.id };
}

// =============================================================================
// Create
// =============================================================================

export async function createPlanAction(input: PlanInput): Promise<PlanMutationResult> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireSuperadmin();
  if (!gate.ok) return gate;

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .insert({
      code:                  parsed.data.code,
      display_name:          parsed.data.display_name,
      tagline:               parsed.data.tagline ?? null,
      monthly_price_inr:     parsed.data.monthly_price_inr,
      annual_price_inr:      parsed.data.annual_price_inr ?? null,
      included_doctor_seats: parsed.data.included_doctor_seats,
      extra_seat_price_inr:  parsed.data.extra_seat_price_inr,
      features:              parsed.data.features,
      is_active:             parsed.data.is_active,
      is_popular:            parsed.data.is_popular,
      sort_order:            parsed.data.sort_order,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("duplicate")) return { ok: false, error: `A plan with code "${parsed.data.code}" already exists.` };
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin/plans");
  revalidatePath("/pricing");
  return { ok: true, id: data.id };
}

// =============================================================================
// Update
// =============================================================================

export async function updatePlanAction(input: PlanUpdateInput): Promise<PlanMutationResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireSuperadmin();
  if (!gate.ok) return gate;

  const supabase = serviceClient();

  // Razorpay plans are immutable. If the user changed the price (or seat
  // counts, which feed addon pricing), null out razorpay_plan_id and warn —
  // they need to re-sync, which creates a fresh Razorpay plan for new signups.
  // Existing subscribers stay on whichever Razorpay plan id their subscription
  // row already points at, so nothing breaks for them.
  const { data: prior } = await supabase
    .from("subscription_plans")
    .select("monthly_price_inr, included_doctor_seats, extra_seat_price_inr, razorpay_plan_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!prior) return { ok: false, error: "Plan not found." };

  const priceChanged =
       prior.monthly_price_inr     !== parsed.data.monthly_price_inr
    || prior.included_doctor_seats !== parsed.data.included_doctor_seats
    || prior.extra_seat_price_inr  !== parsed.data.extra_seat_price_inr;
  const wasSynced = !!prior.razorpay_plan_id;

  const patch: Record<string, unknown> = {
    code:                  parsed.data.code,
    display_name:          parsed.data.display_name,
    tagline:               parsed.data.tagline ?? null,
    monthly_price_inr:     parsed.data.monthly_price_inr,
    annual_price_inr:      parsed.data.annual_price_inr ?? null,
    included_doctor_seats: parsed.data.included_doctor_seats,
    extra_seat_price_inr:  parsed.data.extra_seat_price_inr,
    features:              parsed.data.features,
    is_active:             parsed.data.is_active,
    is_popular:            parsed.data.is_popular,
    sort_order:            parsed.data.sort_order,
  };
  if (priceChanged && wasSynced) {
    patch.razorpay_plan_id = null;
  }

  const { error } = await supabase
    .from("subscription_plans")
    .update(patch)
    .eq("id", parsed.data.id);

  if (error) {
    if (error.message.includes("duplicate")) return { ok: false, error: `Code "${parsed.data.code}" is already used by another plan.` };
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin/plans");
  revalidatePath(`/superadmin/plans/${parsed.data.id}/edit`);
  revalidatePath("/pricing");

  const warnings: string[] = [];
  if (priceChanged && wasSynced) {
    warnings.push("Price changed — Razorpay plan id was cleared. Re-run \"Sync to Razorpay\" so new signups pick up the new amount. Existing subscribers continue on their current Razorpay plan.");
  }
  return { ok: true, id: parsed.data.id, warnings };
}

// =============================================================================
// Toggle active (soft delete)
// =============================================================================

export async function togglePlanActiveAction(
  planId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireSuperadmin();
  if (!gate.ok) return gate;

  const supabase = serviceClient();
  const { error } = await supabase
    .from("subscription_plans")
    .update({ is_active: active })
    .eq("id", planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/superadmin/plans");
  revalidatePath("/pricing");
  return { ok: true };
}

// =============================================================================
// Hard delete — only allowed when nothing references the plan. Otherwise
// caller should use togglePlanActiveAction(false) to retire the plan.
// =============================================================================

export async function deletePlanAction(
  planId: string,
): Promise<{ ok: true } | { ok: false; error: string; refs?: { subscriptions: number; clinics: number; drafts: number } }> {
  const gate = await requireSuperadmin();
  if (!gate.ok) return gate;

  const supabase = serviceClient();

  // Count anything that references this plan. If anything does, refuse —
  // dropping the row would break those references (subscriptions FK has no
  // ON DELETE cascade because we never want to lose billing history).
  const [subs, clinics, drafts] = await Promise.all([
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("plan_id", planId),
    supabase.from("clinics").select("id", { count: "exact", head: true }).eq("plan_id", planId),
    supabase.from("clinic_applications").select("id", { count: "exact", head: true }).eq("selected_plan_id", planId),
  ]);
  const refs = {
    subscriptions: subs.count   ?? 0,
    clinics:       clinics.count ?? 0,
    drafts:        drafts.count ?? 0,
  };
  if (refs.subscriptions + refs.clinics + refs.drafts > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${refs.subscriptions} subscription(s), ${refs.clinics} clinic(s), and ${refs.drafts} draft(s) still reference this plan. Deactivate it instead.`,
      refs,
    };
  }

  const { error } = await supabase.from("subscription_plans").delete().eq("id", planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/superadmin/plans");
  revalidatePath("/pricing");
  return { ok: true };
}
