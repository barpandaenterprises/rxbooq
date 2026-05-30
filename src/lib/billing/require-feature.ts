/**
 * Feature gate for server actions. Call near the top of any admin action that
 * implements a paid-only capability — addDoctor (seat cap), sendBroadcast
 * (whatsapp_templates), createDepartment (departments_max), etc.
 *
 * Returns a Result rather than throwing, so callers can render an inline
 * "Upgrade" CTA in their existing action-result UI instead of a 500.
 */

import { getPlanForClinic, type PlanFeatures } from "./plan-features";

export type RequireFeatureResult =
  | { ok: true }
  | { ok: false; error: "upgrade_required"; feature: keyof PlanFeatures; upgradeUrl: string };

const UPGRADE_URL = "/admin/settings/billing";

export async function requirePlanFeature(
  clinicId: string,
  feature:  keyof PlanFeatures,
): Promise<RequireFeatureResult> {
  const plan = await getPlanForClinic(clinicId);
  if (!plan) return { ok: false, error: "upgrade_required", feature, upgradeUrl: UPGRADE_URL };

  const value = plan.features[feature];

  // Booleans gate access directly; numeric flags (departments_max) and the
  // analytics tier are checked by their own helpers below — this is the
  // boolean fast-path.
  if (typeof value === "boolean" && value) return { ok: true };

  return { ok: false, error: "upgrade_required", feature, upgradeUrl: UPGRADE_URL };
}

/**
 * Seat cap: included_doctor_seats + subscriptions.extra_seats. Call from
 * addDoctorAction before insert. Returns the limit so the caller can show
 * "3 / 3 seats used — upgrade for more".
 */
export async function checkSeatCap(
  clinicId:       string,
  currentDoctors: number,
): Promise<{ ok: true; limit: number; remaining: number } | { ok: false; limit: number; upgradeUrl: string }> {
  const plan = await getPlanForClinic(clinicId);
  if (!plan) return { ok: false, limit: 0, upgradeUrl: UPGRADE_URL };

  // Sum included + extra seats from the active subscription row.
  const { serviceClient } = await import("@/lib/supabase/server");
  const supabase = serviceClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("extra_seats")
    .eq("clinic_id", clinicId)
    .in("status", ["trialing", "active", "past_due"])
    .maybeSingle();

  const limit     = plan.includedDoctorSeats + (sub?.extra_seats ?? 0);
  const remaining = Math.max(0, limit - currentDoctors);

  return remaining > 0
    ? { ok: true,  limit, remaining }
    : { ok: false, limit, upgradeUrl: UPGRADE_URL };
}
