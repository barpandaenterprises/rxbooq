/**
 * Lead-capture domain layer.
 *
 * One place that defines the shape of a marketing lead, how tracking params are
 * extracted from a landing URL, and how a stored row is presented. The design
 * goal is scalability: identity fields are fixed columns, but every marketing /
 * attribution param flows through the `utm` bag, so adding a new tracked
 * parameter is a one-line change here (or nothing at all — see collectTracking).
 */

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "archived";

/** A lead row as stored in / read back from the `leads` table. */
export type Lead = {
  id:               string;
  name:             string;
  phone:            string;
  email:            string | null;
  landing_page_url: string | null;
  referrer:         string | null;
  ip_address:       string | null;
  utm:              Record<string, string>;
  meta:             Record<string, unknown>;
  status:           LeadStatus;
  created_at:       string;
  updated_at:       string;
};

/**
 * The visitor-supplied part of a submission (the three form fields) plus the
 * client-captured request context. Server-only context (IP) is added in the
 * action from request headers.
 */
export type LeadSubmission = {
  name:            string;
  phone:           string;
  email?:          string | null;
  landingPageUrl?: string | null;
  referrer?:       string | null;
  /** Raw tracking bag captured on the client from the landing URL. */
  utm?:            Record<string, string>;
};

/**
 * Tracking params we recognise explicitly. This list is only used to give the
 * detail view friendly labels and a stable ordering — collectTracking() below
 * still captures ANYTHING that looks like a campaign param, so an unknown key
 * added by marketing tomorrow is stored without a code change.
 */
export const KNOWN_TRACKING_KEYS: Array<{ key: string; label: string }> = [
  { key: "utm_source",   label: "Source" },
  { key: "utm_medium",   label: "Medium" },
  { key: "utm_campaign", label: "Campaign" },
  { key: "utm_term",     label: "Term" },
  { key: "utm_content",  label: "Content" },
  { key: "campaign_id",  label: "Campaign ID" },
  { key: "gclid",        label: "Google Click ID" },
  { key: "fbclid",       label: "Facebook Click ID" },
  { key: "msclkid",      label: "Microsoft Click ID" },
  { key: "ref",          label: "Ref" },
];

/** Extra keys (beyond utm_*) that are click/attribution params worth capturing. */
const EXTRA_TRACKING_KEYS = new Set(
  KNOWN_TRACKING_KEYS.filter((k) => !k.key.startsWith("utm_")).map((k) => k.key),
);

/**
 * Pull every tracking parameter out of a URLSearchParams-like source.
 *
 * Rule: keep anything prefixed `utm_`, any known click-id, plus `campaign_id`.
 * This is deliberately permissive so new UTM-style params are captured with no
 * code change — the scalability requirement. Values are trimmed and empty ones
 * dropped so the stored bag stays clean.
 */
export function collectTracking(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, rawVal] of params.entries()) {
    const key = rawKey.toLowerCase();
    const isTracking = key.startsWith("utm_") || EXTRA_TRACKING_KEYS.has(key);
    if (!isTracking) continue;
    const val = rawVal.trim();
    if (val) out[key] = val.slice(0, 500); // guard against absurdly long values
  }
  return out;
}

/**
 * Human-readable one-line summary of a lead's UTM bag for table cells.
 * e.g. "google · cpc · summer_launch". Falls back to "Direct" when empty.
 */
export function summarizeUtm(utm: Record<string, string>): string {
  const parts = [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  const keys = Object.keys(utm);
  if (keys.length > 0) return keys.map((k) => `${k}=${utm[k]}`).join(" · ");
  return "Direct";
}

/** Ordered entries for the detail view: known keys first (labelled), then the rest. */
export function orderedTrackingEntries(
  utm: Record<string, string>,
): Array<{ key: string; label: string; value: string }> {
  const seen = new Set<string>();
  const rows: Array<{ key: string; label: string; value: string }> = [];
  for (const { key, label } of KNOWN_TRACKING_KEYS) {
    if (utm[key]) {
      rows.push({ key, label, value: utm[key] });
      seen.add(key);
    }
  }
  for (const [key, value] of Object.entries(utm)) {
    if (seen.has(key)) continue;
    rows.push({ key, label: key, value });
  }
  return rows;
}
