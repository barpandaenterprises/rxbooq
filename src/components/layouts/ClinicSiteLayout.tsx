import { ClinicSiteHeader } from "@/components/compositions/ClinicSiteHeader";
import { ClinicSiteFooter } from "@/components/compositions/ClinicSiteFooter";

type Props = {
  clinicName:    string;
  clinicSlug:    string;
  isTenantRoot?: boolean;
  children:      React.ReactNode;
};

/**
 * Wrapper for the per-clinic public page. Renders on /d/{slug} AND on the
 * tenant subdomain / custom-domain root (via src/app/page.tsx dispatcher).
 */
export function ClinicSiteLayout({ clinicName, clinicSlug, isTenantRoot, children }: Props) {
  return (
    <div className="bg-white text-body">
      <ClinicSiteHeader clinicName={clinicName} clinicSlug={clinicSlug} isTenantRoot={isTenantRoot} />
      <main>{children}</main>
      <ClinicSiteFooter clinicName={clinicName} />
    </div>
  );
}
