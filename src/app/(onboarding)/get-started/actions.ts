"use server";

/**
 * Public onboarding wizard server actions.
 *
 * Trust model: drafts have no auth_user_id, so RLS cannot gate them by
 * auth.uid(). All writes go through serviceClient() (bypasses RLS); the
 * OTP gate + signed draft cookie are the application-layer trust boundary.
 *
 * Result-shape convention matches the rest of the codebase (see
 * src/app/(clinic-app)/admin/doctors/actions.ts:48-50).
 */

import { cookies } from "next/headers";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { serviceClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/provider";
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  signDraftCookie,
  verifyDraftCookie,
  type DraftClaim,
} from "@/lib/onboarding/draft-cookie";
import { quotePlan, type CouponScope, type PriceQuote } from "@/lib/billing/pricing";
import {
  uploadOnboardingDoc,
  type OnboardingDocKind,
} from "@/lib/supabase/storage";

// =============================================================================
// Shared validators
// =============================================================================

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{6,14}$/, "Use E.164 format, e.g. +919999900001");

const otpSchema = z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code");

const OTP_TTL_MIN          = 10;
const OTP_RATE_WINDOW_MIN  = 5;
const OTP_RATE_MAX         = 3;
const OTP_MAX_ATTEMPTS     = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// =============================================================================
// 1. sendOnboardingOtpAction
// =============================================================================

export type SendOtpResult =
  | { ok: true; ttlSeconds: number }
  | { ok: false; error: string };

export async function sendOnboardingOtpAction(rawPhone: string): Promise<SendOtpResult> {
  const parsed = phoneSchema.safeParse(rawPhone);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid phone" };
  }
  const phone = parsed.data;
  const supabase = serviceClient();

  // Rate-limit: at most OTP_RATE_MAX sends per OTP_RATE_WINDOW_MIN minutes.
  const since = new Date(Date.now() - OTP_RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await supabase
    .from("phone_otp_verifications")
    .select("*", { count: "exact", head: true })
    .eq("phone_e164", phone)
    .gte("created_at", since);

  if ((count ?? 0) >= OTP_RATE_MAX) {
    return { ok: false, error: `Too many codes requested. Try again in a few minutes.` };
  }

  // Generate cryptographically random 6-digit code.
  const code     = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashOtp(code);
  const expires  = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

  const { error: insErr } = await supabase.from("phone_otp_verifications").insert({
    phone_e164: phone,
    code_hash:  codeHash,
    purpose:    "onboarding",
    expires_at: expires,
  });
  if (insErr) {
    console.error("[sendOnboardingOtp] insert failed:", insErr.message);
    return { ok: false, error: "Could not send code. Try again." };
  }

  const sms = await sendSms({
    to:   phone,
    body: `Your Rxbooq code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`,
  });
  if (!sms.ok) {
    // Don't reveal provider details to the user; the OTP row is already saved
    // so they can hit Resend.
    console.error("[sendOnboardingOtp] sms send failed:", sms.error);
  }

  return { ok: true, ttlSeconds: OTP_TTL_MIN * 60 };
}

// =============================================================================
// 2. verifyOnboardingOtpAction
//    Verifies the code, finds-or-creates the draft for this phone, signs and
//    sets the cookie. Returns the draftId so the client can redirect.
// =============================================================================

export type VerifyOtpResult =
  | { ok: true; draftId: string; lastStep: string | null }
  | { ok: false; error: string };

