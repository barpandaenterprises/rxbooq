/**
 * Clinic contact constants — single source of truth used by the home page,
 * booking layout, and any deep-link helpers.
 *
 * Phone numbers are stored in the format users see (with `+`, spaces) and
 * normalised on the fly for `tel:` and `wa.me` URLs.
 */

export const CLINIC_NAME_FULL = "Mahakur Medical Store & Poly Dental Clinic";
export const CLINIC_NAME_SHORT = "Mahakur Poly Dental";
export const CLINIC_ADDRESS =
  "Bhatra Chowk, Cuttack Road, Dhanupali, Sambalpur, Odisha 768005";

export const CLINIC_PHONE_DISPLAY = "+91 82602 22828";
export const CLINIC_EMAIL = "care@mahakurdental.in";

const DIGITS_ONLY = CLINIC_PHONE_DISPLAY.replace(/\D/g, "");

export const TEL_HREF = `tel:+${DIGITS_ONLY}`;
export const MAILTO_HREF = `mailto:${CLINIC_EMAIL}`;

/**
 * Build a wa.me deep link with optional prefilled text. Number must be in
 * international format with no leading `+`.
 */
export function waLink(text?: string): string {
  const base = `https://wa.me/${DIGITS_ONLY}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

const MAP_QUERY = `${CLINIC_NAME_FULL}, ${CLINIC_ADDRESS}`;

/** Pre-baked Google Maps "search" URL for the clinic — works without an API key. */
export const GOOGLE_MAPS_HREF = `https://www.google.com/maps/search/${encodeURIComponent(MAP_QUERY)}`;

/** Iframe-friendly Google Maps embed URL — no API key required.
 *  Uses the public "search & embed" form: pans/zooms the map to the clinic. */
export const GOOGLE_MAPS_EMBED_HREF = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed&z=15`;
