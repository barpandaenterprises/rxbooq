/**
 * Shared phone-number helpers. Previously duplicated across the onboarding
 * actions and the patient WhatsApp-OTP routes — keep one source of truth.
 *
 * "E.164" here means a leading "+" followed by 7–15 digits (first non-zero).
 * Defaults a bare local/Indian number to +91 since that's the launch market.
 */

/** Strict E.164 check: "+" then a non-zero leading digit, 7–15 digits total. */
export function isE164(s: string): boolean {
  return /^\+[1-9][0-9]{6,14}$/.test(s.trim());
}

/**
 * Best-effort normalize a user-typed number to E.164, defaulting to India.
 *  - "+919876543210"  → "+919876543210"
 *  - "9876543210"     → "+919876543210"
 *  - "919876543210"   → "+919876543210"
 *  - already-"+" with country code → kept (digits only)
 * Returns the original string when it can't be confidently normalized.
 */
export function toE164(raw: string): string {
  const trimmed = raw.trim();
  const digits  = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return trimmed;
}