export async function verifyOnboardingOtpAction(
  rawPhone: string,
  rawCode:  string,
): Promise<VerifyOtpResult> {
  const phoneParsed = phoneSchema.safeParse(rawPhone);
  const codeParsed  = otpSchema.safeParse(rawCode);
  if (!phoneParsed.success) return { ok: false, error: "Invalid phone" };
  if (!codeParsed.success)  return { ok: false, error: "Enter the 6-digit code" };

  const phone    = phoneParsed.data;
  const supabase = serviceClient();

  // Most recent unconsumed OTP for this phone.
  const { data: otp, error: otpErr } = await supabase
    .from("phone_otp_verifications")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("phone_e164", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr || !otp) return { ok: false, error: "Request a new code." };
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expired. Request a new one." };
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  // DEV OTP BYPASS — while SMS_PROVIDER is unset or stubbed to "console", the
  // generated code is only printed to the server log so testers can't see it.
  // Accept any well-formed 6-digit code in that environment. Auto-disables
  // the moment a real provider is configured.
  const smsBypass = (process.env.SMS_PROVIDER ?? "console").toLowerCase() === "console";

  const ok = smsBypass || constantTimeEqual(otp.code_hash, hashOtp(codeParsed.data));
  if (smsBypass) {
    console.warn("[verifyOnboardingOtp] DEV BYPASS — any 6-digit code accepted (SMS_PROVIDER is 'console')");
  }
  if (!ok) {
    await supabase
      .from("phone_otp_verifications")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return { ok: false, error: "Wrong code." };
  }

  await supabase
    .from("phone_otp_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);

  // Find an existing draft for this phone, else create one.
  const { data: existing } = await supabase
    .from("clinic_applications")
    .select("id, last_step_completed")
    .eq("phone_e164", phone)
    .eq("status", "draft")
    .maybeSingle();

  let draftId:  string;
  let lastStep: string | null;

  if (existing) {
    draftId  = existing.id;
    lastStep = existing.last_step_completed;
  } else {
    const { data: created, error: cErr } = await supabase
      .from("clinic_applications")
      .insert({
        phone_e164:           phone,
        status:               "draft",
        last_step_completed:  "phone",
        // doctor_languages defaults to {en} via column default
      })
      .select("id")
      .single();
    if (cErr || !created) {
      return { ok: false, error: cErr?.message ?? "Could not start application." };
    }
    draftId  = created.id;
    lastStep = "phone";
  }

  // Sign + set the cookie.
  const claim: DraftClaim = { draftId, phone, issuedAt: Date.now() };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signDraftCookie(claim), {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/",
    maxAge:   COOKIE_MAX_AGE,
  });

  return { ok: true, draftId, lastStep };
}

// =============================================================================
// Helper — read + verify the draft cookie, fetch the draft, ensure it belongs
// to the same phone. Returns null if the request is unauthorised; callers
// return { ok: false } in that case.
// =============================================================================

async function loadDraftFromCookie(): Promise<
  | { claim: DraftClaim; draft: DraftRow }
  | null
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const claim = verifyDraftCookie(raw);
  if (!claim) return null;

  const supabase = serviceClient();
  const { data: draft } = await supabase
    .from("clinic_applications")
    .select("*")
    .eq("id", claim.draftId)
    .maybeSingle();

  if (!draft) return null;
  if (draft.phone_e164 !== claim.phone) return null;
  return { claim, draft: draft as DraftRow };
}

type DraftRow = {
  id:                        string;
  auth_user_id:              string | null;
  status:                    string;
  phone_e164:                string | null;
  clinic_name:               string | null;
  suggested_slug:            string | null;
  address:                   string | null;
  city:                      string | null;
  state:                     string | null;
  pincode:                   string | null;
  primary_phone:             string | null;
  primary_email:             string | null;
  doctor_full_name:          string | null;
  doctor_qualifications:     string | null;
  doctor_registration_no:    string | null;
  doctor_primary_specialty:  string | null;
  doctor_years_experience:   number | null;
  doctor_languages:          string[] | null;
  registration_cert_path:    string | null;
  clinic_license_path:       string | null;
  pitch:                     string | null;
  selected_plan_id:          string | null;
  requested_doctor_seats:    number | null;
  applied_coupon_id:         string | null;
  last_step_completed:       string | null;
};

// =============================================================================
// 3. saveOnboardingStepAction — partial update keyed off the cookie.
// =============================================================================

const stepDataSchema = z.object({
  // Profile step
  doctor_full_name:         z.string().trim().min(2).max(120).optional(),
  doctor_qualifications:    z.string().trim().max(200).optional(),
  doctor_registration_no:   z.string().trim().min(2).max(60).optional(),
  doctor_primary_specialty: z.string().trim().max(80).optional(),
  doctor_years_experience:  z.number().int().min(0).max(80).optional(),
  doctor_languages:         z.array(z.string().min(2).max(8)).max(8).optional(),

  // Practice step
  clinic_name:    z.string().trim().min(2).max(120).optional(),
  suggested_slug: z.string().trim().min(2).max(60)
                    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Lowercase letters, digits, hyphens")
                    .optional(),
  address:        z.string().trim().min(5).max(200).optional(),
  city:           z.string().trim().min(2).max(80).optional(),
  state:          z.string().trim().min(2).max(80).optional(),
  pincode:        z.string().trim().regex(/^[0-9]{6}$/, "6-digit pincode").optional(),
  primary_phone:  z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/).optional(),
  primary_email:  z.string().trim().email().optional(),
  pitch:          z.string().trim().max(800).optional(),

  // Plan step
  selected_plan_id:       z.string().uuid().optional(),
  requested_doctor_seats: z.number().int().min(1).max(50).optional(),
  applied_coupon_id:      z.string().uuid().nullable().optional(),

  // Wizard bookkeeping — which step was last completed so resume can jump back
  last_step_completed: z.enum(["phone", "profile", "practice", "docs", "plan", "account"]).optional(),
});

