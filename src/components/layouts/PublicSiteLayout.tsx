import { PublicSiteHeader } from "@/components/compositions/PublicSiteHeader";
import { PublicSiteFooter } from "@/components/compositions/PublicSiteFooter";
import { MobileStickyActionBar } from "@/components/molecules/MobileStickyActionBar";

export function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white pb-20 text-body md:pb-0">
      <PublicSiteHeader />
      <main>{children}</main>
      <PublicSiteFooter />
      <MobileStickyActionBar />
    </div>
  );
}
