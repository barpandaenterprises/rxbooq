import type { Metadata } from "next";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";

export const metadata: Metadata = {
  title:       "Terms & Conditions — Rxbooq",
  description:
    "The terms governing your access to and use of the Rxbooq platform, website, applications, and services.",
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Acceptance",
    body: "By accessing or using Rxbooq, you agree to these Terms and Conditions.",
  },
  {
    title: "Platform Role",
    body: "Rxbooq provides technology services that enable healthcare providers to manage their digital presence and allows patients to discover providers and request appointments. Rxbooq is not a healthcare provider and does not provide medical advice.",
  },
  {
    title: "User Accounts",
    body: "Users must provide accurate information and maintain the confidentiality of their account credentials.",
  },
  {
    title: "Appointments",
    body: "Appointment availability is determined by the healthcare provider. Rxbooq does not guarantee appointment confirmation, diagnosis or treatment outcomes.",
  },
  {
    title: "Payments",
    body: "Subscription fees and appointment payments, where applicable, are subject to the pricing and refund policy published on the platform.",
  },
  {
    title: "Acceptable Use",
    body: "Users shall not misuse the platform, upload unlawful content, attempt unauthorized access or interfere with platform operations.",
  },
  {
    title: "Intellectual Property",
    body: "All platform software, branding and content remain the property of Barpanda Enterprises Private Limited or its licensors unless otherwise stated.",
  },
  {
    title: "Limitation of Liability",
    body: "To the maximum extent permitted by law, Rxbooq shall not be liable for indirect, incidental or consequential damages arising from use of the platform.",
  },
  {
    title: "Termination",
    body: "We may suspend or terminate accounts that violate these Terms or applicable laws.",
  },
  {
    title: "Governing Law",
    body: "These Terms are governed by the laws of India. Courts having jurisdiction over the registered office of Barpanda Enterprises Private Limited shall have jurisdiction unless otherwise required by law.",
  },
  {
    title: "Changes",
    body: "We may modify these Terms at any time by publishing an updated version on the website.",
  },
];

export default function TermsPage() {
  return (
    <PlatformSiteLayout>
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-b from-[#F4F8FB] to-white">
        <div className="mx-auto max-w-[820px] px-5 py-12 md:px-8 md:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">Legal</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-heading md:text-[38px]">
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 max-w-[560px] text-[15px] leading-[25px] text-muted">
            The terms governing your access to and use of the Rxbooq platform, website, applications
            and services.
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
