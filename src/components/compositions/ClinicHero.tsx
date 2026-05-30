import Link from "next/link";
import type { PublicClinic, PublicDoctor } from "@/lib/data/public-clinic-page";

type Props = {
  clinic:      PublicClinic;
  doctors:     PublicDoctor[];
  bookHref:    string;
};

export function ClinicHero({ clinic, doctors, bookHref }: Props) {
  const verified = clinic.verification_status === "verified";
  const founding = doctors[0] ?? null;
  const trust = [
    founding?.years_experience != null && {
      strong: `${founding.years_experience}+ yrs`,
      sub:    "experience",
    },
    doctors.length > 0 && {
      strong: String(doctors.length),
      sub:    `doctor${doctors.length === 1 ? "" : "s"}`,
    },
    clinic.city && {
      strong: clinic.city,
      sub:    clinic.state ?? "",
    },
    verified && { strong: "Verified", sub: "by DoctorKart", check: true },
  ].filter(Boolean) as Array<{ strong: string; sub: string; check?: boolean }>;

  return (
    <section className="bg-surface-muted py-10 pb-12 md:py-20 md:pb-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-16">
          {/* Copy + CTAs */}
          <div className="order-last md:order-first">
            <span className="mb-4 inline-flex items-center gap-2 rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:px-3.5 md:py-1.5 md:text-[13px]">
              <i className="fas fa-shield-alt text-[10px] md:text-[11px]" />
              {clinic.name}
              {clinic.city && <> · {clinic.city}</>}
            </span>
            <h1 className="mb-3 text-[32px] font-semibold leading-10 tracking-[-0.01em] text-heading md:mb-4 md:text-[44px] md:leading-[1.1]">
              {clinic.pitch ?? `Quality healthcare at ${clinic.name}.`}
            </h1>
            <p className="mb-6 max-w-[520px] text-[15px] leading-[24px] text-muted md:mb-8 md:text-[17px] md:leading-[28px]">
              Book in 30 seconds online or on WhatsApp. We&apos;ll confirm right back, send reminders, and keep your details safe.
            </p>

            <div className="mb-6 flex flex-col gap-2.5 md:flex-row md:gap-3">
              <Link
                href={bookHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-6 py-3.5 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843] md:w-auto"
              >
                <i className="fas fa-calendar-check text-[14px]" />
                Book appointment
              </Link>
              {clinic.whatsapp_number && (
                <a
                  href={`tel:${clinic.whatsapp_number}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-[22.5px] py-3 text-[15px] font-medium text-link-hover no-underline transition-colors hover:bg-link-hover hover:text-white md:w-auto md:py-[10.5px]"
                >
                  <i className="fas fa-phone-alt" />
                  Call clinic
                </a>
              )}
            </div>

            {/* Trust strip */}
            {trust.length > 0 && (
              <div className="grid grid-cols-2 items-start gap-4 border-t border-border pt-4 md:grid-cols-4 md:gap-6 md:pt-6">
                {trust.map((t, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="text-[15px] font-semibold text-heading md:text-[16px]">
                      {t.check && <i className="fas fa-check-circle mr-1 text-[#1f7a3a]" />}
                      {t.strong}
                    </div>
                    {t.sub && <div className="text-[12px] leading-[16px] text-muted md:text-[13px] md:leading-[18px]">{t.sub}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual: doctor photo if available, else a tasteful tinted card */}
          <ClinicHeroVisual founding={founding} />
        </div>
      </div>
    </section>
  );
}

function ClinicHeroVisual({ founding }: { founding: PublicDoctor | null }) {
  return (
    <div className="relative">
      <div className="relative h-72 overflow-hidden rounded-lg bg-[#E6F1FA] shadow-md md:h-[480px]">
        {founding?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={founding.photo_url}
            alt={founding.display_name}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[80px] text-brand">
            <i className="fas fa-user-md opacity-50" />
          </div>
        )}
      </div>
      {founding && (
        <div className="absolute -left-2 bottom-4 flex items-center gap-2.5 rounded-[12px] bg-white px-3.5 py-3 shadow-md md:-left-6 md:bottom-8 md:gap-3 md:px-[18px] md:py-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-pill bg-[#E6F1FA] text-[14px] text-brand md:h-10 md:w-10 md:text-[16px]">
            <i className="fas fa-user-md" />
          </div>
          <div>
            <div className="text-[11px] text-muted md:text-[12px]">Lead doctor</div>
            <div className="text-[13px] font-semibold text-heading md:text-[14px]">{founding.display_name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
