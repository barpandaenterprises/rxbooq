/**
 * Signed cookie that authorises subsequent onboarding-wizard steps after the
 * user has passed the phone-OTP gate. The draft row in clinic_applications
 * has no auth_user_id (drafts are pre-account), so RLS can't gate access —
 * this HMAC is the trust boundary that proves the bearer verified the phone
 * tied to a specific draftId.
 *
 * The actual writes go through the service-role server client. RLS for `anon`
 * on clinic_applications stays deny — the cookie protects the action, not
 * the row.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME    = "onboarding_draft";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches a reasonable drop-off window

export type OnboardingChannel = "phone" | "email";

export type DraftClaim = {
  draftId:  string;
  /** The channel + verified contact (phone E.164 or email) that owns this draft. */
  channel:  OnboardingChannel;
  contact:  string;
  issuedAt: number;
};

function getSecret(): string {
  const s = process.env.ONBOARDING_DRAFT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ONBOARDING_DRAFT_SECRET must be set to a 32+ char random string");
  }
  return s;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signDraftCookie(claim: DraftClaim): string {
  const payload   = base64url(Buffer.from(JSON.stringify(claim), "utf8"));
  const signature = base64url(createHmac("sha256", getSecret()).update(payload).digest());
  return `${payload}.${signature}`;
}

export function verifyDraftCookie(value: string | undefined): DraftClaim | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot === -1) return null;

  const payload = value.slice(0, dot);
  const sig     = value.slice(dot + 1);

  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  const provided = fromBase64url(sig);

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const raw = JSON.parse(fromBase64url(payload).toString("utf8")) as
      Partial<DraftClaim> & { phone?: string };
    if (typeof raw.draftId !== "string") return null;
    if (typeof raw.issuedAt !== "number") return null;
    if (Date.now() - raw.issuedAt > COOKIE_MAX_AGE * 1000) return null;

    // Back-compat: legacy cookies carried only { draftId, phone } — map to the
    // generalized phone channel so in-flight drafts keep working.
    if (typeof raw.contact === "string" && (raw.channel === "phone" || raw.channel === "email")) {
      return { draftId: raw.draftId, channel: raw.channel, contact: raw.contact, issuedAt: raw.issuedAt };
    }
    if (typeof raw.phone === "string") {
      return { draftId: raw.draftId, channel: "phone", contact: raw.phone, issuedAt: raw.issuedAt };
    }
    return null;
  } catch {
    return null;
  }
}
