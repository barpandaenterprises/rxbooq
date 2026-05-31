import type { Metadata } from "next";
import { headers } from "next/headers";
import { poppins } from "./fonts";
import { getClinicById } from "@/lib/supabase/clinics";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rxbooq",
    template: "%s | Rxbooq",
  },
  description:
    "Multi-tenant clinic platform: website, online booking, and WhatsApp automation for clinics across India.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Next.js 15+ — headers() is async (continues in Next 16).
  const h = await headers();
  const clinicId = h.get("x-clinic-id");
  const clinic = clinicId ? await getClinicById(clinicId) : null;

  // Per-tenant theme overrides — only the whitelisted CSS variables.
  const themeStyle: React.CSSProperties | undefined = clinic?.theme
    ? ({
        ["--color-brand" as string]: clinic.theme.brand ?? "#0168B3",
        ["--color-link-hover" as string]: clinic.theme.brandDark ?? "#0E5087",
      } as React.CSSProperties)
    : undefined;

  return (
    <html
      lang={clinic?.locale_default ?? "en"}
      className={poppins.variable}
      style={themeStyle}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
          integrity="sha512-1ycn6IcaQQ40/MKBW2W4Rhis/DbILU74C1vSrLJxCq57o941Ym01SwNsOMqvEBFlcgUa6xLiPY/NS5R+E6ztJQ=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="bg-surface text-body font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
