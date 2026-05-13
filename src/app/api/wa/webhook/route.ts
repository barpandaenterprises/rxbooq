/**
 * /api/wa/webhook — Interakt → us
 *
 * Receives two kinds of events:
 *   - delivery / read / failed status updates → update wa_messages.status
 *   - patient replies                         → insert new wa_messages row
 *
 * Auth: Interakt sends a static header `x-webhook-secret` configured in their
 * console. Compare to `INTERAKT_WEBHOOK_SECRET`. Reject mismatches.
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { interakt } from "@/lib/wa/interakt";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.INTERAKT_WEBHOOK_SECRET;
  if (!expected) return false;
  // Try the most likely header names; fall back to a query-string token in case
  // the platform doesn't surface custom headers.
  const candidates = [
    req.headers.get("x-webhook-secret"),
    req.headers.get("x-interakt-secret"),
    req.headers.get("authorization")?.replace(/^Bearer\s+/, "") ?? null,
    req.nextUrl.searchParams.get("token"),
  ];
  return candidates.some((v) => v === expected);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // We need to read the body twice (once for parseWebhook, once for raw
  // storage). Clone the request.
  let events;
  try {
    events = await interakt.parseWebhook(req.clone());
  } catch (err) {
    console.error("[wa/webhook] parse failed:", err);
    return NextResponse.json({ ok: false, error: "Parse failed" }, { status: 400 });
  }

  const supabase = serviceClient();

  for (const ev of events) {
    if (ev.kind === "delivery") {
      // Update the matching outbound message by provider_message_id.
      const { error } = await supabase
        .from("wa_messages")
        .update({ status: ev.status })
        .eq("provider_message_id", ev.providerMessageId);
      if (error) {
        console.error("[wa/webhook] status update failed:", error.message);
      }
      continue;
    }

    if (ev.kind === "reply") {
      // Look up the patient by phone (E.164). We search across all clinics
      // because a single phone might be a patient at multiple tenants — we
      // log the reply against the most-recently-active row.
      const { data: matches } = await supabase
        .from("patients")
        .select("id, clinic_id, full_name")
        .eq("phone_e164", ev.from)
        .order("created_at", { ascending: false })
        .limit(1);

      const match = matches?.[0];
      if (!match) {
        // Unknown sender — log it against null clinic so super-admin can review.
        console.warn("[wa/webhook] reply from unknown phone:", ev.from);
        continue;
      }

      await supabase.from("wa_messages").insert({
        clinic_id:      match.clinic_id,
        patient_id:     match.id,
        appointment_id: null,
        template_name:  null,
        direction:      "in",
        payload:        { body: ev.text, from: ev.from, ts: ev.ts },
        status:         "delivered",
      });

      // If the reply looks like a confirmation ("YES" / "1") and there's a
      // booked appointment in the next 48h, flip it to confirmed.
      const normalized = ev.text.trim().toUpperCase();
      if (normalized === "YES" || normalized === "1") {
        const horizon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("clinic_id", match.clinic_id)
          .eq("patient_id", match.id)
          .eq("status", "booked")
          .lt("starts_at", horizon);
      }
    }
  }

  return NextResponse.json({ ok: true, processed: events.length });
}
