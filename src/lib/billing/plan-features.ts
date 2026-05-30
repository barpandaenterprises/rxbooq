/**
 * Plan feature flags — the source of truth is subscription_plans.features (jsonb)
 * in Postgres. This module just types it and provides a cached read.
 *
 * Shape mirrors the seed in 0014_subscription_plans.sql. Update both when adding
 * a new flag.
 */

import { cache } from "react";
import { serviceClient } from "@/lib/supabase/server";

export type AnalyticsTier = "none" | "basic" | "full";

export type PlanFeatures = {
  public_listing:       boolean;
  patient_enquiries:    boolean;
  calendar:             boolean;
  emr:                  boolean;
  whatsapp_templates:   boolean;
  sponsored_placement:  boolean;
  online_consult:       boolean;
  custom_domain:        boolean;
  /** 0 = unlimited */
  departments_max:      number;
  analytics:            AnalyticsTier;
};

export type ResolvedPlan = {
  planId:                string;
  planCode:              string;
  displayName:           string;
  monthlyPriceInr:       number;
  includedDoctorSeats:   number;
  extraSeatPriceInr:     number;
  features:              PlanFeatures;
};

const DEFAULT_FEATURES: PlanFeatures = {
  public_listing:      true,
  patient_enquiries:   true,
  calendar:            false,
  emr:                 false,
  whatsapp_templates:  false,
  sponsored_placement: false,
  online_consult:      false,
  custom_domain:       false,
  departments_max:     1,
  analytics:           "none",
};

/**
 * Resolve the active subscription for a clinic and return its plan + features.
 * Returns null only if the clinic does not exist. Falls back to a Free-tier-
 * equivalent if no subscription row is present (legacy clinics from before 0014).
 */
export const getPlanForClinic = cache(async (clinicId: string): Promise<ResolvedPlan | null> => {
  const supabase = serviceClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      plan_id,
      status,
      subscription_plans!inner (
        id,
        code,
        display_name,
        monthly_price_inr,
        included_doctor_seats,
        extra_seat_price_inr,
        features
      )
    `)
    .eq("clinic_id", clinicId)
    .in("status", ["trialing", "active", "past_due"])
    .maybeSingle();

  if (error) {
    console.error("[getPlanForClinic] sub lookup failed:", error.message);
    return null;
  }

  // No active subscription row — clinic is legacy or freshly created. Resolve
  // the plan via clinics.plan_id (set by the activate RPC) or fall back to Free.
  if (!data) {
    const { data: clinicRow } = await supabase
      .from("clinics")
      .select("plan_id, subscription_plans!inner ( id, code, display_name, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, features )")
      .eq("id", clinicId)
      .maybeSingle();
    if (!clinicRow?.subscription_plans) return null;
    const p = clinicRow.subscription_plans as unknown as PlanRow;
    return planRowToResolved(p);
  }

  return planRowToResolved((data.subscription_plans as unknown) as PlanRow);
});

type PlanRow = {
  id:                     string;
  code:                   string;
  display_name:           string;
  monthly_price_inr:      number;
  included_doctor_seats:  number;
  extra_seat_price_inr:   number;
  features:               Record<string, unknown>;
};

function planRowToResolved(row: PlanRow): ResolvedPlan {
  return {
    planId:              row.id,
    planCode:            row.code,
    displayName:         row.display_name,
    monthlyPriceInr:     row.monthly_price_inr,
    includedDoctorSeats: row.included_doctor_seats,
    extraSeatPriceInr:   row.extra_seat_price_inr,
    features:            { ...DEFAULT_FEATURES, ...(row.features as Partial<PlanFeatures>) },
  };
}
