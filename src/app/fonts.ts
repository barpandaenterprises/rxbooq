import { Poppins } from "next/font/google";

/**
 * Poppins — self-hosted via next/font/google.
 *
 * Despite the name, next/font/google downloads the font files at BUILD time
 * and serves them from your own server. There is no runtime request to Google
 * from the patient's browser, so this is still DPDP-friendly.
 *
 * If we ever need to switch to fully air-gapped local files, swap this back
 * to `next/font/local` and drop the woff2 files into ./fonts/.
 */
export const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});
