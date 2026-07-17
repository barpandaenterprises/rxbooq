"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { serviceClient } from "@/lib/supabase/server";
import { collectTracking, type LeadSubmission } from "@/lib/data/leads";
import { isIndianMobile, toE164 } from "@/lib/phone";


const submitSchema = z.object({
  name:  z.string().trim().min(1, "Please enter your name").max(120),
  phone: z.string().trim().refine(isIndianMobile, "Enter a valid 10-digit mobile number"),
  // Email is OPTIONAL. Only name + phone are mandatory. Normalise "" / null /
  // undefined to null up front so an empty field never trips validation; a
  // non-empty value must still be a real email.
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().email("Please enter a valid email address").max(200).nullable().optional(),
  ),
  landingPageUrl: z.string().trim().max(2000).optional(),
  referrer:       z.string().trim().max(2000).optional(),
  // Client sends its captured bag; we re-sanitise below rather than trusting it.
  utm:            z.record(z.string(), z.string()).optional(),
});

export type SubmitLeadResult = { ok: true } | { ok: false; error: string };

/** Best-effort client IP from the standard proxy headers. */
async function resolveIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return h.get("x-real-ip") ?? null;
}

/**
 * Re-derive the tracking bag from the landing URL server-side when possible so
 * the stored attribution can't be forged; fall back to the client-sent bag
 * (also sanitised) when the URL has no query string.
 */
function sanitiseTracking(input: LeadSubmission): Record<string, string> {
  if (input.landingPageUrl) {
    try {
      const url = new URL(input.landingPageUrl);
      const fromUrl = collectTracking(url.searchParams);
      if (Object.keys(fromUrl).length > 0) return fromUrl;
    } catch {
      // malformed URL — fall through to the client bag
    }
  }
  if (input.utm) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(input.utm)) params.set(k, v);
    return collectTracking(params);
  }
  return {};
}

export async function submitLeadAction(input: LeadSubmission): Promise<SubmitLeadResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details and try again.",
    };
  }
  const data = parsed.data;

  const utm        = sanitiseTracking(data);
  const ip         = await resolveIp();
  const email      = data.email ?? null;
  // Store a canonical +91XXXXXXXXXX so every lead's phone is uniformly
  // formatted for the console, exports, and any later de-dupe.
  const phone      = toE164(data.phone);

  const supabase = serviceClient();
  const { error } = await supabase.from("leads").insert({
    name:             data.name,
    phone,
    email,
    landing_page_url: data.landingPageUrl ?? null,
    referrer:         data.referrer ?? null,
    ip_address:       ip,
    utm,
  });

  if (error) {
    console.error("[lead-actions] insert failed:", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
