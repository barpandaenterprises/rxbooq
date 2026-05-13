/**
 * POST /api/auth/wa-otp/verify
 *
 * Body: { phone: "98765 12342" | "+91...", code: "123456" }
 *
 * 1. Resolves tenant clinic from middleware headers.
 * 2. Loads the most recent non-consumed, non-expired otp_codes row for
 *    (clinic, phone). Increments `attempts`; rejects after 5.
 * 3. Compares the SHA-256 hash; rejects on mismatch.
 * 4. Marks the row consumed.
 * 5. Looks up the patient (must exist; was confirmed at send time).
 * 6. Finds or creates an auth.users row tied to a synthetic email
 *    `phone-{digits}@{OTP_AUTH_EMAIL_SUFFIX}`.
 * 7. Upserts `patient_users` linking the auth user to the patient + clinic.
 *    Replaces any prior row for this auth user — one patient session ↔ one
 *    clinic at a time.
 * 8. Generates a Supabase magic-link via the admin API. The client navigates
 *    to the returned `actionLink`; Supabase verifies it, sets session cookies,
 *    redirects to the `next` URL (defaults to /me/appointments).
 */

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/server";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { useMockData } from "@/lib/feature-flags";

const verifySchema = z.object({
  phone: z.string().trim().min(8, "Enter your phone number"),
  code:  z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  next:  z.string().optional(),
});

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return raw;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function syntheticEmail(phoneE164: string): string {
  const suffix = process.env.OTP_AUTH_EMAIL_SUFFIX || "otp.local";
  const digits = phoneE164.replace(/\D/g, "");
  return `phone-${digits}@${suffix}`;
}

function safeNext(raw: string | undefined): string {
  if (!raw) return "/me/appointments";
  // Only allow internal paths.
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/me/appointments";
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const clinic = await getCurrentClinic();
  if (!clinic) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve the clinic." },
      { status: 400 },
    );
  }

  const phoneE164 = normalizePhone(parsed.data.phone);
  const code      = parsed.data.code;
  const next      = safeNext(parsed.data.next);
  const supabase  = serviceClient();

  // ---- 1. Fetch latest unconsumed OTP row -------------------------------
  const { data: otpRow, error: otpErr } = await supabase
    .from("otp_codes")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("clinic_id",  clinic.id)
    .eq("phone_e164", phoneE164)
    .eq("purpose",    "patient_signin")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr || !otpRow) {
    return NextResponse.json(
      { ok: false, error: "No active code for this phone. Request a new one." },
      { status: 404 },
    );
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "Code expired. Request a new one." },
      { status: 410 },
    );
  }

  if (otpRow.attempts >= 5) {
    // Burn the row so a fresh send is required.
    await supabase.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Request a new code." },
      { status: 429 },
    );
  }

  // ---- 2. Compare -------------------------------------------------------
  if (hashCode(code) !== otpRow.code_hash) {
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRow.attempts + 1 })
      .eq("id", otpRow.id);
    return NextResponse.json(
      { ok: false, error: "Wrong code." },
      { status: 401 },
    );
  }

  // Mark consumed.
  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otpRow.id);

  // ---- 3. Resolve patient ----------------------------------------------
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("clinic_id",  clinic.id)
    .eq("phone_e164", phoneE164)
    .maybeSingle();
  if (!patient) {
    return NextResponse.json(
      { ok: false, error: "Phone is not on file for this clinic." },
      { status: 404 },
    );
  }

  // ---- 4. Find-or-create auth user keyed by synthetic email ------------
  const email = syntheticEmail(phoneE164);

  let authUserId: string | null = null;
  {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (existing) authUserId = existing.id;
  }

  if (!authUserId) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      phone: phoneE164,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: patient.full_name },
    });
    if (createErr || !created?.user) {
      return NextResponse.json(
        { ok: false, error: createErr?.message ?? "Failed to provision auth user." },
        { status: 500 },
      );
    }
    authUserId = created.user.id;
  }

  // ---- 5. Upsert patient_users (replace any prior single-row mapping) --
  // PK is auth_user_id, so delete + insert handles tenant switching.
  await supabase.from("patient_users").delete().eq("auth_user_id", authUserId);
  const { error: linkErr } = await supabase.from("patient_users").insert({
    auth_user_id: authUserId,
    patient_id:   patient.id,
    clinic_id:    clinic.id,
    phone_e164:   phoneE164,
  });
  if (linkErr) {
    return NextResponse.json(
      { ok: false, error: linkErr.message },
      { status: 500 },
    );
  }

  // ---- 6. Mock-mode shortcut --------------------------------------------
  // In mock mode we don't have a real Supabase Auth project to round-trip
  // through. Tell the client to just navigate to `next` directly — the
  // /me/appointments page will fall back to mock data anyway.
  if (useMockData()) {
    return NextResponse.json({ ok: true, mock: true, next });
  }

  // ---- 7. Issue a magic link the browser can navigate to ---------------
  // Supabase verifies the link and sets HTTP-only cookies, then redirects to
  // `redirectTo`. The redirectTo URL must be allow-listed in the Supabase
  // dashboard under Authentication → URL Configuration.
  const origin = req.nextUrl.origin;
  const redirectTo = `${origin}${next}`;

  const { data: link, error: linkGenErr } = await supabase.auth.admin.generateLink({
    type:  "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkGenErr || !link?.properties?.action_link) {
    return NextResponse.json(
      { ok: false, error: linkGenErr?.message ?? "Failed to issue session." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok:         true,
    mock:       false,
    actionLink: link.properties.action_link,
    next,
  });
}
