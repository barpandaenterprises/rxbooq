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
 * Strict validity check for an Indian mobile number, tolerant of how people
 * actually type them (spaces, dashes, +91 / 91 / 0 prefixes).
 *
 * Rule: after stripping non-digits and any country/trunk prefix, the number is
 * exactly 10 digits and starts 6–9 (the valid Indian mobile range). Landlines
 * and short codes are intentionally rejected — this gates the lead form.
 */
export function isIndianMobile(raw: string): boolean {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
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
  let   digits  = trimmed.replace(/\D/g, "");
  // Drop a domestic trunk "0" prefix (e.g. "098765…") so it maps to +91.
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return trimmed;
}
