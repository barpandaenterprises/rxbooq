/**
 * Coupon + plan pricing math. The single source of truth for what a clinic
 * owes. Server-only — the client never computes prices, it just renders the
 * preview returned by applyCouponAction.
 *
 * Mirror of the SQL block in 0017_activate_clinic_application.sql — if you
 * change one, change both. (We don't push the math into Postgres because
 * the same helper is reused at upgrade time, where the activation RPC is
 * not involved.)
 */

export type CouponKind  = "percent" | "flat";
export type CouponScope = "first_cycle" | "recurring";

export type PriceablePlan = {
  monthly_price_inr:     number;
  included_doctor_seats: number;
  extra_seat_price_inr:  number;
};

export type PriceableCoupon = {
  id:    string;
  code:  string;
  kind:  CouponKind;
  value: number;
  scope: CouponScope;
};

export type PriceQuote = {
  baseInr:        number;
  discountInr:    number;
  totalInr:       number;
  extraSeats:     number;
  scope:          CouponScope | null;
  appliedCoupon:  PriceableCoupon | null;
};

export function quotePlan(
  plan:          PriceablePlan,
  requestedSeats: number,
  coupon:        PriceableCoupon | null,
): PriceQuote {
  const extraSeats = Math.max(0, Math.floor(requestedSeats) - plan.included_doctor_seats);
  const baseInr    = plan.monthly_price_inr + extraSeats * plan.extra_seat_price_inr;

  let discountInr = 0;
  if (coupon && baseInr > 0) {
    discountInr = coupon.kind === "percent"
      ? Math.floor((baseInr * coupon.value) / 100)
      : Math.min(coupon.value, baseInr);
  }

  return {
    baseInr,
    discountInr,
    totalInr:      Math.max(0, baseInr - discountInr),
    extraSeats,
    scope:         coupon?.scope ?? null,
    appliedCoupon: coupon,
  };
}

/** Format an INR integer as "₹1,234". Caller-side display only. */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:                "currency",
    currency:             "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
