import type { Metadata } from "next";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";
import { PlatformHero } from "@/components/compositions/PlatformHero";
import { PlatformFeatureGrid } from "@/components/compositions/PlatformFeatureGrid";
import { PlatformHowItWorks } from "@/components/compositions/PlatformHowItWorks";
import { PlatformPlansTeaser } from "@/components/compositions/PlatformPlansTeaser";
import { PlatformTestimonials } from "@/components/compositions/PlatformTestimonials";
import { PlatformCtaStrip } from "@/components/compositions/PlatformCtaStrip";

/**
 * Apex root — platform marketing site only.
 *
 * Tenant rendering used to live here too (we dispatched based on a tenant
 * header). After the URL-driven multi-clinic refactor, tenant context lives
 * exclusively at /[clinicSlug]/page.tsx, reached via either:
 *   - Direct apex URL: rxbooq.com/panda  (matches the dynamic segment)
 *   - Subdomain rewrite: panda.rxbooq.com/  → middleware rewrites to /panda/
 *
 * So this page no longer needs the tenant branch.
 */

export const metadata: Metadata = {
  title:       "Rxbooq — modern clinic software for India",
  description: "Public profile, online booking, EMR, and WhatsApp engagement for clinics. Start free in 5 minutes.",
  openGraph: {
    title:       "Rxbooq — modern clinic software for India",
    description: "Public profile, online booking, EMR, and WhatsApp engagement for clinics. Start free.",
    type:        "website",
  },
};

export default function Home() {
  return (
    <PlatformSiteLayout>
      <PlatformHero />
      <PlatformFeatureGrid />
      <PlatformHowItWorks />
      <PlatformPlansTeaser />
      <PlatformTestimonials />
      <PlatformCtaStrip />
    </PlatformSiteLayout>
  );
}
