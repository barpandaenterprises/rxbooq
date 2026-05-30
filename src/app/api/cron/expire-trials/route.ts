/**
 * Daily cron — downgrade trialing subscriptions whose trial_ends_at < now()
 * to the Free plan instead of paywalling them. (Practo-style: never lock out
 * the public profile.) The clinic's plan_id is also pointed at Free so feature
 * gates fall back immediately.
 *
 * Wire up via Vercel Cron (or any scheduler) hitting this endpoint daily.
 * Protected by CRON_SECRET — pass as ?secret=... or Authorization: Bearer ...
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  const url  = req.nextUrl;
  const provided = url.searchParams.get("secret") ?? (auth?.startsWith("Bearer ") ? auth.slice(7) : null);
  if (provided !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = serviceClient();

  // Find expired trials.
  const { data: expired, error: readErr } = await supabase
    .from("subscriptions")
    .select("id, clinic_id, trial_ends_at")
    .eq("status", "trialing")
    .lt("trial_ends_at", new Date().toISOString());
  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, downgraded: 0 });
  }

  // Look up the Free plan id once.
  const { data: freePlan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("code", "free")
    .maybeSingle();
  if (!freePlan) {
    return NextResponse.json({ ok: false, error: "Free plan missing — seed 0014" }, { status: 500 });
  }

  const downgraded: string[] = [];
  for (const row of expired) {
    const { error: subErr } = await supabase
      .from("subscriptions")
      .update({
        plan_id:      freePlan.id,
        status:       "active",
        extra_seats:  0,
        trial_ends_at: null,
      })
      .eq("id", row.id);
    if (subErr) {
      console.error(`[expire-trials] subscription ${row.id} update failed:`, subErr.message);
      continue;
    }
    await supabase.from("clinics").update({ plan_id: freePlan.id }).eq("id", row.clinic_id);
    downgraded.push(row.id);
  }

  return NextResponse.json({ ok: true, downgraded: downgraded.length, ids: downgraded });
}
