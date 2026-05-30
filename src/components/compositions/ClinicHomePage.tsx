import { ClinicSiteLayout } from "@/components/layouts/ClinicSiteLayout";
import { ClinicHero } from "@/components/compositions/ClinicHero";
import { ClinicServicesStrip } from "@/components/compositions/ClinicServicesStrip";
import { ClinicDoctorsSection } from "@/components/compositions/ClinicDoctorsSection";
import { ClinicCtaStrip } from "@/components/compositions/ClinicCtaStrip";
import { ClinicContactPanel } from "@/components/compositions/ClinicContactPanel";
import type { PublicClinicPage } from "@/lib/data/public-clinic-page";

type Props = {
  page:          PublicClinicPage;
  /** True when rendered on the tenant subdomain root; false when on /d/{slug}. */
  isTenantRoot?: boolean;
};

/**
 * Single source of truth for the rich per-clinic public page. Rendered from
 * both /d/[clinicSlug] and the tenant-resolved apex (src/app/page.tsx).
 */
export function ClinicHomePage({ page, isTenantRoot }: Props) {
  const { clinic, doctors, services } = page;
  const bookHref = isTenantRoot ? "/book" : `/book?clinic=${clinic.slug}`;

  return (
    <ClinicSiteLayout
      clinicName={clinic.name}
      clinicSlug={clinic.slug}
      isTenantRoot={isTenantRoot}
    >
      <ClinicHero clinic={clinic} doctors={doctors} bookHref={bookHref} />
      <ClinicServicesStrip services={services} bookHref={bookHref} />
      <ClinicDoctorsSection doctors={doctors} bookHref={bookHref} />
      <ClinicCtaStrip
        clinicName={clinic.name}
        whatsappNumber={clinic.whatsapp_number}
        bookHref={bookHref}
      />
      <ClinicContactPanel clinic={clinic} />
    </ClinicSiteLayout>
  );
}
