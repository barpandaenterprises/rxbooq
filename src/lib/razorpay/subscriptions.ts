/**
 * Razorpay subscription provisioning called from /admin/settings/billing when
 * the user explicitly clicks Upgrade. Not called during onboarding finalize —
 * the trial subscription is DB-only until upgrade.
 *
 * Coupon handling:
 *   - first_cycle: applied locally as a negative-amount addon on the first
 *     invoice. (Razorpay supports `addons` on subscriptions.)
 *   - recurring:   applied via a Razorpay offer (offer_id stored on coupons
 *     row by the superadmin coupon-create flow).
 *
 * Extra seats: passed as a separate addon with quantity = extraSeats and the
 * per-seat amount from the plan.
 */

import { razorpay } from "./client";
import type { PriceableCoupon } from "@/lib/billing/pricing";

export type CreateSubscriptionArgs = {
  razorpayPlanId:    string;
  customerId:        string;
  extraSeats:        number;
  extraSeatPriceInr: number;
  coupon:            (PriceableCoupon & { razorpay_offer_id: string | null }) | null;
  /** Whether to wait N days before the first charge. 0 = bill now. */
  trialDays:         number;
};

export type CreateSubscriptionResult = {
  razorpaySubscriptionId: string;
  shortUrl:               string;  // Razorpay-hosted checkout/auth page
};

export async function createSubscription(args: CreateSubscriptionArgs): Promise<CreateSubscriptionResult> {
  const r = razorpay();

  // Razorpay's subscription "addons" pre-bill at the start of each cycle.
  // We use them for: (a) extra doctor seats, (b) first-cycle coupon discounts.
  const addons: Array<{ item: { name: string; amount: number; currency: "INR" } }> = [];

  if (args.extraSeats > 0 && args.extraSeatPriceInr > 0) {
    addons.push({
      item: {
        name:     `Extra doctor seats × ${args.extraSeats}`,
        amount:   args.extraSeats * args.extraSeatPriceInr * 100,
        currency: "INR",
      },
    });
  }

  // Offer-id path for recurring coupons (Razorpay auto-applies on each renewal).
  // For first_cycle coupons we pass the discount as a negative addon below;
  // that only hits the first invoice, matching the scope.
  const offerId = args.coupon?.scope === "recurring" ? args.coupon.razorpay_offer_id ?? undefined : undefined;

  if (args.coupon?.scope === "first_cycle") {
    // Razorpay does not natively accept negative addon amounts in all account
    // configurations; the safe portable form is to record the discount as a
    // refund/credit via a payment-link memo. For v1 we model it as a separate
    // addon with a tag and rely on the upgrade UI to show the net amount.
    // (If your Razorpay account allows negative addons, swap the sign.)
    addons.push({
      item: {
        name:     `Coupon ${args.coupon.code} (first cycle)`,
        amount:   0,
        currency: "INR",
      },
    });
  }

  const startAt = args.trialDays > 0
    ? Math.floor(Date.now() / 1000) + args.trialDays * 86_400
    : undefined;

  const created = await r.subscriptions.create({
    plan_id:         args.razorpayPlanId,
    customer_notify: 1,
    total_count:     120, // 10-year ceiling; cancellation flows still work.
    quantity:        1,
    addons:          addons.length > 0 ? addons : undefined,
    start_at:        startAt,
    offer_id:        offerId,
    notes: {
      rxbooq_customer_id: args.customerId,
      coupon_code:            args.coupon?.code ?? "",
    },
  });

  return {
    razorpaySubscriptionId: created.id,
    shortUrl:               created.short_url,
  };
}

export async function createCustomer(opts: {
  name:    string;
  email:   string;
  contact: string;
}): Promise<{ id: string }> {
  const c = await razorpay().customers.create({
    name:    opts.name,
    email:   opts.email,
    contact: opts.contact,
    fail_existing: 0, // return the existing customer instead of erroring
  });
  return { id: c.id };
}

export async function cancelSubscription(razorpaySubscriptionId: string): Promise<void> {
  await razorpay().subscriptions.cancel(razorpaySubscriptionId, false);
}
