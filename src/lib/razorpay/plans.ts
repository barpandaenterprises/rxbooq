/**
 * One-time + idempotent sync of our subscription_plans rows into Razorpay
 * Plans. Run from /superadmin/billing/sync-plans (one button) per environment.
 *
 * Razorpay Subscriptions require a plan_id — we cannot create a subscription
 * with inline pricing. So at deploy time we ensure every active paid plan in
 * our DB has a matching Razorpay plan id stored back on the row.
 *
 * Free tier is skipped — there's nothing to charge for.
 */

import { razorpay } from "./client";
import { serviceClient } from "@/lib/supabase/server";

export type SyncPlansResult = {
  created: string[];
  skipped: string[];
  errors:  { planCode: string; error: string }[];
};

export async function syncPlans(): Promise<SyncPlansResult> {
  const supabase = serviceClient();
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, monthly_price_inr, razorpay_plan_id, is_active")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw new Error(`subscription_plans read failed: ${error.message}`);

  const result: SyncPlansResult = { created: [], skipped: [], errors: [] };

  for (const p of plans ?? []) {
    if (p.code === "free" || p.monthly_price_inr === 0) {
      result.skipped.push(p.code);
      continue;
    }
    if (p.razorpay_plan_id) {
      result.skipped.push(p.code);
      continue;
    }

    try {
      const created = await razorpay().plans.create({
        period:   "monthly",
        interval: 1,
        item: {
          name:        p.display_name,
          amount:      p.monthly_price_inr * 100, // Razorpay takes paise
          currency:    "INR",
          description: `Rxbooq ${p.display_name} plan`,
        },
      });

      const { error: updErr } = await supabase
        .from("subscription_plans")
        .update({ razorpay_plan_id: created.id })
        .eq("id", p.id);

      if (updErr) throw new Error(updErr.message);
      result.created.push(p.code);
    } catch (e) {
      result.errors.push({ planCode: p.code, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return result;
}