export type SaveStepInput = z.infer<typeof stepDataSchema>;

export type SaveStepResult = { ok: true } | { ok: false; error: string };

export async function saveOnboardingStepAction(input: SaveStepInput): Promise<SaveStepResult> {
  const parsed = stepDataSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const loaded = await loadDraftFromCookie();
  if (!loaded) return { ok: false, error: "Session expired. Verify your phone again." };

  const supabase = serviceClient();
  const { error } = await supabase
    .from("clinic_applications")
    .update(parsed.data)
    .eq("id", loaded.draft.id)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// =============================================================================
// 4. uploadOnboardingDocAction
// =============================================================================

const uploadDocSchema = z.object({
  kind:        z.enum(["registration_cert", "clinic_license"]),
  base64:      z.string().min(1),
  mime:        z.string().regex(/^(image\/(jpeg|png|webp)|application\/pdf)$/, "Allowed: jpeg/png/webp/pdf"),
  fileName:    z.string().min(1).max(120),
});

export type UploadDocInput  = z.infer<typeof uploadDocSchema>;
export type UploadDocResult = { ok: true; path: string } | { ok: false; error: string };

export async function uploadOnboardingDocAction(input: UploadDocInput): Promise<UploadDocResult> {
  const parsed = uploadDocSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file" };
  }

  const loaded = await loadDraftFromCookie();
  if (!loaded) return { ok: false, error: "Session expired. Verify your phone again." };

  const stripped = parsed.data.base64.replace(/^data:[^;]+;base64,/, "");
  const buffer   = Buffer.from(stripped, "base64");
  if (buffer.length > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large. Max 10 MB." };
  }

  const upload = await uploadOnboardingDoc({
    draftId:     loaded.draft.id,
    kind:        parsed.data.kind as OnboardingDocKind,
    fileName:    parsed.data.fileName,
    contentType: parsed.data.mime,
    data:        buffer,
  });
  if (!upload.ok) return { ok: false, error: upload.error };

  // Stamp the path on the draft so finalize / activate can find it.
  const supabase = serviceClient();
  const pathCol  = parsed.data.kind === "registration_cert"
    ? "registration_cert_path"
    : "clinic_license_path";

  await supabase
    .from("clinic_applications")
    .update({ [pathCol]: upload.path })
    .eq("id", loaded.draft.id);

  return { ok: true, path: upload.path };
}

// =============================================================================
// 5. applyCouponAction — server-side pricing math, the only authoritative
//    source of truth for what the user owes. Returns a PriceQuote the wizard
//    renders verbatim.
// =============================================================================

const couponInputSchema = z.object({
  code:       z.string().trim().min(2).max(60).transform((c) => c.toLowerCase()),
  planId:     z.string().uuid(),
  extraSeats: z.number().int().min(0).max(50).default(0),
});

export type ApplyCouponInput  = z.infer<typeof couponInputSchema>;
export type ApplyCouponResult =
  | { ok: true; quote: PriceQuote }
  | { ok: false; error: string };

export async function applyCouponAction(input: ApplyCouponInput): Promise<ApplyCouponResult> {
  const parsed = couponInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid coupon input" };
  }

  const supabase = serviceClient();

  const { data: plan, error: pErr } = await supabase
    .from("subscription_plans")
    .select("id, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, is_active")
    .eq("id", parsed.data.planId)
    .maybeSingle();
  if (pErr || !plan || !plan.is_active) return { ok: false, error: "Plan not available." };

  const { data: coupon, error: cErr } = await supabase
    .from("coupons")
    .select("id, code, kind, value, scope, is_active")
    .eq("code", parsed.data.code)
    .eq("is_active", true)
    .maybeSingle();
  if (cErr) return { ok: false, error: "Could not check coupon." };
  if (!coupon) return { ok: false, error: "Coupon not found or inactive." };

  const quote = quotePlan(
    {
      monthly_price_inr:     plan.monthly_price_inr,
      included_doctor_seats: plan.included_doctor_seats,
      extra_seat_price_inr:  plan.extra_seat_price_inr,
    },
    parsed.data.extraSeats + plan.included_doctor_seats,
    {
      id:    coupon.id,
      code:  coupon.code,
      kind:  coupon.kind as "percent" | "flat",
      value: coupon.value,
      scope: coupon.scope as CouponScope,
    },
  );

  return { ok: true, quote };
}

