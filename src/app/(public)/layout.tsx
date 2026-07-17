import { Gtm } from "@/components/analytics/Gtm";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Gtm />
      {children}
    </>
  );
}
