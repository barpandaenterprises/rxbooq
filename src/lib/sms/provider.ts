/**
 * SMS provider stub. Wire a real provider (MSG91 / Twilio / Gupshup) here
 * later — the surface stays the same so callers don't change.
 *
 * In dev (or whenever SMS_PROVIDER is unset / "console"), the OTP is logged
 * to the server console so the end-to-end onboarding flow is testable
 * without spending on real messages.
 */

export type SendSmsResult = { ok: true } | { ok: false; error: string };

export type SendSmsArgs = {
  to:       string;   // E.164
  body:     string;
  /** Optional template id when the upstream provider requires DLT registration (India). */
  template?: string;
};

export async function sendSms(args: SendSmsArgs): Promise<SendSmsResult> {
  const provider = (process.env.SMS_PROVIDER ?? "console").toLowerCase();

  if (provider === "console") {
    console.log(`[sms:dev] -> ${args.to}\n  ${args.body}`);
    return { ok: true };
  }

  // Real providers slot in here. Keep the dispatch table short — adding a
  // provider should be a 10-line patch, not a new abstraction layer.
  console.error(`[sms] unknown SMS_PROVIDER=${provider}`);
  return { ok: false, error: `SMS provider '${provider}' not implemented` };
}
