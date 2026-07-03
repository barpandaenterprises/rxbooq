import type { Metadata } from "next";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";

export const metadata: Metadata = {
  title:       "Contact Us — Rxbooq",
  description:
    "Get in touch with the Rxbooq team. Office address, phone number, and location in Bengaluru, Karnataka.",
};

const ADDRESS =
  "4th Floor, Palm Height, 5th Cross Rd, Vijaya Bank Colony, Banaswadi, Bengaluru, Karnataka 560043";
const PHONE_DISPLAY = "+91 86603 94376";
const PHONE_TEL = "+918660394376";
const MAPS_SHARE = "https://share.google/zNm5zW86YvAeAhCzX";
const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

export default function ContactPage() {
  return (
    <PlatformSiteLayout>
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-b from-[#F4F8FB] to-white">
        <div className="mx-auto max-w-[1000px] px-5 py-12 md:px-8 md:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">Get in touch</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-heading md:text-[38px]">
            Contact Us
          </h1>
          <p className="mt-3 max-w-[560px] text-[15px] leading-[25px] text-muted">
            Have a question about Rxbooq or need help getting set up? Reach out — we&apos;re happy to
            help.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-[1000px] px-5 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.15fr] md:gap-8">
          {/* Details */}
          <div className="space-y-4">
            <ContactCard icon="fa-location-dot" label="Office address">
              <p className="text-[15px] leading-[24px] text-body">{ADDRESS}</p>
            </ContactCard>

            <ContactCard icon="fa-phone" label="Phone">
              <a
                href={`tel:${PHONE_TEL}`}
                className="text-[15px] font-medium text-link-hover no-underline hover:underline"
              >
                {PHONE_DISPLAY}
              </a>
            </ContactCard>

            <ContactCard icon="fa-map" label="Location">
              <a
                href={MAPS_SHARE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[15px] font-medium text-link-hover no-underline hover:underline"
              >
                Open in Google Maps
                <i className="fas fa-arrow-up-right-from-square text-[11px]" />
              </a>
            </ContactCard>
          </div>

          {/* Map */}
          <div className="overflow-hidden rounded-xl border border-border shadow-[0_8px_24px_-12px_rgba(16,24,40,0.16)]">
            <iframe
              title="Rxbooq office location"
              src={MAPS_EMBED}
              className="h-[320px] w-full md:h-full md:min-h-[380px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </PlatformSiteLayout>
  );
}

function ContactCard({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-white p-5 md:p-6">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[17px] text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}
