import { GoogleTagManager } from "@next/third-parties/google";

/**
 * Google Tag Manager container for Rxbooq's public surfaces only
 * (marketing pages, login, and clinic microsites) — deliberately kept
 * out of the authenticated app areas.
 */
export const GTM_ID = "GTM-TXB6CK89";

export function Gtm() {
  return (
    <>
      <GoogleTagManager gtmId={GTM_ID} />
      {/* Google Tag Manager (noscript) — @next/third-parties only emits the
          <script> tags, so the no-JS fallback iframe is added here. */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
