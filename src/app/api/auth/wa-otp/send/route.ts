/**
 * POST /api/auth/wa-otp/send
 *
 * Body: { phone: "98765 12342" | "+919876512342" }
 *
 * 1. Resolves the tenant clinic from middleware headers.
 * 2. Confirms the phone is on file as a patient at this clinic — we never send
 *    OTPs to unknown numbers (reduces SMS spam vector).
 * 3. Rate-limits to one OTP per (clinic, phone) per 60s.
 * 4. Generates a 6-digit code, SHA-256 hashes it, stores in `otp_codes` with a
 *    10-minute TTL.
 * 5. Sends the code via Interakt template `patient_otp_v1` and logs to wa_messages.
 *
 * Returns 200 even if the phone isn't on file — we don't leak whether a number
 * is registered. The user-facing copy just says "if your number is on file…".
 */

import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/server";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { sendWaTemplate } from "@/lib/wa/send";
import { useMockData } from "@/lib/feature-flags";
import { toE164 } from "@/lib/phone";

const sendSchema = z.object({
  phone: z.string().trim().min(8, "Enter your phone number"),
});

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const clinic = await getCurrentClinic();
  if (!clinic) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve the clinic for this request." },
      { status: 400 },
    );
  }

  const phoneE164 = toE164(parsed.data.phone);
  const supabase  = serviceClient();

  // Look up patient by clinic + phone. If absent, we still return 200 to avoid
  // leaking which numbers are on file.
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("clinic_id",  clinic.id)
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  if (!patient) {
    // Pretend we sent. The client UX will time out the user at the verify step.
    return NextResponse.json({ ok: true, sent: true });
  }

  // Rate-limit: at most one OTP per (clinic, phone) per 60s.
  const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await supabase
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinic.id)
    .eq("phone_e164", phoneE164)
    .gte("created_at", sixtySecAgo);
  if ((recentCount ?? 0) >= 1) {
    return NextResponse.json(
      { ok: false, error: "Please wait a minute before requesting a new code." },
      { status: 429 },
    );
  }

  // Generate + hash the code.
  const code     = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error: insertErr } = await supabase
    .from("otp_codes")
    .insert({
      clinic_id:  clinic.id,
      phone_e164: phoneE164,
      code_hash:  codeHash,
      purpose:    "patient_signin",
      expires_at: expiresAt,
    });

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  // Send via Interakt. In mock mode this short-circuits — for local dev we
  // echo the code back so the developer can complete the flow without
  // configuring Interakt. Don't do this in production.
  if (useMockData()) {
    return NextResponse.json({ ok: true, sent: true, mock: true, code });
  }

  const tplName = process.env.WA_OTP_TEMPLATE_NAME || "patient_otp_v1";
  const result  = await sendWaTemplate({
    clinicId:     clinic.id,
    patientId:    patient.id,
    template:     tplName,
    language:     "en",
    variables:    [code, clinic.name],
    to:           phoneE164,
    respectOptOut: false,  // OTP is transactional — opt-out doesn't apply
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
