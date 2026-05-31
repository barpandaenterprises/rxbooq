import type { Metadata } from "next";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { loadClinicForPublicPage } from "@/lib/data/public-clinic-page";
import { ClinicHomePage } from "@/components/compositions/ClinicHomePage";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";
import { PlatformHero } from "@/components/compositions/PlatformHero";
import { PlatformFeatureGrid } from "@/components/compositions/PlatformFeatureGrid";
import { PlatformHowItWorks } from "@/components/compositions/PlatformHowItWorks";
import { PlatformPlansTeaser } from "@/components/compositions/PlatformPlansTeaser";
import { FeaturedClinics } from "@/components/compositions/FeaturedClinics";
import { PlatformTestimonials } from "@/components/compositions/PlatformTestimonials";
import { PlatformCtaStrip } from "@/components/compositions/PlatformCtaStrip";

/**
 * Apex + tenant dispatcher.
 *   - Apex (no tenant resolved): platform marketing site.
 *   - Tenant (subdomain / custom domain): the rich per-clinic page,
 *     same component used at /d/{slug}.
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

export default async function Home() {
  // Tenant resolution comes from middleware-set headers. On the bare apex this
  // returns null and we render the platform marketing site.
  const tenant = await getCurrentClinic();

  if (tenant) {
    const page = await loadClinicForPublicPage({ id: tenant.id });
    if (page) {
      return <ClinicHomePage page={page} isTenantRoot />;
    }
    // Fall through to platform marketing if the tenant row is present but the
    // public-page join (clinic_applications status='active') hasn't landed
    // yet. Rare, but possible right after activation in dev.
  }

  return (
    <PlatformSiteLayout>
      <PlatformHero />
      <PlatformFeatureGrid />
      <PlatformHowItWorks />
      <PlatformPlansTeaser />
      <FeaturedClinics />
      <PlatformTestimonials />
      <PlatformCtaStrip />
    </PlatformSiteLayout>
  );
}
