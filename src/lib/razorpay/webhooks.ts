/**
 * Razorpay webhook signature verification and event narrowing.
 *
 * Razorpay sends a SHA-256 HMAC of the raw request body using the webhook
 * secret as the key, in the `x-razorpay-signature` header. We MUST verify
 * against the raw body — re-serialising the parsed JSON will produce a
 * different byte sequence and the signature will not match.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayEventType =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.completed"
  | "subscription.updated"
  | "subscription.pending"
  | "subscription.halted"
  | "subscription.cancelled"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.authenticated";

export type RazorpayWebhookEnvelope = {
  event:   string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?:      { entity: RazorpayPaymentEntity };
  };
  created_at: number;
};

export type RazorpaySubscriptionEntity = {
  id:                  string;
  plan_id:             string;
  customer_id?:        string;
  status:              string;
  current_start?:      number;
  current_end?:        number;
  ended_at?:           number;
  charge_at?:          number;
  start_at?:           number;
  paid_count?:         number;
  cancelled_at?:       number;
};

export type RazorpayPaymentEntity = {
  id:       string;
  amount:   number;
  currency: string;
  status:   string;
};

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
