import type { Metadata } from "next";
import Link from "next/link";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";

export const metadata: Metadata = {
  title:       "Privacy Policy — Rxbooq",
  description:
    "How Rxbooq collects, uses, stores, discloses, and protects personal information across our website, applications, and services.",
};

const EFFECTIVE_DATE = "30 June 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Introduction",
    body: "Rxbooq is a healthcare technology platform operated by Barpanda Enterprises Private Limited. This Privacy Policy explains how we collect, use, store, disclose and protect personal information when you use our website, applications and services.",
  },
  {
    title: "Information We Collect",
    body: "We may collect account information, contact details, appointment information, profile information provided by healthcare providers, payment-related information processed through authorized payment partners, device information, usage analytics, cookies and communications with our support team. Where applicable, limited health-related information may be processed solely to facilitate appointments and healthcare services.",
  },
  {
    title: "How We Use Information",
    body: "We use information to provide and improve our services, manage appointments, verify accounts, communicate with users, process payments, provide customer support, maintain security, comply with legal obligations and send service-related notifications. Marketing communications are sent only where permitted or consented to.",
  },
  {
    title: "Sharing of Information",
    body: "We may share information with healthcare providers involved in an appointment, trusted service providers, payment processors, cloud hosting providers, analytics providers and government authorities when required by law. We do not sell personal information.",
  },
  {
    title: "Data Security",
    body: "We implement reasonable administrative, technical and organizational safeguards to protect information from unauthorized access, alteration, disclosure or destruction.",
  },
  {
    title: "Data Retention",
    body: "Information is retained only for as long as necessary to provide services, comply with legal obligations and resolve disputes.",
  },
  {
    title: "User Rights",
    body: "Users may request access, correction or deletion of personal information, subject to applicable laws and operational requirements.",
  },
  {
    title: "Cookies",
    body: (
      <>
        Our use of cookies is described in the{" "}
        <Link href="/cookie-policy" className="text-link-hover underline hover:no-underline">
          Cookie Policy
        </Link>
        .
      </>
    ),
  },
  {
    title: "Changes",
    body: "We may update this Privacy Policy from time to time. Continued use of the platform constitutes acceptance of the revised policy.",
  },
  {
    title: "Contact",
    body: (
      <>
        Privacy queries may be directed to the Grievance Officer at the contact details published on
        the{" "}
        <Link href="/contact" className="text-link-hover underline hover:no-underline">
          Contact Us
        </Link>{" "}
        page.
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PlatformSiteLayout>
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-b from-[#F4F8FB] to-white">
        <div className="mx-auto max-w-[820px] px-5 py-12 md:px-8 md:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">Legal</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-heading md:text-[38px]">
            Privacy Policy
          </h1>
          <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-white px-3.5 py-1.5 text-[13px] text-muted ring-1 ring-border">
            <i className="fas fa-calendar-day text-[11px] text-brand" />
            Effective date: <span className="font-medium text-heading">{EFFECTIVE_DATE}</span>
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
