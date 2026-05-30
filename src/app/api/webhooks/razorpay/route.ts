/**
 * Razorpay webhook receiver. Verifies the HMAC against the RAW body (the parsed
 * JSON re-serialised would not match), then updates our subscriptions table.
 *
 * Configure once per environment in the Razorpay dashboard:
 *   URL:    https://<host>/api/webhooks/razorpay
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 *   Events: subscription.activated, subscription.charged, subscription.halted,
 *           subscription.cancelled, subscription.paused, subscription.resumed
 *
 * Idempotency: every event carries a razorpay_subscription_id; we always
 * write by that id so re-deliveries are safe.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  type RazorpaySubscriptionEntity,
  type RazorpayWebhookEnvelope,
} from "@/lib/razorpay/webhooks";
import { serviceClient } from "@/lib/supabase/server";

export const runtime = "nodejs"; // needs node:crypto + raw body

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, sig)) {
    console.error("[razorpay-webhook] signature mismatch");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let envelope: RazorpayWebhookEnvelope;
  try {
    envelope = JSON.parse(raw) as RazorpayWebhookEnvelope;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const subEntity = envelope.payload.subscription?.entity;
  if (!subEntity) {
    // Non-subscription event — ack and ignore (we don't subscribe to others yet).
    return NextResponse.json({ ok: true, ignored: envelope.event });
  }

  const supabase = serviceClient();

  switch (envelope.event) {
    case "subscription.activated":
    case "subscription.authenticated":
      await markStatus(supabase, subEntity, "active");
      break;
    case "subscription.charged":
      await markStatus(supabase, subEntity, "active");
      break;
    case "subscription.pending":
      await markStatus(supabase, subEntity, "past_due");
      break;
    case "subscription.halted":
      await markStatus(supabase, subEntity, "past_due");
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      await markStatus(supabase, subEntity, "cancelled");
      break;
    case "subscription.paused":
      await markStatus(supabase, subEntity, "paused");
      break;
    case "subscription.resumed":
      await markStatus(supabase, subEntity, "active");
      break;
    default:
      // Unknown event — ack so Razorpay stops retrying. Logged for visibility.
      console.log(`[razorpay-webhook] unhandled event: ${envelope.event}`);
  }

  return NextResponse.json({ ok: true });
}

async function markStatus(
  supabase: ReturnType<typeof serviceClient>,
  entity:   RazorpaySubscriptionEntity,
  status:   "trialing" | "active" | "past_due" | "cancelled" | "paused",
) {
  const patch: Record<string, unknown> = { status };

  if (entity.current_start) patch.current_period_start = new Date(entity.current_start * 1000).toISOString();
  if (entity.current_end)   patch.current_period_end   = new Date(entity.current_end * 1000).toISOString();

  const { error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("razorpay_subscription_id", entity.id);

  if (error) {
    console.error("[razorpay-webhook] subscriptions update failed:", error.message);
  }
}
