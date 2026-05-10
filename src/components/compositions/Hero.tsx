import Image from "next/image";
import Link from "next/link";
import { TEL_HREF } from "@/lib/contact";

const TRUST = [
  { strong: "5.0", sub: "on Justdial", star: true },
  { strong: "74", sub: "verified reviews" },
  { strong: "MDS", sub: "qualified team" },
  { strong: "20+ yrs", sub: "in Sambalpur" },
];

export function Hero() {
  return (
    <section className="bg-surface-muted py-10 pb-12 md:py-20 md:pb-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-16">
          {/* Photo first on mobile, second on desktop (matches mobile mockup) */}
          <div className="relative order-first md:order-last">
            <div className="relative h-72 overflow-hidden rounded-lg bg-[#E6F1FA] shadow-md md:h-[480px]">
              <Image
                src="/images/dr-manoranjan-mahakur.jpg"
                alt="Dr. Manoranjan Mahakur, lead dental surgeon at Mahakur Poly Dental Clinic"
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover object-top"
              />
            </div>
            <div className="absolute -left-2 bottom-4 flex items-center gap-2.5 rounded-[12px] bg-white px-3.5 py-3 shadow-md md:-left-6 md:bottom-8 md:gap-3 md:px-[18px] md:py-3.5">
              <div className="grid h-9 w-9 place-items-center rounded-pill bg-[#E6F1FA] text-[14px] text-brand md:h-10 md:w-10 md:text-[16px]">
                <i className="fas fa-clock" />
              </div>
              <div>
                <div className="text-[11px] text-muted md:text-[12px]">Open today</div>
                <div className="text-[13px] font-semibold text-heading md:text-[14px]">
                  8:00 AM – 8:00 PM
                </div>
              </div>
            </div>
          </div>

          {/* Copy + CTAs */}
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:px-3.5 md:py-1.5 md:text-[13px]">
              <i className="fas fa-shield-alt text-[10px] md:text-[11px]" />
              Mahakur Poly Dental Clinic · Sambalpur
            </span>
            <h1 className="mb-3 text-[32px] font-semibold leading-10 tracking-[-0.01em] text-heading md:mb-4 md:text-h1">
              Trusted dental care in Sambalpur for over 20 years
            </h1>
            <p className="mb-6 max-w-[520px] text-[15px] leading-[24px] text-muted md:mb-8 md:text-paragraph">
              Painless treatment from MDS-qualified specialists. Walk-in friendly,
              child-safe, and now bookable in 30 seconds on WhatsApp.
            </p>

            {/* CTAs — full-width stacked on mobile.
                Primary = the simple Quick-book path (one tap → WhatsApp).
                Secondary = Call.
                Tertiary = the existing 3-step online form for users who want it. */}
            <div className="mb-4 flex flex-col gap-2.5 md:mb-6 md:flex-row md:gap-3">
              <Link
                href="/book/quick"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-6 py-3.5 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843] md:w-auto"
              >
                <i className="fab fa-whatsapp text-[16px]" />
                Book on WhatsApp
              </Link>
              <a
                href={TEL_HREF}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-[22.5px] py-3 text-[15px] font-medium text-link-hover no-underline transition-colors hover:bg-link-hover hover:text-white md:w-auto md:py-[10.5px]"
              >
                <i className="fas fa-phone-alt" />
                Call Clinic
              </a>
            </div>

            {/* "Or fill the online form" — secondary path for digitally-comfortable users */}
            <Link
              href="/book"
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-link-hover no-underline md:mb-8 md:text-[14px]"
            >
              <i className="fas fa-edit text-[10px]" />
              Or fill the 3-step online form
              <i className="fas fa-arrow-right text-[10px]" />
            </Link>

            {/* Trust strip */}
            <div className="grid grid-cols-2 items-start gap-4 border-t border-border pt-4 md:grid-cols-4 md:gap-6 md:pt-6">
              {TRUST.map((t) => (
                <div key={t.sub} className="flex flex-col gap-0.5">
                  <div className="text-[15px] font-semibold text-heading md:text-[16px]">
                    {t.star && <span className="mr-1 text-[#F4B400]">★</span>}
                    {t.strong}
                  </div>
                  <div className="text-[12px] leading-[16px] text-muted md:text-[13px] md:leading-[18px]">
                    {t.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
