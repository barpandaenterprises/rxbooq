"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serviceClient, serverClient } from "@/lib/supabase/server";
import { quotePlan, type CouponScope } from "@/lib/billing/pricing";
import {
  createCustomer,
  createSubscription,
} from "@/lib/razorpay/subscriptions";

const upgradeSchema = z.object({
  planId:     z.string().uuid(),
  extraSeats: z.number().int().min(0).max(50).default(0),
  couponCode: z.string().trim().min(1).max(60).optional(),
});

export type UpgradeInput  = z.infer<typeof upgradeSchema>;
export type UpgradeResult =
  | { ok: true;  hostedUrl: string; subscriptionId: string }
  | { ok: false; error: string };

export async function upgradePlanAction(input: UpgradeInput): Promise<UpgradeResult> {
  const parsed = upgradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Resolve the caller's clinic from their session.
  const sess     = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const supabase = serviceClient();
  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id, display_name, email, phone")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cu?.clinic_id) return { ok: false, error: "Your account is not linked to a clinic." };

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, razorpay_plan_id")
    .eq("id", parsed.data.planId)
    .maybeSingle();
  if (!plan)                      return { ok: false, error: "Plan not found." };
  if (!plan.razorpay_plan_id)     return { ok: false, error: "Plan is not yet synced to Razorpay — superadmin must run /superadmin/billing/sync-plans first." };

  // Load + apply coupon if provided. Compute the price quote (also recorded
  // when the webhook activates the subscription).
  let coupon: (Awaited<ReturnType<typeof loadCoupon>>) | null = null;
  if (parsed.data.couponCode) {
    coupon = await loadCoupon(parsed.data.couponCode.toLowerCase());
    if (!coupon) return { ok: false, error: "Coupon not found or inactive." };
  }

  const quote = quotePlan(plan, parsed.data.extraSeats + plan.included_doctor_seats, coupon);

  // Look up or create a Razorpay customer.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("razorpay_customer_id")
    .eq("clinic_id", cu.clinic_id)
    .in("status", ["trialing", "active", "past_due"])
    .maybeSingle();

  let customerId = sub?.razorpay_customer_id ?? null;
  if (!customerId) {
    try {
      const c = await createCustomer({
        name:    cu.display_name ?? "Rxbooq user",
        email:   cu.email ?? user.email ?? "",
        contact: cu.phone ?? "",
      });
      customerId = c.id;
    } catch (e) {
      return { ok: false, error: `Razorpay customer create failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // Create the Razorpay subscription (no extra trial — the in-app trial already ran).
  let created;
  try {
    created = await createSubscription({
      razorpayPlanId:    plan.razorpay_plan_id,
      customerId,
      extraSeats:        parsed.data.extraSeats,
      extraSeatPriceInr: plan.extra_seat_price_inr,
      coupon:            coupon,
      trialDays:         0,
    });
  } catch (e) {
    return { ok: false, error: `Razorpay subscription create failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Update or insert our subscriptions row.
  if (sub) {
    await supabase
      .from("subscriptions")
      .update({
        plan_id:                  parsed.data.planId,
        razorpay_customer_id:     customerId,
        razorpay_subscription_id: created.razorpaySubscriptionId,
        extra_seats:              parsed.data.extraSeats,
        applied_coupon_id:        coupon?.id ?? null,
        // status will flip to 'active' via webhook on subscription.activated
      })
      .eq("clinic_id", cu.clinic_id)
      .in("status", ["trialing", "active", "past_due"]);
  } else {
    await supabase.from("subscriptions").insert({
      clinic_id:                cu.clinic_id,
      plan_id:                  parsed.data.planId,
      status:                   "trialing", // flips on webhook
      razorpay_customer_id:     customerId,
      razorpay_subscription_id: created.razorpaySubscriptionId,
      extra_seats:              parsed.data.extraSeats,
      applied_coupon_id:        coupon?.id ?? null,
    });
  }

  // Record the redemption (snapshot the discount + partner attribution).
  if (coupon && quote.discountInr > 0) {
    await supabase.from("coupon_redemptions").insert({
      coupon_id:                coupon.id,
      clinic_id:                cu.clinic_id,
      amount_inr_off:           quote.discountInr,
      partner_user_id_snapshot: coupon.partner_user_id,
    });
  }

  // Also keep clinics.plan_id pointed at the upgraded tier.
  await supabase.from("clinics").update({ plan_id: parsed.data.planId }).eq("id", cu.clinic_id);

  revalidatePath("/admin/settings/billing");
  return { ok: true, hostedUrl: created.shortUrl, subscriptionId: created.razorpaySubscriptionId };
}

async function loadCoupon(code: string) {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("coupons")
    .select("id, code, kind, value, scope, partner_user_id, razorpay_offer_id, is_active")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return {
    id:                data.id,
    code:              data.code,
    kind:              data.kind as "percent" | "flat",
    value:             data.value,
    scope:             data.scope as CouponScope,
    partner_user_id:   data.partner_user_id,
    razorpay_offer_id: data.razorpay_offer_id,
  };
}
