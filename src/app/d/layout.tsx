import { Gtm } from "@/components/analytics/Gtm";

export default function ClinicSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Gtm />
      {children}
    </>
  );
}
