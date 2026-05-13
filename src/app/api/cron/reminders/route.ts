/**
 * /api/cron/reminders
 *
 * Sends WhatsApp reminders for upcoming appointments. Designed to be hit by
 * Supabase pg_cron or a Vercel/Cloudflare cron — anything that can authenticate
 * with a shared secret.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` OR `?token=${CRON_SECRET}` for
 * platforms that don't let cron set headers (e.g. Vercel preview).
 *
 * Two windows are sent per call:
 *   - 24h-ahead reminders (template: reminder_evening_before_v1)
 *       Sent to appointments starting in [now + 23h, now + 25h] that haven't
 *       already received this template.
 *   - 1h-ahead reminders  (template: reminder_one_hour_v1)
 *       Sent to appointments starting in [now + 50min, now + 70min] that haven't
 *       already received this template.
 *
 * Recommended cadence: every 10 minutes. We over-window slightly so a missed
 * cron tick doesn't drop reminders.
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import {
  sendReminderEveningBefore,
  sendReminderOneHour,
} from "@/lib/wa/booking";

const ONE_MIN_MS  = 60_000;
const ONE_HOUR_MS = 60 * ONE_MIN_MS;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const fromHeader = header.startsWith("Bearer ") ? header.slice(7) : null;
  const fromQuery  = req.nextUrl.searchParams.get("token");
  return fromHeader === secret || fromQuery === secret;
}

type ApptRow = {
  id:        string;
  starts_at: string;
};

async function appointmentsInRange(fromIso: string, toIso: string): Promise<ApptRow[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, status")
    .gte("starts_at", fromIso)
    .lt("starts_at",  toIso)
    .in("status", ["booked", "confirmed"]);
  if (error) {
    console.error("[cron/reminders] appointments query failed:", error.message);
    return [];
  }
  return (data ?? []) as ApptRow[];
}

async function alreadySent(appointmentId: string, template: string): Promise<boolean> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("template_name",  template)
    .in("status", ["queued", "delivered", "read", "replied"])
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function processWindow(
  fromIso: string,
  toIso: string,
  template: string,
  send: (id: string) => Promise<void>,
): Promise<{ scanned: number; sent: number; skipped: number; failed: number }> {
  const rows = await appointmentsInRange(fromIso, toIso);
  let sent = 0, skipped = 0, failed = 0;
  for (const a of rows) {
    if (await alreadySent(a.id, template)) {
      skipped++;
      continue;
    }
    try {
      await send(a.id);
      sent++;
    } catch (err) {
      console.error(`[cron/reminders] ${template} failed for ${a.id}:`, err);
      failed++;
    }
  }
  return { scanned: rows.length, sent, skipped, failed };
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  const eveningWindow = await processWindow(
    new Date(now + 23 * ONE_HOUR_MS).toISOString(),
    new Date(now + 25 * ONE_HOUR_MS).toISOString(),
    "reminder_evening_before_v1",
    sendReminderEveningBefore,
  );

  const oneHourWindow = await processWindow(
    new Date(now + 50 * ONE_MIN_MS).toISOString(),
    new Date(now + 70 * ONE_MIN_MS).toISOString(),
    "reminder_one_hour_v1",
    sendReminderOneHour,
  );

  return NextResponse.json({
    ok: true,
    eveningBefore: eveningWindow,
    oneHour:       oneHourWindow,
  });
}

export const GET  = handle;
export const POST = handle;
