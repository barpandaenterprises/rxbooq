import { PlatformSiteHeader } from "@/components/compositions/PlatformSiteHeader";
import { PlatformSiteFooter } from "@/components/compositions/PlatformSiteFooter";

/**
 * Apex marketing wrapper. Renders on doctorkart.in (when no tenant is
 * resolved) and on /pricing. No mobile sticky CTA bar — the platform isn't a
 * booking surface, it's a SaaS pitch.
 */
export function PlatformSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-body">
      <PlatformSiteHeader />
      <main>{children}</main>
      <PlatformSiteFooter />
    </div>
  );
}
