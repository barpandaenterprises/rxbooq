import type { Metadata } from "next";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";

export const metadata: Metadata = {
  title:       "Cookie Policy — Rxbooq",
  description:
    "How Rxbooq uses cookies and similar technologies to operate, secure, and improve the platform.",
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "What Are Cookies",
    body: "Cookies are small text files placed on your device to improve website functionality and user experience.",
  },
  {
    title: "Cookies We Use",
    body: "We use essential cookies for authentication and security, performance cookies for analytics, functional cookies for preferences and, where applicable, marketing cookies.",
  },
  {
    title: "Managing Cookies",
    body: "Most browsers allow you to manage or disable cookies. Disabling certain cookies may affect website functionality.",
  },
  {
    title: "Third-Party Cookies",
    body: "Analytics and embedded third-party services may place cookies subject to their own privacy policies.",
  },
  {
    title: "Updates",
    body: "This Cookie Policy may be updated periodically. Continued use of the website signifies acceptance of the latest version.",
  },
];

export default function CookiePolicyPage() {
  return (
    <PlatformSiteLayout>
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-b from-[#F4F8FB] to-white">
        <div className="mx-auto max-w-[820px] px-5 py-12 md:px-8 md:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">Legal</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-heading md:text-[38px]">
            Cookie Policy
          </h1>
          <p className="mt-3 max-w-[560px] text-[15px] leading-[25px] text-muted">
            How Rxbooq uses cookies and similar technologies to operate, secure, and improve the
            platform.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-[820px] px-5 py-12 md:px-8 md:py-16">
        <div className="space-y-9">
          {SECTIONS.map((s, i) => (
            <div key={s.title} className="border-b border-border pb-9 last:border-0 last:pb-0">
              <h2 className="text-[18px] font-semibold text-heading md:text-[20px]">
                <span className="mr-2 text-brand">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <p className="mt-2.5 text-[15px] leading-[26px] text-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </PlatformSiteLayout>
  );
}