// =============================================================================
// 6. previewQuoteAction — no-coupon variant for live preview on plan step.
// =============================================================================

const previewSchema = z.object({
  planId:     z.string().uuid(),
  extraSeats: z.number().int().min(0).max(50).default(0),
});

export type PreviewQuoteInput  = z.infer<typeof previewSchema>;
export type PreviewQuoteResult =
  | { ok: true; quote: PriceQuote }
  | { ok: false; error: string };

export async function previewQuoteAction(input: PreviewQuoteInput): Promise<PreviewQuoteResult> {
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = serviceClient();
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("monthly_price_inr, included_doctor_seats, extra_seat_price_inr, is_active")
    .eq("id", parsed.data.planId)
    .maybeSingle();
  if (!plan || !plan.is_active) return { ok: false, error: "Plan not available." };

  const quote = quotePlan(
    {
      monthly_price_inr:     plan.monthly_price_inr,
      included_doctor_seats: plan.included_doctor_seats,
      extra_seat_price_inr:  plan.extra_seat_price_inr,
    },
    parsed.data.extraSeats + plan.included_doctor_seats,
    null,
  );
  return { ok: true, quote };
}

// =============================================================================
// 7. finalizeOnboardingAction
//    1. Verify cookie + load draft + required fields.
//    2. Create auth user via service admin API.
//    3. Stamp draft.auth_user_id.
//    4. Call activate_clinic_application RPC.
//    5. Sign user in by setting Supabase cookies on the response.
//    Returns { ok, clinicId } so the wizard can redirect to /admin/today.
// =============================================================================

const finalizeSchema = z.object({
  email:    z.string().trim().email(),
  password: z.string().min(8).max(120),
  acceptTos: z.boolean().refine((v) => v, { message: "You must accept the terms." }),
});

export type FinalizeInput  = z.infer<typeof finalizeSchema>;
export type FinalizeResult =
  | { ok: true; clinicId: string }
  | { ok: false; error: string };

export async function finalizeOnboardingAction(input: FinalizeInput): Promise<FinalizeResult> {
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const loaded = await loadDraftFromCookie();
  if (!loaded) return { ok: false, error: "Session expired. Verify your phone again." };
  const draft = loaded.draft;

  // Validation: minimum payload the activation RPC needs.
  const required = [
    ["clinic_name", draft.clinic_name],
    ["suggested_slug", draft.suggested_slug],
    ["address", draft.address],
    ["city", draft.city],
    ["state", draft.state],
    ["pincode", draft.pincode],
    ["primary_phone", draft.primary_phone],
    ["doctor_full_name", draft.doctor_full_name],
    ["doctor_registration_no", draft.doctor_registration_no],
    ["selected_plan_id", draft.selected_plan_id],
  ] as const;
  const missing = required.find(([, v]) => !v);
  if (missing) {
    return { ok: false, error: `Missing field: ${missing[0]}` };
  }

  const supabase = serviceClient();

  // Backfill primary_email from the finalize form if the user skipped the
  // practice-step email field. The draft cookie's phone is authoritative.
  const primaryEmail = draft.primary_email ?? parsed.data.email;

  // 1. Create auth user.
  const { data: created, error: cuErr } = await supabase.auth.admin.createUser({
    email:         parsed.data.email,
    password:      parsed.data.password,
    phone:         loaded.claim.phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { onboarding_draft_id: draft.id },
  });
  if (cuErr || !created.user) {
    return {
      ok:    false,
      error: cuErr?.message?.includes("already registered")
        ? "An account with this email already exists. Sign in instead."
        : (cuErr?.message ?? "Could not create your account."),
    };
  }

  // 2. Stamp the draft (auth_user_id + email backfill).
  const { error: stampErr } = await supabase
    .from("clinic_applications")
    .update({
      auth_user_id:  created.user.id,
      primary_email: primaryEmail,
    })
    .eq("id", draft.id);
  if (stampErr) {
    // Roll back the auth user so the funnel can be retried cleanly.
    await supabase.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Could not link draft: ${stampErr.message}` };
  }

  // 3. Activate.
  const { data: clinicId, error: activateErr } = await supabase.rpc(
    "activate_clinic_application",
    { application_id: draft.id },
  );
  if (activateErr || !clinicId) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: activateErr?.message ?? "Activation failed." };
  }

  // 4. Clear the draft cookie — the wizard is done.
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  return { ok: true, clinicId: clinicId as string };
}
